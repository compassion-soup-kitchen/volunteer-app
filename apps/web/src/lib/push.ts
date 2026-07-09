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
        continue;
      }

      const { data: tickets } = (await res.json()) as { data?: PushTicket[] };
      deadTokens.push(...deadTokensFromTickets(tokens, tickets ?? []));
    } catch (e) {
      console.error("Expo push request error:", e);
    }
  }

  if (deadTokens.length > 0) {
    try {
      await db.pushToken.deleteMany({ where: { token: { in: deadTokens } } });
    } catch (e) {
      console.error("Failed to prune dead push tokens:", e);
    }
  }
}
