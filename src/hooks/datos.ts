import { useLiveQuery } from "dexie-react-hooks";
import { useEffect, useState } from "react";
import { db } from "../db/db";
import { AJUSTES_POR_DEFECTO, leerAjustes, type Ajustes } from "../db/operaciones";
import type { Palabra } from "../tipos";

const porFechaDesc = (a: Palabra, b: Palabra) => b.creadaEn.localeCompare(a.creadaEn);

export function usePendientes(): Palabra[] | undefined {
  return useLiveQuery(async () => (await db.palabras.where("estado").equals("pendiente").toArray()).sort(porFechaDesc), []);
}

export function useSinResultado(): Palabra[] | undefined {
  return useLiveQuery(async () => (await db.palabras.where("estado").equals("sin-resultado").toArray()).sort(porFechaDesc), []);
}

export function useContadores() {
  return useLiveQuery(
    async () => ({
      pendientes: await db.palabras.where("estado").equals("pendiente").count(),
      porAprender: await db.palabras.where("estado").equals("definida").count(),
      aprendidas: await db.palabras.where("estado").equals("aprendida").count(),
      total: await db.palabras.count(),
    }),
    [],
    { pendientes: 0, porAprender: 0, aprendidas: 0, total: 0 },
  );
}

export function useAjustes(): Ajustes {
  return useLiveQuery(() => leerAjustes(), [], AJUSTES_POR_DEFECTO);
}

export function useConexion(): boolean {
  const [enLinea, setEnLinea] = useState(() => (typeof navigator === "undefined" ? true : navigator.onLine));
  useEffect(() => {
    const on = () => setEnLinea(true);
    const off = () => setEnLinea(false);
    window.addEventListener("online", on);
    window.addEventListener("offline", off);
    return () => {
      window.removeEventListener("online", on);
      window.removeEventListener("offline", off);
    };
  }, []);
  return enLinea;
}
