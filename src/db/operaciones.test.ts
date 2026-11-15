import "fake-indexeddb/auto";
import { beforeEach, describe, expect, it } from "vitest";
import { BaseDeDatos } from "./db";
import {
  apuntarPalabra,
  borrarPalabra,
  corregirPalabra,
  crearCopia,
  editarPalabra,
  guardarLote,
  importarCopia,
  leerAjustes,
  guardarAjuste,
  marcarAprendida,
  restaurarPalabra,
} from "./operaciones";
import type { Definicion } from "../tipos";

let db: BaseDeDatos;
let n = 0;
beforeEach(async () => {
  db = new BaseDeDatos(`prueba-${n++}`);
  await db.open();
});

const definicion = (lema: string, encontrada = true): Definicion => ({
  encontrada,
  lema,
  acepciones: encontrada ? [{ numero: 1, categoria: "adjetivo", texto: `Significado de ${lema}.`, etiquetas: [], sinonimos: [] }] : [],
  sugerencias: encontrada ? [] : ["procaz"],
  url: `https://es.wiktionary.org/wiki/${lema}`,
  consultadaEn: new Date().toISOString(),
});

describe("apuntarPalabra", () => {
  it("guarda una palabra nueva como pendiente", async () => {
    const r = await apuntarPalabra({ termino: " Procaz ", frase: "Un chiste procaz.", fuente: "La Regenta" }, db);
    expect(r.tipo).toBe("nueva");
    const p = await db.palabras.where("termino").equals("procaz").first();
    expect(p).toMatchObject({ estado: "pendiente", contextos: [{ frase: "Un chiste procaz.", fuente: "La Regenta" }] });
  });

  it("no duplica: añade el nuevo contexto", async () => {
    await apuntarPalabra({ termino: "procaz", frase: "Frase 1" }, db);
    const r = await apuntarPalabra({ termino: "PROCAZ", frase: "Frase 2" }, db);
    expect(r.tipo).toBe("duplicada");
    expect(await db.palabras.count()).toBe(1);
    expect((await db.palabras.toArray())[0].contextos.map((c) => c.frase)).toEqual(["Frase 1", "Frase 2"]);
  });

  it("no repite el mismo contexto", async () => {
    await apuntarPalabra({ termino: "procaz", frase: "Igual" }, db);
    await apuntarPalabra({ termino: "procaz", frase: "Igual" }, db);
    expect((await db.palabras.toArray())[0].contextos).toHaveLength(1);
  });

  it("si estaba aprendida, la devuelve al repaso", async () => {
    const r = await apuntarPalabra({ termino: "procaz" }, db);
    await guardarLote([r.tipo === "nueva" ? r.palabra : null!], new Map([["procaz", definicion("procaz")]]), db);
    const id = (await db.palabras.toArray())[0].id;
    await marcarAprendida(id, true, db);
    const otra = await apuntarPalabra({ termino: "procaz" }, db);
    expect(otra).toMatchObject({ tipo: "duplicada", estadoAnterior: "aprendida", palabra: { estado: "definida" } });
  });

  it("ignora entradas vacías", async () => {
    expect((await apuntarPalabra({ termino: "  ¿? " }, db)).tipo).toBe("vacia");
    expect(await db.palabras.count()).toBe(0);
  });
});

