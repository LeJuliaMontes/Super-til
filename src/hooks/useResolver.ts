import { useCallback, useState } from "react";
import { useNavigate } from "react-router-dom";
import { db } from "../db/db";
import { guardarLote } from "../db/operaciones";
import { buscarDefiniciones, ErrorDiccionario } from "../lib/wikcionario";
import { useAvisos } from "../componentes/Avisos";

/** Busca los significados de todas las palabras pendientes y abre el lote resultante. */
export function useResolver() {
  const [progreso, setProgreso] = useState<string | null>(null);
  const navegar = useNavigate();
  const avisar = useAvisos();

  const resolver = useCallback(async () => {
    if (progreso) return;
    const pendientes = await db.palabras.where("estado").equals("pendiente").toArray();
    if (pendientes.length === 0) return;
    setProgreso("Preparando…");
    try {
      const definiciones = await buscarDefiniciones(
        pendientes.map((p) => p.termino),
        { alProgresar: setProgreso },
      );
      const lote = await guardarLote(pendientes, definiciones);
      if (lote.palabraIds.length === 0) {
        avisar("No se ha podido guardar ningún resultado.", { tipo: "error" });
        return;
      }
      navegar(`/lotes/${lote.id}`);
    } catch (error) {
      const mensaje = error instanceof ErrorDiccionario ? error.message : "Algo ha fallado al buscar los significados.";
      avisar(mensaje, { tipo: "error", duracion: 6000 });
      if (!(error instanceof ErrorDiccionario)) console.error(error);
    } finally {
      setProgreso(null);
    }
  }, [progreso, navegar, avisar]);

  return { resolver, progreso, ocupado: progreso !== null };
}
