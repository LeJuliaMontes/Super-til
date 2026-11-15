import type { Contexto, Definicion, Lote, Palabra } from "../tipos";
import { normalizarTermino } from "../lib/normalizar";
import { db as dbPorDefecto, type BaseDeDatos } from "./db";

const ahora = () => new Date().toISOString();
const nuevoId = () => crypto.randomUUID();

export type ResultadoApuntar =
  | { tipo: "nueva"; palabra: Palabra }
  | { tipo: "duplicada"; palabra: Palabra; estadoAnterior: Palabra["estado"] }
  | { tipo: "vacia" };

function crearContexto(frase?: string, fuente?: string): Contexto | null {
  const f = frase?.trim();
  const s = fuente?.trim();
  if (!f && !s) return null;
  return { frase: f || undefined, fuente: s || undefined, fecha: ahora() };
}

/** Apunta una palabra. Si ya existía, añade el nuevo contexto en lugar de duplicarla. */
export async function apuntarPalabra(
  entrada: { termino: string; frase?: string; fuente?: string },
  db: BaseDeDatos = dbPorDefecto,
): Promise<ResultadoApuntar> {
  const termino = normalizarTermino(entrada.termino);
  if (!termino) return { tipo: "vacia" };
  const contexto = crearContexto(entrada.frase, entrada.fuente);

  return db.transaction("rw", db.palabras, async () => {
    const existente = await db.palabras.where("termino").equals(termino).first();
    if (existente) {
      const contextos = [...existente.contextos];
      if (contexto && !contextos.some((c) => c.frase === contexto.frase && c.fuente === contexto.fuente)) {
        contextos.push(contexto);
      }
      // Si la había dado por aprendida y vuelve a aparecer, la devolvemos al repaso.
      const estado = existente.estado === "aprendida" ? "definida" : existente.estado;
      const actualizada: Palabra = { ...existente, contextos, estado, actualizadaEn: ahora() };
      await db.palabras.put(actualizada);
      return { tipo: "duplicada", palabra: actualizada, estadoAnterior: existente.estado };
    }
    const palabra: Palabra = {
      id: nuevoId(),
      termino,
      contextos: contexto ? [contexto] : [],
      estado: "pendiente",
      creadaEn: ahora(),
      actualizadaEn: ahora(),
    };
    await db.palabras.add(palabra);
    return { tipo: "nueva", palabra };
  });
}

export class ErrorPalabra extends Error {}

/** Cambia el término o los contextos. Si cambia el término, vuelve a pendiente. */
export async function editarPalabra(
  id: string,
  cambios: { termino?: string; contextos?: Contexto[] },
  db: BaseDeDatos = dbPorDefecto,
): Promise<Palabra> {
  return db.transaction("rw", db.palabras, async () => {
    const palabra = await db.palabras.get(id);
    if (!palabra) throw new ErrorPalabra("Esa palabra ya no existe.");
    const actualizada: Palabra = { ...palabra, actualizadaEn: ahora() };
    if (cambios.contextos) actualizada.contextos = cambios.contextos.filter((c) => c.frase || c.fuente);
    if (cambios.termino !== undefined) {
      const termino = normalizarTermino(cambios.termino);
      if (!termino) throw new ErrorPalabra("La palabra no puede quedar vacía.");
      if (termino !== palabra.termino) {
        const otra = await db.palabras.where("termino").equals(termino).first();
        if (otra) throw new ErrorPalabra(`«${termino}» ya está en tu lista.`);
        actualizada.termino = termino;
        actualizada.estado = "pendiente";
        actualizada.definicion = undefined;
        actualizada.acepcionElegida = undefined;
        actualizada.loteId = undefined;
      }
    }
    await db.palabras.put(actualizada);
    return actualizada;
  });
}

export async function borrarPalabra(id: string, db: BaseDeDatos = dbPorDefecto) {
  await db.transaction("rw", db.palabras, db.lotes, async () => {
    await db.palabras.delete(id);
    const lotes = await db.lotes.filter((l) => l.palabraIds.includes(id)).toArray();
    for (const lote of lotes) {
      const palabraIds = lote.palabraIds.filter((p) => p !== id);
      if (palabraIds.length === 0) await db.lotes.delete(lote.id);
      else await db.lotes.put({ ...lote, palabraIds });
    }
  });
}

/** Para "deshacer" un borrado. */
export async function restaurarPalabra(palabra: Palabra, db: BaseDeDatos = dbPorDefecto) {
  await db.transaction("rw", db.palabras, db.lotes, async () => {
    await db.palabras.put(palabra);
    if (palabra.loteId) {
      const lote = await db.lotes.get(palabra.loteId);
      if (lote && !lote.palabraIds.includes(palabra.id)) {
        await db.lotes.put({ ...lote, palabraIds: [...lote.palabraIds, palabra.id] });
      } else if (!lote) {
        await db.lotes.put({ id: palabra.loteId, fecha: palabra.actualizadaEn, palabraIds: [palabra.id] });
      }
    }
  });
}

