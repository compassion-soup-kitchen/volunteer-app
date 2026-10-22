import { getDb } from "@/lib/db";

/**
 * Expo push notifications.
 *
 * Devices register their `ExponentPushToken[...]` via `/api/v1/push-tokens`;
 * server actions call `sendPushToUsers` after a mutation (wrapped in
 * `after()` so delivery never blocks or fails the mutation). Expo's push
 * service needs no credentials — it accepts up to 100 messages per request
 * and reports dead tokens back in the tickets, which we prune.
 */

const EXPO_PUSH_ENDPOINT = "https://exp.host/--/api/v2/push/send";
const MAX_MESSAGES_PER_REQUEST = 100;

/**
 * Devices one account may have registered at once; registering another evicts
 * the least recently registered. Generous for a person with a phone and a
 * tablet, and small enough that no one account can flood every broadcast.
 */
export const MAX_PUSH_TOKENS_PER_USER = 5;

/**
 * Whether `token` has the shape of an Expo push token. Strict on purpose:
 * tokens are sent to Expo in batches, and one malformed or oversized entry
 * fails the whole batch it sits in - see `sendPushToUsers`.
 */
export function isExpoPushToken(token: string): boolean {
  return /^ExponentPushToken\[[A-Za-z0-9_-]{1,256}\]$/.test(token);
}

export type PushMessage = {
  title: string;
  body: string;
  /** Deep-link payload for the mobile app, e.g. `{ url: "/shift/abc" }`. */
  data?: Record<string, unknown>;
};

export type PushTicket = {
  status: "ok" | "error";
  message?: string;
  details?: { error?: string };
};

export function chunk<T>(items: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < items.length; i += size) {
    chunks.push(items.slice(i, i + size));
  }
  return chunks;
}

/**
 * Tokens whose ticket says the device is gone. Tickets come back in the
 * same order as the messages we sent, one per token.
 */
export function deadTokensFromTickets(
  tokens: string[],
  tickets: PushTicket[]
): string[] {
  return tokens.filter(
    (_, i) => tickets[i]?.details?.error === "DeviceNotRegistered"
  );
}

/**
 * Sends a push notification to every registered device of the given users.
 * Failures are logged, never thrown — a missed notification must not break
 * the mutation that triggered it.
 */
export async function sendPushToUsers(
  userIds: string[],
  message: PushMessage
): Promise<void> {
  if (userIds.length === 0) return;

  const db = getDb();
  let rows: { token: string }[];
  try {
    rows = await db.pushToken.findMany({
      where: { userId: { in: userIds } },
      select: { token: true },
    });
  } catch (e) {
    console.error("Failed to load push tokens:", e);
    return;
  }
  if (rows.length === 0) return;

  const deadTokens: string[] = [];

  for (const tokens of chunk(
    rows.map((r) => r.token),
    MAX_MESSAGES_PER_REQUEST
  )) {
    const batch = await postToExpo(tokens, message);
    if (batch.ok) {
      deadTokens.push(...deadTokensFromTickets(tokens, batch.tickets));
      continue;
    }
    if (!isRejection(batch.status)) continue;

    // Expo refuses a whole request over a single bad entry - a malformed
    // token, or one belonging to a different Expo project. Before this, one
    // such token silently cost everyone in its batch every notification, on
    // every send, for good: nothing was pruned because no ticket came back.
    // So a refused batch is retried one device at a time; everyone else still
    // gets their message, and a token Expo refuses on its own is dropped.
    if (tokens.length === 1) continue;
    const refused: string[] = [];
    let anyDelivered = false;
    for (const token of tokens) {
      const single = await postToExpo([token], message);
      if (single.ok) {
        anyDelivered = true;
        deadTokens.push(...deadTokensFromTickets([token], single.tickets));
      } else if (isRejection(single.status)) {
        refused.push(token);
      }
    }
    // If Expo refused every one of them, the fault is the message, not the
    // devices - pruning would unregister everybody.
    if (anyDelivered) deadTokens.push(...refused);
  }

  if (deadTokens.length > 0) {
    try {
      await db.pushToken.deleteMany({ where: { token: { in: deadTokens } } });
    } catch (e) {
      console.error("Failed to prune dead push tokens:", e);
    }
  }
}

type ExpoResult =
  | { ok: true; tickets: PushTicket[] }
  /** `status` is 0 when the request never got a response. */
  | { ok: false; status: number };

/** Posts one batch to Expo. Logs and reports failure; never throws. */
async function postToExpo(
  tokens: string[],
  message: PushMessage
): Promise<ExpoResult> {
  try {
    const res = await fetch(EXPO_PUSH_ENDPOINT, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify(
        tokens.map((to) => ({
          to,
          sound: "default",
          channelId: "default",
          title: message.title,
          body: message.body,
          ...(message.data ? { data: message.data } : {}),
        }))
      ),
    });

    if (!res.ok) {
      console.error(`Expo push request failed (${res.status})`);
      return { ok: false, status: res.status };
    }

    const { data: tickets } = (await res.json()) as { data?: PushTicket[] };
    return { ok: true, tickets: tickets ?? [] };
  } catch (e) {
    console.error("Expo push request error:", e);
    return { ok: false, status: 0 };
  }
}

/**
 * Expo turned the request down because of what was in it. Not an outage
 * (5xx), a rate limit (429) or a network error (0) - those say nothing about
 * the tokens, so nothing is retried singly or pruned for them.
 */
function isRejection(status: number): boolean {
  return status >= 400 && status < 500 && status !== 429;
}
