import { useState } from "react";
import { Link } from "react-router-dom";
import type { Acepcion, Palabra } from "../tipos";
import { borrarPalabra, corregirPalabra, elegirAcepcion, marcarAprendida, restaurarPalabra } from "../db/operaciones";
import { urlRAE } from "../lib/wikcionario";
import { useAvisos } from "./Avisos";
import { claseBoton, claseCampo, Frase } from "./Comunes";
import { IconoCheck, IconoEnlace, IconoEstrella, IconoPapelera } from "./Iconos";

const VISIBLES = 3;

function Etiquetas({ etiquetas }: { etiquetas: string[] }) {
  if (etiquetas.length === 0) return null;
  return (
    <span className="ml-1 inline-flex flex-wrap gap-1 align-middle">
      {etiquetas.slice(0, 5).map((e) => (
        <span key={e} className="rounded-full bg-superficie-2 px-2 py-0.5 text-[11px] font-medium text-tinta-suave">
          {e}
        </span>
      ))}
      {etiquetas.length > 5 && <span className="text-[11px] text-tinta-suave">+{etiquetas.length - 5}</span>}
    </span>
  );
}

function FilaAcepcion({
  acepcion,
  elegida,
  alElegir,
}: {
  acepcion: Acepcion;
  elegida: boolean;
  alElegir: () => void;
}) {
  return (
    <li className={`group flex gap-3 rounded-xl p-3 transition ${elegida ? "bg-acento-suave" : "hover:bg-superficie-2"}`}>
      <span className="mt-0.5 w-5 shrink-0 text-right font-serif text-sm text-tinta-suave">{acepcion.numero}</span>
      <div className="min-w-0 flex-1">
        <p className="leading-relaxed">
          {acepcion.texto}
          <Etiquetas etiquetas={acepcion.etiquetas} />
        </p>
        {acepcion.ejemplo && <p className="mt-1 font-serif text-[15px] italic text-tinta-suave">«{acepcion.ejemplo}»</p>}
        {acepcion.sinonimos.length > 0 && (
          <p className="mt-1 text-sm text-tinta-suave">
            <span className="font-medium">Sinónimos:</span> {acepcion.sinonimos.join(", ")}
          </p>
        )}
      </div>
      <button
        onClick={alElegir}
        className={`-m-1 h-fit shrink-0 rounded-lg p-1.5 transition ${elegida ? "text-acento" : "text-tinta-suave/50 hover:text-acento"}`}
        aria-pressed={elegida}
        title={elegida ? "Quitar marca" : "Esta es la acepción de mi frase"}
        aria-label={elegida ? `Quitar marca de la acepción ${acepcion.numero}` : `Marcar la acepción ${acepcion.numero} como la de mi frase`}
      >
        <IconoEstrella llena={elegida} width={20} height={20} />
      </button>
    </li>
  );
}

function Acepciones({ palabra }: { palabra: Palabra }) {
  const [todas, setTodas] = useState(false);
  const acepciones = palabra.definicion?.acepciones ?? [];
  const elegida = palabra.acepcionElegida;

  // La elegida va siempre visible; el resto, las primeras.
  const visibles = todas
    ? acepciones
    : acepciones.filter((a, i) => i < VISIBLES || a.numero === elegida);
  const ocultas = acepciones.length - visibles.length;

  let categoriaAnterior = "";
  return (
    <div>
      <ol className="-mx-3 space-y-0.5">
        {visibles.map((a) => {
          const cabecera = a.categoria !== categoriaAnterior ? a.categoria : null;
          categoriaAnterior = a.categoria;
          return (
            <div key={a.numero}>
              {cabecera && (
                <p className="mx-3 mb-0.5 mt-3 text-xs font-semibold uppercase tracking-wider text-acento first:mt-0">{cabecera}</p>
              )}
              <FilaAcepcion
                acepcion={a}
                elegida={a.numero === elegida}
                alElegir={() => elegirAcepcion(palabra.id, a.numero === elegida ? undefined : a.numero)}
              />
            </div>
          );
        })}
      </ol>
      {(ocultas > 0 || todas) && acepciones.length > VISIBLES && (
        <button className={`${claseBoton.fantasma} mt-1`} onClick={() => setTodas(!todas)}>
          {todas ? "Ver menos" : `Ver ${ocultas} ${ocultas === 1 ? "acepción más" : "acepciones más"}`}
        </button>
      )}
    </div>
  );
}

