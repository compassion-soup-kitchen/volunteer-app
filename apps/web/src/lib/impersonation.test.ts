import { describe, expect, it, vi } from "vitest";

import {
  applyImpersonationUpdate,
  type ImpersonatableToken,
  type ImpersonationDeps,
  type ImpersonationUserRow,
} from "./impersonation";

const ADMIN_ID = "admin_1";
const TARGET_ID = "vol_1";

const adminToken = (): ImpersonatableToken => ({
  id: ADMIN_ID,
  name: "Ari Admin",
  email: "ari@soupkitchen.org.nz",
  role: "ADMIN" as const,
});

const volunteerRow: ImpersonationUserRow = {
  id: TARGET_ID,
  name: "Vic Volunteer",
  email: "vic@soupkitchen.org.nz",
  role: "VOLUNTEER",
  status: "ACTIVE",
};

/** Deps whose readUser returns `row` for any id, with spy-able recorders. */
function deps(
  row: ImpersonationUserRow | null,
  overrides: Partial<ImpersonationDeps> = {}
): ImpersonationDeps {
  return {
    readUser: vi.fn(async () => row),
    recordStart: vi.fn(async () => "event_1"),
    recordStop: vi.fn(async () => {}),
    ...overrides,
  };
}

describe("applyImpersonationUpdate - start", () => {
  it("swaps identity to the target and stashes the admin", async () => {
    const token = adminToken();
    const d = deps(volunteerRow);

    const { handled, token: out } = await applyImpersonationUpdate(
      token,
      { impersonate: TARGET_ID },
      d
    );

    expect(handled).toBe(true);
    expect(out).toMatchObject({
      id: TARGET_ID,
      name: "Vic Volunteer",
      email: "vic@soupkitchen.org.nz",
      role: "VOLUNTEER",
    });
    expect(out.impersonator).toEqual({
      id: ADMIN_ID,
      role: "ADMIN",
      name: "Ari Admin",
      email: "ari@soupkitchen.org.nz",
      eventId: "event_1",
    });
    expect(d.recordStart).toHaveBeenCalledWith(ADMIN_ID, TARGET_ID);
  });

  // The security property: `update()` is client-callable and the payload is
  // attacker-controlled, so only a genuinely-ADMIN signed token may start.
  it("refuses a non-admin token and never records or mutates it", async () => {
    const token = { id: "vol_2", name: "V", email: "v@x.org", role: "VOLUNTEER" as const };
    const d = deps(volunteerRow);

    const { handled, token: out } = await applyImpersonationUpdate(
      token,
      { impersonate: TARGET_ID },
      d
    );

    expect(handled).toBe(true); // swallowed, not passed through
    expect(out).toEqual({ id: "vol_2", name: "V", email: "v@x.org", role: "VOLUNTEER" });
    expect(d.recordStart).not.toHaveBeenCalled();
    expect(d.readUser).not.toHaveBeenCalled();
  });

  it("refuses to impersonate another admin", async () => {
    const token = adminToken();
    const d = deps({ ...volunteerRow, role: "ADMIN" });

    const { token: out } = await applyImpersonationUpdate(
      token,
      { impersonate: TARGET_ID },
      d
    );

    expect(out.impersonator).toBeUndefined();
    expect(out.id).toBe(ADMIN_ID);
    expect(d.recordStart).not.toHaveBeenCalled();
  });

  it("refuses an archived target", async () => {
    const token = adminToken();
    const d = deps({ ...volunteerRow, status: "ARCHIVED" });

    const { token: out } = await applyImpersonationUpdate(
      token,
      { impersonate: TARGET_ID },
      d
    );

    expect(out.impersonator).toBeUndefined();
    expect(d.recordStart).not.toHaveBeenCalled();
  });

  it("refuses a missing target", async () => {
    const token = adminToken();
    const d = deps(null);

    const { token: out } = await applyImpersonationUpdate(
      token,
      { impersonate: TARGET_ID },
      d
    );

    expect(out.impersonator).toBeUndefined();
    expect(d.recordStart).not.toHaveBeenCalled();
  });

  it("refuses self-impersonation without hitting the database", async () => {
    const token = adminToken();
    const d = deps(volunteerRow);

    await applyImpersonationUpdate(token, { impersonate: ADMIN_ID }, d);

    expect(d.readUser).not.toHaveBeenCalled();
    expect(token.id).toBe(ADMIN_ID);
  });

  it("refuses to nest a second impersonation", async () => {
    const token = {
      ...adminToken(),
      id: TARGET_ID,
      role: "VOLUNTEER" as const,
      impersonator: {
        id: ADMIN_ID,
        role: "ADMIN" as const,
        name: "Ari Admin",
        email: "ari@soupkitchen.org.nz",
        eventId: "event_1",
      },
    };
    const d = deps({ ...volunteerRow, id: "vol_9" });

    await applyImpersonationUpdate(token, { impersonate: "vol_9" }, d);

    expect(d.recordStart).not.toHaveBeenCalled();
    expect(token.impersonator?.eventId).toBe("event_1");
  });
});

