import { useLiveQuery } from "dexie-react-hooks";
import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { db } from "../db/db";
import { marcarAprendida } from "../db/operaciones";
import { acepcionPrincipal } from "../lib/exportar";
import { claseBoton, Frase, Titulo, Vacio } from "../componentes/Comunes";
import { IconoCheck } from "../componentes/Iconos";

/** Tarjetas: ves la palabra (y tu frase), intentas recordarla y luego la giras. */
export default function Repaso() {
  const porAprender = useLiveQuery(() => db.palabras.where("estado").equals("definida").toArray(), []);
  const [orden, setOrden] = useState<string[]>([]);
  const [girada, setGirada] = useState(false);
  const [sabidas, setSabidas] = useState(0);

  // Baraja al entrar; añade al final las que vayan apareciendo.
  useEffect(() => {
    if (!porAprender) return;
    setOrden((actual) => {
      const ids = new Set(porAprender.map((p) => p.id));
      const quedan = actual.filter((id) => ids.has(id));
      const nuevas = porAprender.map((p) => p.id).filter((id) => !quedan.includes(id));
      for (let i = nuevas.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [nuevas[i], nuevas[j]] = [nuevas[j], nuevas[i]];
      }
      return [...quedan, ...nuevas];
    });
  }, [porAprender]);

  const actual = useMemo(() => porAprender?.find((p) => p.id === orden[0]), [porAprender, orden]);

  if (!porAprender) return null;

  if (!actual) {
    return (
      <div>
        <Titulo>Repaso</Titulo>
        <Vacio titulo={sabidas > 0 ? `¡Hecho! Hoy te has aprendido ${sabidas} ${sabidas === 1 ? "palabra" : "palabras"}.` : "Nada que repasar"}>
          {sabidas > 0 ? "Vuelve cuando tengas palabras nuevas." : (
            <>Aquí aparecen las palabras con significado que aún no has dado por aprendidas. <Link to="/pendientes" className="underline underline-offset-2">Mira tus pendientes</Link>.</>
          )}
        </Vacio>
      </div>
    );
  }

  const a = acepcionPrincipal(actual);
  const contexto = actual.contextos.find((c) => c.frase);
  const siguiente = async (aprendida: boolean) => {
    if (aprendida) {
      await marcarAprendida(actual.id, true);
      setGirada(false);
      setSabidas((n) => n + 1);
      setOrden((o) => o.slice(1));
    } else {
      setGirada(false);
      setOrden((o) => [...o.slice(1), o[0]]);
    }
  };

  return (
    <div>
      <Titulo sub={`Quedan ${orden.length} · ¿Recuerdas qué significa?`}>Repaso</Titulo>

      <button
        type="button"
        onClick={() => setGirada(true)}
        disabled={girada}
        className="aparecer block min-h-72 w-full rounded-3xl border border-borde bg-superficie p-6 text-left shadow-sm transition enabled:hover:border-acento enabled:active:scale-[0.99]"
        aria-label={girada ? undefined : `Ver el significado de ${actual.termino}`}
      >
        <p className="text-center font-serif text-4xl font-semibold">{actual.termino}</p>
        {contexto && (
          <div className="mx-auto mt-5 max-w-md">
            <Frase frase={contexto.frase} fuente={contexto.fuente} termino={actual.termino} />
          </div>
        )}
        {girada && a ? (
          <div className="aparecer mt-6 border-t border-borde pt-5">
            {actual.definicion?.formaDe && <p className="mb-1 text-sm text-tinta-suave">{actual.definicion.formaDe.descripcion}</p>}
            <p className="text-xs font-semibold uppercase tracking-wider text-acento">{a.categoria}</p>
            <p className="mt-1 text-lg leading-relaxed">{a.texto}</p>
            {a.ejemplo && <p className="mt-2 font-serif italic text-tinta-suave">«{a.ejemplo}»</p>}
            {a.sinonimos.length > 0 && <p className="mt-2 text-sm text-tinta-suave">Sinónimos: {a.sinonimos.join(", ")}</p>}
          </div>
        ) : (
          <p className="mt-8 text-center text-sm text-tinta-suave">Toca para ver el significado</p>
        )}
      </button>

      {girada && (
        <div className="aparecer mt-4 grid grid-cols-2 gap-3">
          <button className={claseBoton.secundario} onClick={() => siguiente(false)}>
            Otra vez
          </button>
          <button className={claseBoton.primario} onClick={() => siguiente(true)}>
            <IconoCheck /> Me la sé
          </button>
        </div>
      )}
      <p className="mt-4 text-center text-sm">
        <Link to={`/palabra/${actual.id}`} className="text-tinta-suave underline underline-offset-2">Ver todas las acepciones</Link>
      </p>
    </div>
  );
}
