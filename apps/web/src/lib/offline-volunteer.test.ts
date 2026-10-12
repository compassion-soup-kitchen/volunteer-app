import { describe, expect, it } from "vitest";

import {
  dateOfBirthError,
  offlineVolunteerDetails,
  offlineVolunteerInput,
  roleForStartStatus,
  type OfflineVolunteerFormData,
} from "./offline-volunteer";

const form = (overrides: Partial<OfflineVolunteerFormData> = {}): OfflineVolunteerFormData => ({
  name: "David Smith",
  email: "",
  phone: "04 385 0000",
  address: "",
  dateOfBirth: "",
  emergencyContactName: "",
  emergencyContactPhone: "",
  emergencyContactRelationship: "",
  bio: "",
  serviceAreaIds: [],
  status: "ACTIVE",
  mojStatus: "CLEARED",
  ...overrides,
});

describe("offlineVolunteerInput", () => {
  it("needs only a name - no email, the whole point", () => {
    const parsed = offlineVolunteerInput.parse(form({ phone: "" }));
    expect(parsed.name).toBe("David Smith");
    expect(parsed.email).toBeNull();
    expect(parsed.phone).toBeNull();
  });

  it("turns blank optional fields into nulls", () => {
    const parsed = offlineVolunteerInput.parse(form());
    expect(parsed.address).toBeNull();
    expect(parsed.dateOfBirth).toBeNull();
    expect(parsed.bio).toBeNull();
  });

  it("normalises an email address", () => {
    expect(offlineVolunteerInput.parse(form({ email: "  David@Example.NZ " })).email).toBe(
      "david@example.nz"
    );
  });

  it("rejects a malformed email", () => {
    const result = offlineVolunteerInput.safeParse(form({ email: "david at home" }));
    expect(result.success).toBe(false);
    expect(result.error?.issues[0]?.message).toMatch(/doesn't look right/);
  });

  it("requires a name", () => {
    expect(offlineVolunteerInput.safeParse(form({ name: " " })).success).toBe(false);
  });

  it("rejects an impossible date of birth", () => {
    expect(offlineVolunteerInput.safeParse(form({ dateOfBirth: "1950-02-30" })).success).toBe(
      false
    );
  });

  it("only allows the statuses an offline volunteer can start in", () => {
    expect(
      offlineVolunteerInput.safeParse(form({ status: "INACTIVE" as never })).success
    ).toBe(false);
  });
});

describe("offlineVolunteerDetails", () => {
  it("is the same contract without the status fields", () => {
    const parsed = offlineVolunteerDetails.parse(form());
    expect(parsed.name).toBe("David Smith");
    expect(parsed).not.toHaveProperty("status");
    expect(parsed).not.toHaveProperty("mojStatus");
  });
});

describe("dateOfBirthError", () => {
  it("allows a date in the past and no date at all", () => {
    expect(dateOfBirthError("1948-05-01", "2026-10-13")).toBeNull();
    expect(dateOfBirthError(null, "2026-10-13")).toBeNull();
  });

  it("refuses today or later", () => {
    expect(dateOfBirthError("2026-10-13", "2026-10-13")).toMatch(/in the past/);
  });
});

describe("roleForStartStatus", () => {
  it("makes someone approved a volunteer, as reviewing an application does", () => {
    expect(roleForStartStatus("ACTIVE")).toBe("VOLUNTEER");
    expect(roleForStartStatus("APPROVED_FOR_INDUCTION")).toBe("VOLUNTEER");
    expect(roleForStartStatus("AWAITING_VETTING")).toBe("PUBLIC");
  });
});
