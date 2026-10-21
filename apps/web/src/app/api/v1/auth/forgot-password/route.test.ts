import { beforeEach, describe, expect, it, vi } from "vitest";
import type { NextRequest } from "next/server";

const sendPasswordResetLinkMock = vi.fn();

vi.mock("@/lib/data/password-reset", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/data/password-reset")>();
  return {
    ...actual,
    sendPasswordResetLink: (...args: unknown[]) => sendPasswordResetLinkMock(...args),
  };
});

import { RESET_NEUTRAL_MESSAGE } from "@/lib/data/password-reset";
import { POST } from "./route";

function request(body: unknown): NextRequest {
  return new Request("http://test.local/api/v1/auth/forgot-password", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: typeof body === "string" ? body : JSON.stringify(body),
  }) as unknown as NextRequest;
}

beforeEach(() => {
  sendPasswordResetLinkMock.mockReset();
  sendPasswordResetLinkMock.mockResolvedValue(undefined);
});

describe("POST /api/v1/auth/forgot-password", () => {
  it("rejects an invalid address without sending anything", async () => {
    const res = await POST(request({ email: "nope" }));

    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ error: "Please enter a valid email address" });
    expect(sendPasswordResetLinkMock).not.toHaveBeenCalled();
  });

  it("rejects a body that isn't JSON", async () => {
    const res = await POST(request("not json"));

    expect(res.status).toBe(400);
    expect(sendPasswordResetLinkMock).not.toHaveBeenCalled();
  });

  it("sends the link and answers with the neutral message", async () => {
    const res = await POST(request({ email: "aroha@b.co" }));

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ message: RESET_NEUTRAL_MESSAGE });
    expect(sendPasswordResetLinkMock).toHaveBeenCalledWith("aroha@b.co");
  });
});
