import { describe, expect, it } from "vitest";
import { findEasterEgg, toBinary } from "./easterEggs";

describe("findEasterEgg · peor caso", () => {
  it.each(["constructor", "toString", "__proto__", "hasOwnProperty", "valueOf", "__defineGetter__", "Constructor"])(
    "'%s' (propiedad heredada de Object) no es un easter egg",
    (c) => {
      expect(findEasterEgg(c)).toBeNull();
    }
  );

  it.each(["", "   ", "​", " "])("entrada %j -> null", (c) => {
    expect(findEasterEgg(c)).toBeNull();
  });

  it.each([
    "MELMAC",
    "  Melmac  ",
    "mElMaC",
    "País de las Maravillas",
    "PAIS DE LAS MARAVILLAS",
    "Atlántida",
    "ATLÁNTIDA",
    "Nunca Jamás",
    "nunca jamas",
    "Ciudad Esmeralda",
  ])("'%s' encuentra su easter egg", (c) => {
    expect(findEasterEgg(c)).not.toBeNull();
  });

  it("forma descompuesta (a + U+0301) equivale a la precompuesta", () => {
    expect(findEasterEgg("Atlántida")).not.toBeNull();
  });

  // Aceptado (AUDITORIA.md, B-4): solo se normalizan los extremos; nadie escribe así.
  it("espacios internos dobles ('far  far away') no matchean (aceptado)", () => {
    expect(findEasterEgg("far  far away")).toBeNull();
  });

  it("nbsp interno ('far\\u00a0far away') no matchea (aceptado)", () => {
    expect(findEasterEgg("far far away")).toBeNull();
  });

  it("con coma ('Melmac, galaxia') -> null (documenta que hay que escribir solo el nombre)", () => {
    expect(findEasterEgg("Melmac, galaxia")).toBeNull();
  });

  it("'Hoth' y 'hoth.' : con punto final no matchea (documenta)", () => {
    expect(findEasterEgg("hoth")).not.toBeNull();
    expect(findEasterEgg("hoth.")).toBeNull();
  });

  it("'İstanbul' / 'ß' / mayúscula turca no rompen toLowerCase", () => {
    expect(findEasterEgg("İSTANBUL")).toBeNull();
  });

  it("texto de 10.000 caracteres -> null y rápido", () => {
    expect(findEasterEgg("a".repeat(10_000))).toBeNull();
  });

  it("sólo los eggs binaryMode tienen binaryMode; zion y matrix sí", () => {
    expect(findEasterEgg("zion")?.binaryMode).toBe(true);
    expect(findEasterEgg("matrix")?.binaryMode).toBe(true);
    expect(findEasterEgg("hoth")?.binaryMode).toBeUndefined();
  });

  it("cada egg tiene textos es/en no vacíos", () => {
    for (const c of ["melmac", "tatooine", "zion", "atlantida", "springfield simpsons", "genovia"]) {
      const e = findEasterEgg(c)!;
      expect(e.labels.es.length).toBeGreaterThan(0);
      expect(e.labels.en.length).toBeGreaterThan(0);
      expect(e.reason.es.length).toBeGreaterThan(0);
      expect(e.reason.en.length).toBeGreaterThan(0);
    }
  });
});

describe("toBinary · peor caso", () => {
  it("'' -> ''", () => {
    expect(toBinary("")).toBe("");
  });

  it("'A' -> 01000001", () => {
    expect(toBinary("A")).toBe("01000001");
  });

  it("'ñ' (241) cabe en 8 bits", () => {
    expect(toBinary("ñ")).toBe("11110001");
  });

  // Aceptado (AUDITORIA.md, B-4): toBinary trabaja por unidad UTF-16; los
  // easter eggs binarios de hoy (zion, matrix) son solo ASCII.
  it("con caracteres > 255 los grupos tienen más de 8 bits (aceptado)", () => {
    expect(toBinary("€").split(" ")[0].length).toBeGreaterThan(8);
    expect(toBinary("😀").split(" ")).toHaveLength(2);
  });

  it("10.000 caracteres: 10.000 grupos", () => {
    expect(toBinary("a".repeat(10_000)).split(" ")).toHaveLength(10_000);
  });
});
