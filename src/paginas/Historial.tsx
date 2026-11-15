import { useLiveQuery } from "dexie-react-hooks";
import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { db } from "../db/db";
import type { Estado, Palabra } from "../tipos";
import { acepcionPrincipal } from "../lib/exportar";
import { claseCampo, Titulo, Vacio } from "../componentes/Comunes";
import { IconoBuscar } from "../componentes/Iconos";

const FILTROS: { valor: Estado | "todas"; texto: string }[] = [
  { valor: "todas", texto: "Todas" },
  { valor: "definida", texto: "Por aprender" },
  { valor: "aprendida", texto: "Aprendidas" },
  { valor: "pendiente", texto: "Pendientes" },
];

const sinTildes = (s: string) => s.normalize("NFD").replace(/\p{M}/gu, "").toLocaleLowerCase("es");

function coincide(p: Palabra, consulta: string) {
  if (!consulta) return true;
  const textos = [
    p.termino,
    ...(p.definicion?.acepciones.map((a) => a.texto) ?? []),
    ...p.contextos.flatMap((c) => [c.frase ?? "", c.fuente ?? ""]),
  ];
  return textos.some((t) => sinTildes(t).includes(consulta));
}

const fechaCorta = (iso: string) => new Date(iso).toLocaleDateString("es", { day: "numeric", month: "short", year: "numeric" });

export default function Historial() {
  const [consulta, setConsulta] = useState("");
  const [filtro, setFiltro] = useState<Estado | "todas">("todas");
  const palabras = useLiveQuery(() => db.palabras.orderBy("creadaEn").reverse().toArray(), []);
  const lotes = useLiveQuery(() => db.lotes.orderBy("fecha").reverse().toArray(), []);

  const filtradas = useMemo(() => {
    const q = sinTildes(consulta.trim());
    return (palabras ?? []).filter((p) => (filtro === "todas" || p.estado === filtro) && coincide(p, q));
  }, [palabras, consulta, filtro]);

  if (!palabras || !lotes) return null;

  return (
    <div>
      <Titulo sub={`${palabras.length} ${palabras.length === 1 ? "palabra" : "palabras"} en total`}>Mis palabras</Titulo>

      {palabras.length === 0 ? (
        <Vacio titulo="Aún no has apuntado ninguna palabra">
          <Link to="/" className="underline underline-offset-2">Empieza aquí</Link>.
        </Vacio>
      ) : (
        <>
          <div className="relative">
            <IconoBuscar className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-tinta-suave" width={18} height={18} />
            <label htmlFor="buscar" className="sr-only">Buscar en tus palabras</label>
            <input
              id="buscar"
              type="search"
              className={`${claseCampo} pl-10`}
              placeholder="Buscar palabra, significado o frase"
              value={consulta}
              onChange={(e) => setConsulta(e.target.value)}
            />
          </div>
          <div className="mt-3 flex flex-wrap gap-2" role="group" aria-label="Filtrar por estado">
            {FILTROS.map((f) => (
              <button
                key={f.valor}
                onClick={() => setFiltro(f.valor)}
                aria-pressed={filtro === f.valor}
                className={`rounded-full border px-3 py-1 text-sm font-medium transition ${
                  filtro === f.valor ? "border-acento bg-acento text-acento-tinta" : "border-borde bg-superficie text-tinta-suave hover:text-tinta"
                }`}
              >
                {f.texto}
              </button>
            ))}
          </div>

          <ul className="mt-4 divide-y divide-borde overflow-hidden rounded-2xl border border-borde bg-superficie">
            {filtradas.length === 0 && <li className="p-5 text-center text-tinta-suave">Nada coincide con la búsqueda.</li>}
            {filtradas.map((p) => {
              const a = acepcionPrincipal(p);
              return (
                <li key={p.id}>
                  <Link
                    to={p.estado === "pendiente" ? "/pendientes" : `/palabra/${p.id}`}
                    className="flex items-baseline gap-3 px-4 py-3 transition hover:bg-superficie-2"
                  >
                    <span className="shrink-0 font-serif text-lg">{p.termino}</span>
                    <span className="min-w-0 flex-1 truncate text-sm text-tinta-suave">
                      {a?.texto ?? (p.estado === "pendiente" ? "Pendiente" : p.estado === "sin-resultado" ? "No encontrada" : "")}
                    </span>
                    {p.estado === "aprendida" && <span className="shrink-0 text-xs font-semibold text-exito">✓</span>}
                  </Link>
                </li>
              );
            })}
          </ul>

          {lotes.length > 0 && !consulta && filtro === "todas" && (
            <section className="mt-10">
              <h2 className="mb-2 text-sm font-semibold uppercase tracking-wider text-tinta-suave">Lotes anteriores</h2>
              <ul className="space-y-2">
                {lotes.map((l) => (
                  <li key={l.id}>
                    <Link
                      to={`/lotes/${l.id}`}
                      className="flex items-center justify-between rounded-xl border border-borde bg-superficie px-4 py-3 transition hover:border-acento"
                    >
                      <span>{fechaCorta(l.fecha)}</span>
                      <span className="text-sm text-tinta-suave">
                        {l.palabraIds.length} {l.palabraIds.length === 1 ? "palabra" : "palabras"}
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          )}
        </>
      )}
    </div>
  );
}