describe("guardarLote", () => {
  it("define las encontradas y aparta las no encontradas", async () => {
    await apuntarPalabra({ termino: "procaz" }, db);
    await apuntarPalabra({ termino: "procas" }, db);
    const pendientes = await db.palabras.toArray();
    const lote = await guardarLote(
      pendientes,
      new Map([
        ["procaz", definicion("procaz")],
        ["procas", definicion("procas", false)],
      ]),
      db,
    );
    expect(lote.palabraIds).toHaveLength(2);
    expect(await db.lotes.count()).toBe(1);
    const estados = Object.fromEntries((await db.palabras.toArray()).map((p) => [p.termino, p.estado]));
    expect(estados).toEqual({ procaz: "definida", procas: "sin-resultado" });
  });

  it("no pisa una palabra que se editó mientras se buscaba", async () => {
    await apuntarPalabra({ termino: "procas" }, db);
    const pendientes = await db.palabras.toArray();
    await editarPalabra(pendientes[0].id, { termino: "procaz" }, db);
    const lote = await guardarLote(pendientes, new Map([["procas", definicion("procas", false)]]), db);
    expect(lote.palabraIds).toHaveLength(0);
    expect((await db.palabras.toArray())[0]).toMatchObject({ termino: "procaz", estado: "pendiente" });
  });
});

describe("editar, corregir y borrar", () => {
  it("al cambiar el término vuelve a pendiente y borra la definición", async () => {
    await apuntarPalabra({ termino: "procas" }, db);
    const [p] = await db.palabras.toArray();
    await guardarLote([p], new Map([["procas", definicion("procas", false)]]), db);
    await corregirPalabra(p.id, "procaz", db);
    expect((await db.palabras.get(p.id))).toMatchObject({ termino: "procaz", estado: "pendiente", definicion: undefined });
  });

  it("corregir hacia una palabra que ya existe fusiona ambas", async () => {
    await apuntarPalabra({ termino: "procaz", frase: "A" }, db);
    await apuntarPalabra({ termino: "procas", frase: "B" }, db);
    const mala = (await db.palabras.where("termino").equals("procas").first())!;
    await corregirPalabra(mala.id, "procaz", db);
    const todas = await db.palabras.toArray();
    expect(todas).toHaveLength(1);
    expect(todas[0].contextos.map((c) => c.frase)).toEqual(["A", "B"]);
  });

  it("no permite renombrar a una palabra que ya existe", async () => {
    await apuntarPalabra({ termino: "uno" }, db);
    await apuntarPalabra({ termino: "dos" }, db);
    const dos = (await db.palabras.where("termino").equals("dos").first())!;
    await expect(editarPalabra(dos.id, { termino: "Uno" }, db)).rejects.toThrow("«uno» ya está en tu lista.");
  });

  it("borrar y deshacer deja todo como estaba, lote incluido", async () => {
    await apuntarPalabra({ termino: "procaz" }, db);
    const [p] = await db.palabras.toArray();
    const lote = await guardarLote([p], new Map([["procaz", definicion("procaz")]]), db);
    const definida = (await db.palabras.get(p.id))!;
    await borrarPalabra(p.id, db);
    expect(await db.lotes.count()).toBe(0);
    await restaurarPalabra(definida, db);
    expect((await db.lotes.get(lote.id))?.palabraIds).toEqual([p.id]);
  });
});

describe("ajustes y copias de seguridad", () => {
  it("lee valores por defecto y guarda cambios", async () => {
    expect((await leerAjustes(db)).umbral).toBe(10);
    await guardarAjuste("umbral", 5, db);
    expect((await leerAjustes(db)).umbral).toBe(5);
  });

  it("exporta e importa sin duplicar", async () => {
    await apuntarPalabra({ termino: "procaz" }, db);
    const copia = await crearCopia(db);
    const otra = new BaseDeDatos(`prueba-${n++}`);
    await apuntarPalabra({ termino: "procaz" }, otra); // ya existe con otro id
    await apuntarPalabra({ termino: "zozobra" }, db);
    const copia2 = await crearCopia(db);
    expect(await importarCopia(copia2, otra)).toEqual({ nuevas: 1, repetidas: 1 });
    expect(await importarCopia(copia, db)).toEqual({ nuevas: 0, repetidas: 1 });
  });

  it("rechaza archivos que no son copias", async () => {
    await expect(importarCopia({ hola: 1 }, db)).rejects.toThrow("no es una copia de seguridad");
  });
});