/** Guarda el resultado de resolver un lote y devuelve el lote creado. */
export async function guardarLote(
  palabras: Palabra[],
  definiciones: Map<string, Definicion>,
  db: BaseDeDatos = dbPorDefecto,
): Promise<Lote> {
  const lote: Lote = { id: nuevoId(), fecha: ahora(), palabraIds: [] };
  await db.transaction("rw", db.palabras, db.lotes, async () => {
    for (const p of palabras) {
      const definicion = definiciones.get(p.termino);
      if (!definicion) continue;
      // Puede haberse editado o borrado mientras se buscaba.
      const actual = await db.palabras.get(p.id);
      if (!actual || actual.termino !== p.termino) continue;
      await db.palabras.put({
        ...actual,
        definicion,
        estado: definicion.encontrada ? "definida" : "sin-resultado",
        loteId: lote.id,
        acepcionElegida: undefined,
        actualizadaEn: ahora(),
      });
      lote.palabraIds.push(p.id);
    }
    if (lote.palabraIds.length > 0) await db.lotes.add(lote);
  });
  return lote;
}

export async function marcarAprendida(id: string, aprendida: boolean, db: BaseDeDatos = dbPorDefecto) {
  const palabra = await db.palabras.get(id);
  if (!palabra?.definicion?.encontrada) return;
  await db.palabras.update(id, {
    estado: aprendida ? "aprendida" : "definida",
    aprendidaEn: aprendida ? ahora() : undefined,
    actualizadaEn: ahora(),
  });
}

export async function elegirAcepcion(id: string, numero: number | undefined, db: BaseDeDatos = dbPorDefecto) {
  await db.palabras.update(id, { acepcionElegida: numero, actualizadaEn: ahora() });
}

/** Sustituye una palabra no encontrada por una sugerencia y la devuelve a pendientes. */
export async function corregirPalabra(id: string, nuevoTermino: string, db: BaseDeDatos = dbPorDefecto) {
  const termino = normalizarTermino(nuevoTermino);
  const otra = await db.palabras.where("termino").equals(termino).first();
  if (otra && otra.id !== id) {
    // Ya existía la forma correcta: fusionamos contextos y quitamos la errónea.
    const palabra = await db.palabras.get(id);
    await db.transaction("rw", db.palabras, db.lotes, async () => {
      await db.palabras.put({ ...otra, contextos: [...otra.contextos, ...(palabra?.contextos ?? [])], actualizadaEn: ahora() });
    });
    await borrarPalabra(id, db);
    return otra.id;
  }
  await editarPalabra(id, { termino }, db);
  return id;
}

// ---------- Ajustes ----------

export const AJUSTES_POR_DEFECTO = { umbral: 10, ultimaFuente: "" };
export type Ajustes = typeof AJUSTES_POR_DEFECTO;

export async function leerAjustes(db: BaseDeDatos = dbPorDefecto): Promise<Ajustes> {
  const filas = await db.ajustes.toArray();
  const guardados = Object.fromEntries(filas.map((f) => [f.clave, f.valor]));
  return { ...AJUSTES_POR_DEFECTO, ...guardados } as Ajustes;
}

export async function guardarAjuste<K extends keyof Ajustes>(clave: K, valor: Ajustes[K], db: BaseDeDatos = dbPorDefecto) {
  await db.ajustes.put({ clave, valor });
}

// ---------- Copia de seguridad ----------

export interface CopiaSeguridad {
  app: "superutil";
  version: 1;
  exportadoEn: string;
  palabras: Palabra[];
  lotes: Lote[];
}

export async function crearCopia(db: BaseDeDatos = dbPorDefecto): Promise<CopiaSeguridad> {
  return {
    app: "superutil",
    version: 1,
    exportadoEn: ahora(),
    palabras: await db.palabras.toArray(),
    lotes: await db.lotes.toArray(),
  };
}

/** Importa una copia sin borrar nada: las palabras que ya existen se conservan. */
export async function importarCopia(datos: unknown, db: BaseDeDatos = dbPorDefecto): Promise<{ nuevas: number; repetidas: number }> {
  const copia = datos as Partial<CopiaSeguridad>;
  if (copia?.app !== "superutil" || !Array.isArray(copia.palabras)) {
    throw new ErrorPalabra("Ese archivo no es una copia de seguridad de Superútil.");
  }
  let nuevas = 0;
  let repetidas = 0;
  await db.transaction("rw", db.palabras, db.lotes, async () => {
    const idsImportados = new Set<string>();
    for (const p of copia.palabras!) {
      if (!p?.id || !p.termino) continue;
      const existe = (await db.palabras.get(p.id)) ?? (await db.palabras.where("termino").equals(p.termino).first());
      if (existe) {
        repetidas++;
        continue;
      }
      await db.palabras.add({ ...p, contextos: p.contextos ?? [] });
      idsImportados.add(p.id);
      nuevas++;
    }
    for (const l of copia.lotes ?? []) {
      const ids = l.palabraIds.filter((id) => idsImportados.has(id));
      if (ids.length === 0) continue;
      const existente = await db.lotes.get(l.id);
      await db.lotes.put(existente ? { ...existente, palabraIds: [...new Set([...existente.palabraIds, ...ids])] } : { ...l, palabraIds: ids });
    }
  });
  return { nuevas, repetidas };
}

export async function borrarTodo(db: BaseDeDatos = dbPorDefecto) {
  await db.transaction("rw", db.palabras, db.lotes, async () => {
    await db.palabras.clear();
    await db.lotes.clear();
  });
}
