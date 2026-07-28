import { describe, expect, it } from "vitest";
import {
  GROUP_DESCRIPTION_MAX,
  GROUP_NAME_MAX,
  GROUP_TONES,
  describeMembershipChange,
  diffMembership,
  findNameClash,
  groupToneVariant,
  isGroupTone,
  memberCountLabel,
  sortGroups,
  validateGroupInput,
} from "./volunteer-groups";

const base = {
  name: "Team Leaders",
  description: "Runs the shift on the day",
  tone: "BRAND",
  visibleToVolunteers: true,
};

describe("isGroupTone", () => {
  it("accepts every tone offered in the picker", () => {
    for (const tone of GROUP_TONES) {
      expect(isGroupTone(tone.value)).toBe(true);
    }
  });

  it("rejects anything else", () => {
    expect(isGroupTone("DESTRUCTIVE")).toBe(false);
    expect(isGroupTone("")).toBe(false);
  });
});

describe("groupToneVariant", () => {
  it("keeps brand groups tinted rather than solid", () => {
    expect(groupToneVariant("BRAND")).toBe("default");
  });

  it("maps each tone to its own badge variant", () => {
    const variants = GROUP_TONES.map((tone) => groupToneVariant(tone.value));
    expect(new Set(variants).size).toBe(GROUP_TONES.length);
  });
});

describe("validateGroupInput", () => {
  it("tidies the name and description", () => {
    const result = validateGroupInput({
      ...base,
      name: "  Guardian   Angels  ",
      description: "  Step in at short notice  ",
    });
    expect(result).toEqual({
      data: {
        name: "Guardian Angels",
        description: "Step in at short notice",
        tone: "BRAND",
        visibleToVolunteers: true,
      },
    });
  });

  it("treats an empty description as none", () => {
    const result = validateGroupInput({ ...base, description: "   " });
    expect(result).toEqual({
      data: expect.objectContaining({ description: null }),
    });
  });

  it("requires a name", () => {
    expect(validateGroupInput({ ...base, name: "   " })).toEqual({
      error: "Give the group a name.",
    });
  });

  it("caps the name length", () => {
    const result = validateGroupInput({
      ...base,
      name: "a".repeat(GROUP_NAME_MAX + 1),
    });
    expect(result).toHaveProperty("error");
  });

  it("caps the description length", () => {
    const result = validateGroupInput({
      ...base,
      description: "a".repeat(GROUP_DESCRIPTION_MAX + 1),
    });
    expect(result).toHaveProperty("error");
  });

  it("rejects a tone that isn't on offer", () => {
    expect(validateGroupInput({ ...base, tone: "PUCE" })).toEqual({
      error: "Choose a colour for the group.",
    });
  });
});

describe("findNameClash", () => {
  const groups = [
    { id: "a", name: "Team Leaders" },
    { id: "b", name: "Guardian Angels" },
  ];

  it("matches regardless of case and surrounding space", () => {
    expect(findNameClash(groups, "  team leaders ")?.id).toBe("a");
  });

  it("ignores the group being edited", () => {
    expect(findNameClash(groups, "Team Leaders", "a")).toBeUndefined();
  });

  it("returns undefined when the name is free", () => {
    expect(findNameClash(groups, "Kitchen Regulars")).toBeUndefined();
  });
});

describe("sortGroups", () => {
  it("orders by name without mutating the input", () => {
    const groups = [{ name: "Kitchen" }, { name: "angels" }, { name: "Beta" }];
    const sorted = sortGroups(groups);
    expect(sorted.map((g) => g.name)).toEqual(["angels", "Beta", "Kitchen"]);
    expect(groups[0].name).toBe("Kitchen");
  });
});

describe("memberCountLabel", () => {
  it("reads naturally at each boundary", () => {
    expect(memberCountLabel(0)).toBe("No one yet");
    expect(memberCountLabel(1)).toBe("1 person");
    expect(memberCountLabel(4)).toBe("4 people");
  });
});

describe("diffMembership", () => {
  it("reports both directions of a change", () => {
    expect(diffMembership(["a", "b"], ["b", "c"])).toEqual({
      added: ["c"],
      removed: ["a"],
    });
  });

  it("reports nothing when the set is unchanged", () => {
    expect(diffMembership(["a", "b"], ["b", "a"])).toEqual({
      added: [],
      removed: [],
    });
  });
});

describe("describeMembershipChange", () => {
  it("says plainly when nothing moved", () => {
    expect(describeMembershipChange(0, 0, "Team Leaders")).toBe(
      "No change to Team Leaders."
    );
  });

  it("names each direction that happened", () => {
    expect(describeMembershipChange(2, 0, "Team Leaders")).toBe(
      "Team Leaders: 2 added."
    );
    expect(describeMembershipChange(0, 1, "Team Leaders")).toBe(
      "Team Leaders: 1 removed."
    );
    expect(describeMembershipChange(2, 1, "Team Leaders")).toBe(
      "Team Leaders: 2 added, 1 removed."
    );
  });
});