function NoEncontrada({ palabra }: { palabra: Palabra }) {
  const [texto, setTexto] = useState(palabra.termino);
  const avisar = useAvisos();
  const sugerencias = palabra.definicion?.sugerencias ?? [];

  const corregir = async (nuevo: string) => {
    try {
      await corregirPalabra(palabra.id, nuevo);
      avisar(`Cambiada a «${nuevo}». Está otra vez en pendientes.`, { tipo: "exito" });
    } catch (e) {
      avisar(e instanceof Error ? e.message : "No se pudo corregir.", { tipo: "error" });
    }
  };

  return (
    <div className="space-y-3">
      <p className="text-tinta-suave">No la he encontrado en el Wikcionario. ¿Está bien escrita?</p>
      {sugerencias.length > 0 && (
        <div>
          <p className="mb-1.5 text-sm font-medium">Quizá quisiste decir:</p>
          <div className="flex flex-wrap gap-2">
            {sugerencias.map((s) => (
              <button key={s} className={claseBoton.secundario} onClick={() => corregir(s)}>
                {s}
              </button>
            ))}
          </div>
        </div>
      )}
      <form
        className="flex gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          if (texto.trim() && texto.trim() !== palabra.termino) corregir(texto);
        }}
      >
        <label className="sr-only" htmlFor={`corregir-${palabra.id}`}>Corregir palabra</label>
        <input id={`corregir-${palabra.id}`} className={`${claseCampo} py-2`} value={texto} onChange={(e) => setTexto(e.target.value)} />
        <button className={claseBoton.secundario} type="submit">Corregir</button>
      </form>
    </div>
  );
}

export function FichaPalabra({ palabra, enlazar = false }: { palabra: Palabra; enlazar?: boolean }) {
  const avisar = useAvisos();
  const d = palabra.definicion;
  const aprendida = palabra.estado === "aprendida";

  const borrar = async () => {
    await borrarPalabra(palabra.id);
    avisar(`«${palabra.termino}» borrada.`, { accion: { texto: "Deshacer", alPulsar: () => restaurarPalabra(palabra) } });
  };

  return (
    <article className="aparecer rounded-2xl border border-borde bg-superficie p-5 shadow-[0_1px_2px_rgba(0,0,0,0.04)]">
      <header className="mb-3 flex items-start gap-3">
        <div className="min-w-0 flex-1">
          <h2 className="font-serif text-2xl font-semibold leading-tight">
            {enlazar ? (
              <Link to={`/palabra/${palabra.id}`} className="hover:underline">{palabra.termino}</Link>
            ) : (
              palabra.termino
            )}
          </h2>
          {d?.formaDe && (
            <p className="mt-0.5 text-sm text-tinta-suave">
              {d.formaDe.descripcion}
            </p>
          )}
        </div>
        {aprendida && (
          <span className="inline-flex items-center gap-1 rounded-full bg-exito-suave px-2.5 py-1 text-xs font-semibold text-exito">
            <IconoCheck width={14} height={14} /> Aprendida
          </span>
        )}
      </header>

      {palabra.contextos.length > 0 && (
        <div className="mb-4 space-y-2">
          {palabra.contextos.map((c, i) => (
            <Frase key={i} frase={c.frase} fuente={c.fuente} termino={palabra.termino} />
          ))}
        </div>
      )}

      {d?.encontrada ? (
        <>
          <Acepciones palabra={palabra} />
          {d.etimologia && <p className="mt-3 text-sm text-tinta-suave"><span className="font-medium">Etimología:</span> {d.etimologia}</p>}
          {palabra.contextos.some((c) => c.frase) && palabra.acepcionElegida === undefined && d.acepciones.length > 1 && (
            <p className="mt-2 text-xs text-tinta-suave">Toca la estrella de la acepción que encaja con tu frase.</p>
          )}
        </>
      ) : d ? (
        <NoEncontrada palabra={palabra} />
      ) : (
        <p className="text-tinta-suave">Todavía sin significado: está en pendientes.</p>
      )}

      <footer className="mt-4 flex flex-wrap items-center gap-x-1 gap-y-2 border-t border-borde pt-3">
        {d?.encontrada && (
          <button
            className={aprendida ? claseBoton.fantasma : `${claseBoton.secundario} py-1.5 text-sm`}
            onClick={() => marcarAprendida(palabra.id, !aprendida)}
          >
            {aprendida ? "Volver a repasar" : (<><IconoCheck width={18} height={18} /> Ya me la sé</>)}
          </button>
        )}
        <span className="flex-1" />
        {d?.encontrada && (
          <>
            <a className={claseBoton.fantasma} href={d.url} target="_blank" rel="noreferrer" title="Fuente: Wikcionario (CC BY-SA 4.0)">
              Wikcionario <IconoEnlace width={14} height={14} />
            </a>
            <a className={claseBoton.fantasma} href={urlRAE(d.lema)} target="_blank" rel="noreferrer">
              RAE <IconoEnlace width={14} height={14} />
            </a>
          </>
        )}
        <button className={claseBoton.fantasma} onClick={borrar} aria-label={`Borrar ${palabra.termino}`} title="Borrar">
          <IconoPapelera width={18} height={18} />
        </button>
      </footer>
    </article>
  );
}
