import { describe, expect, it, vi } from "vitest";

import { applySessionRefresh, type SessionUserFields } from "./session-refresh";

const USER_ID = "user_1";

function reader(row: SessionUserFields | null) {
  return vi.fn(async () => row);
}

const currentRow: SessionUserFields = {
  name: "Mereana Whitiora",
  email: "mereana@soupkitchen.org.nz",
  role: "COORDINATOR",
};

describe("applySessionRefresh", () => {
  it("takes name, email and role from the database row", async () => {
    const token = { id: USER_ID, name: "Old Name", email: "old@example.org" };

    const result = await applySessionRefresh(token, reader(currentRow));

    expect(result).toMatchObject(currentRow);
  });

  it("reads the account named by the token", async () => {
    const read = reader(currentRow);

    await applySessionRefresh({ id: USER_ID }, read);

    expect(read).toHaveBeenCalledWith(USER_ID);
  });

  // The security property: `update()` is client-callable and its payload is
  // attacker-controlled, so nothing the caller sends may survive the refresh.
  it("discards a client-supplied role instead of honouring it", async () => {
    const forged = {
      id: USER_ID,
      name: "Totally Legit",
      email: "attacker@example.org",
      role: "ADMIN",
    };

    const result = await applySessionRefresh(forged, reader(currentRow));

    expect(result.role).toBe("COORDINATOR");
    expect(result.name).toBe("Mereana Whitiora");
    expect(result.email).toBe("mereana@soupkitchen.org.nz");
  });

  it("still downgrades when the database says the role dropped", async () => {
    const token = { id: USER_ID, role: "ADMIN" };

    const result = await applySessionRefresh(
      token,
      reader({ ...currentRow, role: "VOLUNTEER" })
    );

    expect(result.role).toBe("VOLUNTEER");
  });

  it("keeps a null name rather than leaving the previous one", async () => {
    const token = { id: USER_ID, name: "Stale Name" };

    const result = await applySessionRefresh(
      token,
      reader({ ...currentRow, name: null })
    );

    expect(result.name).toBeNull();
  });

  it("leaves the token untouched when the account is gone", async () => {
    const token = { id: USER_ID, name: "Mereana", role: "COORDINATOR" };

    const result = await applySessionRefresh(token, reader(null));

    expect(result).toEqual({
      id: USER_ID,
      name: "Mereana",
      role: "COORDINATOR",
    });
  });

  it("does not hit the database for a token with no id", async () => {
    const read = reader(currentRow);

    const result = await applySessionRefresh({ name: "Anonymous" }, read);

    expect(read).not.toHaveBeenCalled();
    expect(result).toEqual({ name: "Anonymous" });
  });

  it("ignores a non-string id rather than coercing it", async () => {
    const read = reader(currentRow);

    await applySessionRefresh({ id: 42 }, read);
    await applySessionRefresh({ id: "" }, read);

    expect(read).not.toHaveBeenCalled();
  });
});
