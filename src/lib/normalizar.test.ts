import { describe, expect, it } from "vitest";
import { interpretarCompartido, normalizarTermino, resaltar } from "./normalizar";

describe("normalizarTermino", () => {
  it("quita signos y espacios y pasa a minúsculas", () => {
    expect(normalizarTermino("  ¿Procaz?  ")).toBe("procaz");
    expect(normalizarTermino("«Zozobra»,")).toBe("zozobra");
    expect(normalizarTermino("A   pesar  de")).toBe("a pesar de");
    expect(normalizarTermino("...")).toBe("");
  });

  it("conserva tildes y eñes", () => {
    expect(normalizarTermino("OJALÁ")).toBe("ojalá");
    expect(normalizarTermino("Ñoño")).toBe("ñoño");
  });

  it("unifica la forma Unicode (tildes compuestas)", () => {
    expect(normalizarTermino("comía")).toBe("comía");
  });
});

describe("interpretarCompartido", () => {
  it("una palabra suelta va al campo de palabra", () => {
    expect(interpretarCompartido("Inefable")).toEqual({ termino: "inefable", frase: "" });
  });
  it("un texto largo va a la frase", () => {
    const r = interpretarCompartido("Sentía una zozobra que no le dejaba dormir por las noches.");
    expect(r.termino).toBe("");
    expect(r.frase).toContain("zozobra");
  });
});

describe("resaltar", () => {
  it("marca el término sin tener en cuenta mayúsculas ni tildes", () => {
    const trozos = resaltar("Ojala llueva. ¡OJALÁ!", "ojalá");
    expect(trozos.filter((t) => t.marcado).map((t) => t.texto)).toEqual(["Ojala", "OJALÁ"]);
    expect(trozos.map((t) => t.texto).join("")).toBe("Ojala llueva. ¡OJALÁ!");
  });
});