describe("applyImpersonationUpdate - stop", () => {
  const impersonatingToken = () => ({
    id: TARGET_ID,
    name: "Vic Volunteer",
    email: "vic@soupkitchen.org.nz",
    role: "VOLUNTEER" as const,
    impersonator: {
      id: ADMIN_ID,
      role: "ADMIN" as const,
      name: "Ari Admin",
      email: "ari@soupkitchen.org.nz",
      eventId: "event_1",
    },
  });

  it("closes the audit row and restores the admin from the database", async () => {
    const token = impersonatingToken();
    const d = deps({
      id: ADMIN_ID,
      name: "Ari Admin",
      email: "ari@soupkitchen.org.nz",
      role: "ADMIN",
      status: "ACTIVE",
    });

    const { handled, token: out } = await applyImpersonationUpdate(
      token,
      { stopImpersonating: true },
      d
    );

    expect(handled).toBe(true);
    expect(d.recordStop).toHaveBeenCalledWith("event_1");
    expect(out.impersonator).toBeUndefined();
    expect(out).toMatchObject({
      id: ADMIN_ID,
      role: "ADMIN",
      name: "Ari Admin",
      email: "ari@soupkitchen.org.nz",
    });
  });

  it("reflects a role dropped during impersonation on return", async () => {
    const token = impersonatingToken();
    const d = deps({
      id: ADMIN_ID,
      name: "Ari Admin",
      email: "ari@soupkitchen.org.nz",
      role: "COORDINATOR",
      status: "ACTIVE",
    });

    const { token: out } = await applyImpersonationUpdate(
      token,
      { stopImpersonating: true },
      d
    );

    expect(out.role).toBe("COORDINATOR");
  });

  it("clears identity when the admin was archived meanwhile", async () => {
    const token = impersonatingToken();
    const d = deps({
      id: ADMIN_ID,
      name: "Ari Admin",
      email: "ari@soupkitchen.org.nz",
      role: "ADMIN",
      status: "ARCHIVED",
    });

    const { token: out } = await applyImpersonationUpdate(
      token,
      { stopImpersonating: true },
      d
    );

    expect(d.recordStop).toHaveBeenCalledWith("event_1");
    expect(out.impersonator).toBeUndefined();
    expect(out.id).toBeUndefined();
    expect(out.role).toBeUndefined();
  });

  it("is a no-op when the token isn't impersonating", async () => {
    const token = adminToken();
    const d = deps(volunteerRow);

    const { handled, token: out } = await applyImpersonationUpdate(
      token,
      { stopImpersonating: true },
      d
    );

    expect(handled).toBe(true);
    expect(d.recordStop).not.toHaveBeenCalled();
    expect(out).toEqual(adminToken());
  });
});

describe("applyImpersonationUpdate - passthrough", () => {
  it("reports handled:false for an unrelated update payload", async () => {
    const token = adminToken();
    const d = deps(volunteerRow);

    const { handled } = await applyImpersonationUpdate(
      token,
      { name: "New Name" } as never,
      d
    );

    expect(handled).toBe(false);
    expect(d.readUser).not.toHaveBeenCalled();
    expect(d.recordStart).not.toHaveBeenCalled();
    expect(d.recordStop).not.toHaveBeenCalled();
  });

  it("reports handled:false for a null payload", async () => {
    const { handled } = await applyImpersonationUpdate(
      adminToken(),
      null,
      deps(volunteerRow)
    );

    expect(handled).toBe(false);
  });

  it("ignores a non-string impersonate id", async () => {
    const d = deps(volunteerRow);

    const { handled } = await applyImpersonationUpdate(
      adminToken(),
      { impersonate: 42 } as never,
      d
    );

    expect(handled).toBe(false);
    expect(d.recordStart).not.toHaveBeenCalled();
  });
});
