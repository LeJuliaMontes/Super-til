import { describe, expect, it } from "vitest";
import { aAnki, aCSV, aMarkdown, acepcionPrincipal } from "./exportar";
import type { Palabra } from "../tipos";

const palabra: Palabra = {
  id: "1",
  termino: "banco",
  estado: "definida",
  creadaEn: "2026-11-15T10:00:00.000Z",
  actualizadaEn: "2026-11-15T10:00:00.000Z",
  contextos: [{ frase: 'Se sentó en el banco, "cansado".', fuente: "Novela", fecha: "2026-11-15T10:00:00.000Z" }],
  acepcionElegida: 2,
  definicion: {
    encontrada: true,
    lema: "banco",
    acepciones: [
      { numero: 1, categoria: "sustantivo masculino", texto: "Empresa financiera.", etiquetas: [], sinonimos: [] },
      { numero: 2, categoria: "sustantivo masculino", texto: "Asiento alargado.", etiquetas: [], sinonimos: ["banca"], ejemplo: "Un banco del parque." },
    ],
    sugerencias: [],
    url: "https://es.wiktionary.org/wiki/banco",
    consultadaEn: "2026-11-15T10:00:00.000Z",
  },
};

const pendiente: Palabra = { ...palabra, id: "2", termino: "zozobra", estado: "pendiente", definicion: undefined, acepcionElegida: undefined, contextos: [] };

describe("exportar", () => {
  it("usa la acepción elegida como principal", () => {
    expect(acepcionPrincipal(palabra)?.numero).toBe(2);
    expect(acepcionPrincipal({ ...palabra, acepcionElegida: undefined })?.numero).toBe(1);
  });

  it("Markdown incluye acepciones, marca la elegida y la frase", () => {
    const md = aMarkdown([palabra, pendiente]);
    expect(md).toContain("## banco");
    expect(md).toContain("2. _(sustantivo masculino)_ Asiento alargado. ★");
    expect(md).toContain('> Se sentó en el banco, "cansado". — Novela');
    expect(md).toContain("_Sin definición (pendiente)._");
  });

  it("CSV escapa comillas y comas y lleva BOM", () => {
    const csv = aCSV([palabra]);
    expect(csv.startsWith("﻿palabra,estado")).toBe(true);
    expect(csv).toContain('"Se sentó en el banco, ""cansado""."');
    expect(csv).toContain("banco,por aprender,sustantivo masculino,Asiento alargado.,Un banco del parque.,banca");
  });

  it("Anki solo exporta las que tienen significado", () => {
    const anki = aAnki([palabra, pendiente]).split("\n").filter((l) => l && !l.startsWith("#"));
    expect(anki).toHaveLength(1);
    expect(anki[0].split("\t")[0]).toBe("<b>banco</b><br><i>Se sentó en el banco, \"cansado\".</i>");
  });
});
