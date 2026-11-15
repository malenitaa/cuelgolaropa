import { describe, expect, it } from "vitest";
import { findEasterEgg, toBinary } from "@/lib/easterEggs";

describe("findEasterEgg", () => {
  it("CA-18: dado 'Melmac' con mayúsculas o espacios, cuando se busca, entonces devuelve su respuesta propia", () => {
    expect(findEasterEgg("  MELMAC ")?.decision).toBe("NO");
    expect(findEasterEgg("melmac")?.labels.es).toContain("MELMAC");
  });

  it("dada una ciudad real, cuando se busca, entonces no hay easter egg", () => {
    expect(findEasterEgg("Rosario")).toBeNull();
  });
});

describe("toBinary", () => {
  it("dado 'Hi', cuando se convierte, entonces son dos bytes de 8 bits", () => {
    expect(toBinary("Hi")).toBe("01001000 01101001");
  });
});
