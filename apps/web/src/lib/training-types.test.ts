import { describe, expect, it } from "vitest";

import {
  isSeededTrainingType,
  parseTrainingTypeInput,
  TRAINING_TYPE_NAME_MAX,
  trainingTypeDeleteBlocker,
  trainingTypeKeyFromName,
  uniqueTrainingTypeKey,
} from "./training-types";

describe("trainingTypeKeyFromName", () => {
  it("upper-snakes an ordinary name", () => {
    expect(trainingTypeKeyFromName("Food Handling")).toBe("FOOD_HANDLING");
  });

  it("reproduces the seeded keys from their display names", () => {
    expect(trainingTypeKeyFromName("Induction")).toBe("INDUCTION");
    expect(trainingTypeKeyFromName("Health & Safety")).toBe("HEALTH_SAFETY");
    expect(trainingTypeKeyFromName("De-escalation")).toBe("DE_ESCALATION");
  });

  it("folds macrons so te reo names still yield an ASCII key", () => {
    expect(trainingTypeKeyFromName("Tikanga Māori")).toBe("TIKANGA_MAORI");
    expect(trainingTypeKeyFromName("Manaakitanga")).toBe("MANAAKITANGA");
  });

  it("collapses runs of punctuation and trims the edges", () => {
    expect(trainingTypeKeyFromName("  First aid / CPR!  ")).toBe(
      "FIRST_AID_CPR"
    );
  });

  it("falls back when a name yields no usable characters", () => {
    expect(trainingTypeKeyFromName("!!!")).toBe("TYPE");
  });
});

describe("uniqueTrainingTypeKey", () => {
  it("keeps the base when it is free", () => {
    expect(uniqueTrainingTypeKey("FIRST_AID", ["INDUCTION"])).toBe("FIRST_AID");
  });

  it("suffixes past a collision", () => {
    expect(uniqueTrainingTypeKey("INDUCTION", ["INDUCTION"])).toBe(
      "INDUCTION_2"
    );
  });

  it("keeps counting past consecutive collisions", () => {
    expect(
      uniqueTrainingTypeKey("INDUCTION", [
        "INDUCTION",
        "INDUCTION_2",
        "INDUCTION_3",
      ])
    ).toBe("INDUCTION_4");
  });
});

describe("parseTrainingTypeInput", () => {
  it("trims the name and description", () => {
    const result = parseTrainingTypeInput({
      name: "  First aid  ",
      description: "  Basic response  ",
    });
    expect(result).toEqual({
      ok: true,
      value: { name: "First aid", description: "Basic response" },
    });
  });

  it("treats a blank description as absent", () => {
    const result = parseTrainingTypeInput({ name: "First aid", description: "   " });
    expect(result.ok && result.value.description).toBeNull();
  });

  it("rejects an empty name", () => {
    expect(parseTrainingTypeInput({ name: "   " })).toMatchObject({
      ok: false,
    });
  });

  it("rejects an over-long name", () => {
    const result = parseTrainingTypeInput({
      name: "a".repeat(TRAINING_TYPE_NAME_MAX + 1),
    });
    expect(result.ok).toBe(false);
  });

  it("accepts a name exactly at the limit", () => {
    const result = parseTrainingTypeInput({
      name: "a".repeat(TRAINING_TYPE_NAME_MAX),
    });
    expect(result.ok).toBe(true);
  });
});

describe("isSeededTrainingType", () => {
  it("recognises the four original enum members", () => {
    for (const key of ["INDUCTION", "DE_ESCALATION", "HEALTH_SAFETY", "OTHER"]) {
      expect(isSeededTrainingType(key)).toBe(true);
    }
  });

  it("does not claim staff-created types", () => {
    expect(isSeededTrainingType("FIRST_AID")).toBe(false);
  });
});

describe("trainingTypeDeleteBlocker", () => {
  it("allows deleting an unused staff-created type", () => {
    expect(
      trainingTypeDeleteBlocker({ key: "FIRST_AID", sessionCount: 0 })
    ).toBeNull();
  });

  it("protects the built-in types even when unused", () => {
    expect(
      trainingTypeDeleteBlocker({ key: "INDUCTION", sessionCount: 0 })
    ).toMatch(/built-in/i);
  });

  it("blocks a type that sessions still reference", () => {
    expect(
      trainingTypeDeleteBlocker({ key: "FIRST_AID", sessionCount: 3 })
    ).toMatch(/3 training sessions use/);
  });

  it("reads naturally for a single session", () => {
    expect(
      trainingTypeDeleteBlocker({ key: "FIRST_AID", sessionCount: 1 })
    ).toMatch(/1 training session uses/);
  });
});
