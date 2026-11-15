import { useLiveQuery } from "dexie-react-hooks";
import { Link, useParams } from "react-router-dom";
import { db } from "../db/db";
import { Titulo, Vacio } from "../componentes/Comunes";
import { FichaPalabra } from "../componentes/FichaPalabra";
import type { Palabra } from "../tipos";

export const fechaLarga = (iso: string) => {
  const texto = new Date(iso).toLocaleDateString("es", { weekday: "long", day: "numeric", month: "long", year: "numeric" });
  return texto.charAt(0).toLocaleUpperCase("es") + texto.slice(1);
};

export default function Lote() {
  const { id = "" } = useParams();
  const datos = useLiveQuery(async () => {
    const lote = await db.lotes.get(id);
    if (!lote) return { lote: null, palabras: [] as Palabra[] };
    const palabras = (await db.palabras.bulkGet(lote.palabraIds)).filter((p): p is Palabra => !!p);
    return { lote, palabras };
  }, [id]);

  if (!datos) return null;
  if (!datos.lote) {
    return (
      <Vacio titulo="Este lote ya no existe">
        <Link to="/historial" className="underline underline-offset-2">Ver todas tus palabras</Link>
      </Vacio>
    );
  }

  // Las palabras que siguen en este lote (si se corrige una, sale de él).
  const palabras = datos.palabras
    .filter((p) => p.loteId === datos.lote!.id)
    .sort((a, b) => a.creadaEn.localeCompare(b.creadaEn)); // en el orden en que las apuntaste
  const encontradas = palabras.filter((p) => p.definicion?.encontrada);
  const noEncontradas = palabras.filter((p) => p.estado === "sin-resultado");

  return (
    <div>
      <Titulo
        sub={
          <>
            {fechaLarga(datos.lote.fecha)} · {encontradas.length}{" "}
            {encontradas.length === 1 ? "palabra definida" : "palabras definidas"}
            {noEncontradas.length > 0 && ` · ${noEncontradas.length} sin encontrar`}
          </>
        }
      >
        Tus significados
      </Titulo>

      <div className="space-y-4">
        {[...noEncontradas, ...encontradas].map((p) => (
          <FichaPalabra key={p.id} palabra={p} enlazar />
        ))}
      </div>

      {encontradas.length > 0 && (
        <div className="mt-8 rounded-2xl border border-borde bg-superficie p-5 text-center">
          <p className="font-serif text-lg">¿Las repasamos para que no se te olviden?</p>
          <Link to="/repaso" className="mt-3 inline-block font-semibold text-acento underline underline-offset-2">
            Ir al repaso
          </Link>
        </div>
      )}

      <p className="mt-6 text-center text-xs text-tinta-suave">
        Definiciones del{" "}
        <a href="https://es.wiktionary.org" target="_blank" rel="noreferrer" className="underline">Wikcionario</a>, bajo licencia{" "}
        <a href="https://creativecommons.org/licenses/by-sa/4.0/deed.es" target="_blank" rel="noreferrer" className="underline">CC BY-SA 4.0</a>.
      </p>
    </div>
  );
}
