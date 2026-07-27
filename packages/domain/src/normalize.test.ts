import { describe, expect, it } from "vitest";
import { normalizeName } from "./normalize";

describe("normalizeName", () => {
  it("lowercases and trims", () => {
    expect(normalizeName("  Queen Omega  ")).toBe("queen omega");
  });

  it("strips diacritics", () => {
    expect(normalizeName("Björk")).toBe("bjork");
  });

  it("collapses punctuation and whitespace", () => {
    expect(normalizeName("The  Beatles!!!")).toBe("the beatles");
  });

  it("treats casing-only variants as equal", () => {
    expect(normalizeName("Taiwan MC")).toBe(normalizeName("taiwan mc"));
  });
});
