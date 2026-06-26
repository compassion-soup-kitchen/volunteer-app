import { describe, expect, it } from "vitest";
import { cn } from "./utils";

describe("cn", () => {
  it("joins class names", () => {
    expect(cn("px-2", "py-1")).toBe("px-2 py-1");
  });

  it("filters out falsy values", () => {
    expect(cn("px-2", false && "hidden", null, undefined, "py-1")).toBe(
      "px-2 py-1",
    );
  });

  it("dedupes conflicting tailwind utilities, keeping the last", () => {
    expect(cn("px-2", "px-4")).toBe("px-4");
    expect(cn("text-sm text-base")).toBe("text-base");
  });

  it("merges conditional class objects", () => {
    expect(cn("base", { active: true, hidden: false })).toBe("base active");
  });

  it("flattens nested arrays", () => {
    expect(cn(["px-2", ["py-1", "rounded"]])).toBe("px-2 py-1 rounded");
  });
});
