import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  chunk,
  deadTokensFromTickets,
  isExpoPushToken,
  sendPushToUsers,
  type PushTicket,
} from "@/lib/push";

const findMany = vi.fn();
const deleteMany = vi.fn();

vi.mock("@/lib/db", () => ({
  getDb: () => ({
    pushToken: {
      findMany: (...args: unknown[]) => findMany(...args),
      deleteMany: (...args: unknown[]) => deleteMany(...args),
    },
  }),
}));

describe("isExpoPushToken", () => {
  it("accepts a real-shaped token", () => {
    expect(isExpoPushToken("ExponentPushToken[xxxxxxxxxxxxxxxxxxxxxx]")).toBe(true);
    expect(isExpoPushToken("ExponentPushToken[aB3_d-9]")).toBe(true);
  });

  // Anything else is sent to Expo alongside everyone's tokens, where one bad
  // entry fails the whole batch.
  it.each([
    ["an empty body", "ExponentPushToken[]"],
    ["stray characters", "ExponentPushToken[abc def]"],
    ["a nested bracket", "ExponentPushToken[abc]]"],
    ["an oversized body", `ExponentPushToken[${"a".repeat(257)}]`],
    ["the wrong prefix", "ExpoToken[abc]"],
    ["trailing text", "ExponentPushToken[abc]x"],
  ])("rejects %s", (_, token) => {
    expect(isExpoPushToken(token)).toBe(false);
  });
});

describe("chunk", () => {
  it("splits items into batches of the given size", () => {
    expect(chunk([1, 2, 3, 4, 5], 2)).toEqual([[1, 2], [3, 4], [5]]);
  });

  it("returns a single batch when under the limit", () => {
    expect(chunk([1, 2], 100)).toEqual([[1, 2]]);
  });

  it("returns no batches for no items", () => {
    expect(chunk([], 100)).toEqual([]);
  });
});

describe("deadTokensFromTickets", () => {
  const ok: PushTicket = { status: "ok" };
  const dead: PushTicket = {
    status: "error",
    details: { error: "DeviceNotRegistered" },
  };
  const otherError: PushTicket = {
    status: "error",
    details: { error: "MessageTooBig" },
  };

  it("keeps only tokens whose device is gone", () => {
    expect(deadTokensFromTickets(["a", "b", "c"], [ok, dead, otherError]))
      .toEqual(["b"]);
  });

  it("handles fewer tickets than tokens", () => {
    expect(deadTokensFromTickets(["a", "b"], [dead])).toEqual(["a"]);
  });
});

describe("sendPushToUsers", () => {
  beforeEach(() => {
    findMany.mockReset();
    deleteMany.mockReset();
    vi.unstubAllGlobals();
  });

  it("does nothing when no users are given", async () => {
    await sendPushToUsers([], { title: "Hi", body: "there" });
    expect(findMany).not.toHaveBeenCalled();
  });

  it("does not call Expo when no tokens are registered", async () => {
    findMany.mockResolvedValue([]);
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    await sendPushToUsers(["u1"], { title: "Hi", body: "there" });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("sends one message per token and prunes dead tokens", async () => {
    findMany.mockResolvedValue([{ token: "tok-live" }, { token: "tok-dead" }]);
    deleteMany.mockResolvedValue({ count: 1 });
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        data: [
          { status: "ok" },
          { status: "error", details: { error: "DeviceNotRegistered" } },
        ],
      }),
    });
    vi.stubGlobal("fetch", fetchMock);

    await sendPushToUsers(["u1"], {
      title: "Shift update",
      body: "Times changed",
      data: { url: "/shift/abc" },
    });

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const body = JSON.parse(fetchMock.mock.calls[0][1].body as string);
    expect(body).toHaveLength(2);
    expect(body[0]).toMatchObject({
      to: "tok-live",
      title: "Shift update",
      body: "Times changed",
      data: { url: "/shift/abc" },
    });
    expect(deleteMany).toHaveBeenCalledWith({
      where: { token: { in: ["tok-dead"] } },
    });
  });

  // One bad token - malformed, or from another Expo project - makes Expo
  // refuse the whole request. Before, that cost everyone in the batch every
  // notification for good.
  describe("when Expo refuses a batch", () => {
    const refused = { ok: false, status: 400, json: async () => ({}) };
    const delivered = {
      ok: true,
      json: async () => ({ data: [{ status: "ok" }] }),
    };
    const sentTo = (call: unknown[]) =>
      JSON.parse((call[1] as { body: string }).body).map(
        (m: { to: string }) => m.to
      );

    it("retries each device alone and prunes only the one refused", async () => {
      findMany.mockResolvedValue([
        { token: "tok-a" },
        { token: "tok-bad" },
        { token: "tok-b" },
      ]);
      deleteMany.mockResolvedValue({ count: 1 });
      const fetchMock = vi.fn(async (_url: string, init: { body: string }) => {
        const to = JSON.parse(init.body).map((m: { to: string }) => m.to);
        return to.includes("tok-bad") ? refused : delivered;
      });
      vi.stubGlobal("fetch", fetchMock);

      await sendPushToUsers(["u1", "u2", "u3"], { title: "Hi", body: "there" });

      expect(fetchMock.mock.calls.map(sentTo)).toEqual([
        ["tok-a", "tok-bad", "tok-b"],
        ["tok-a"],
        ["tok-bad"],
        ["tok-b"],
      ]);
      expect(deleteMany).toHaveBeenCalledWith({
        where: { token: { in: ["tok-bad"] } },
      });
    });

    // Every device refused alone means the message is the problem.
    it("prunes nothing when every device is refused", async () => {
      findMany.mockResolvedValue([{ token: "tok-a" }, { token: "tok-b" }]);
      vi.stubGlobal("fetch", vi.fn().mockResolvedValue(refused));

      await sendPushToUsers(["u1"], { title: "Hi", body: "there" });

      expect(deleteMany).not.toHaveBeenCalled();
    });

    // An outage says nothing about the tokens.
    it.each([429, 500, 503])(
      "neither retries nor prunes on a %s",
      async (status) => {
        findMany.mockResolvedValue([{ token: "tok-a" }, { token: "tok-b" }]);
        const fetchMock = vi.fn().mockResolvedValue({ ok: false, status });
        vi.stubGlobal("fetch", fetchMock);

        await sendPushToUsers(["u1"], { title: "Hi", body: "there" });

        expect(fetchMock).toHaveBeenCalledTimes(1);
        expect(deleteMany).not.toHaveBeenCalled();
      }
    );
  });

  it("swallows database errors without throwing", async () => {
    findMany.mockRejectedValue(new Error("db down"));
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    await expect(
      sendPushToUsers(["u1"], { title: "Hi", body: "there" })
    ).resolves.toBeUndefined();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("swallows network errors without throwing", async () => {
    findMany.mockResolvedValue([{ token: "tok" }]);
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("offline")));

    await expect(
      sendPushToUsers(["u1"], { title: "Hi", body: "there" })
    ).resolves.toBeUndefined();
    expect(deleteMany).not.toHaveBeenCalled();
  });
});
