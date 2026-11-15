import { useRef } from "react";
import { db } from "../db/db";
import { borrarTodo, crearCopia, guardarAjuste, importarCopia } from "../db/operaciones";
import { aAnki, aCSV, aMarkdown, descargar } from "../lib/exportar";
import { useAjustes, useContadores } from "../hooks/datos";
import { useAvisos } from "../componentes/Avisos";
import { claseBoton, claseCampo, Titulo } from "../componentes/Comunes";

const hoy = () => new Date().toISOString().slice(0, 10);

function Seccion({ titulo, children, descripcion }: { titulo: string; descripcion?: string; children: React.ReactNode }) {
  return (
    <section className="rounded-2xl border border-borde bg-superficie p-5">
      <h2 className="font-serif text-xl font-semibold">{titulo}</h2>
      {descripcion && <p className="mt-0.5 text-sm text-tinta-suave">{descripcion}</p>}
      <div className="mt-4">{children}</div>
    </section>
  );
}

export default function Ajustes() {
  const ajustes = useAjustes();
  const { total } = useContadores();
  const avisar = useAvisos();
  const archivo = useRef<HTMLInputElement>(null);

  const exportar = async (formato: "md" | "csv" | "anki" | "json") => {
    const palabras = await db.palabras.orderBy("creadaEn").toArray();
    if (formato === "md") descargar(`superutil-${hoy()}.md`, aMarkdown(palabras), "text/markdown;charset=utf-8");
    if (formato === "csv") descargar(`superutil-${hoy()}.csv`, aCSV(palabras), "text/csv;charset=utf-8");
    if (formato === "anki") descargar(`superutil-anki-${hoy()}.txt`, aAnki(palabras), "text/plain;charset=utf-8");
    if (formato === "json") descargar(`superutil-copia-${hoy()}.json`, JSON.stringify(await crearCopia(), null, 2), "application/json");
  };

  const importar = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const fichero = e.target.files?.[0];
    e.target.value = "";
    if (!fichero) return;
    try {
      const { nuevas, repetidas } = await importarCopia(JSON.parse(await fichero.text()));
      avisar(`Importadas ${nuevas} palabras${repetidas ? ` (${repetidas} ya las tenías)` : ""}.`, { tipo: "exito" });
    } catch (error) {
      avisar(error instanceof SyntaxError ? "El archivo no es un JSON válido." : error instanceof Error ? error.message : "No se pudo importar.", { tipo: "error" });
    }
  };

  const borrar = async () => {
    if (!confirm(`¿Seguro que quieres borrar tus ${total} palabras? No se puede deshacer. Haz antes una copia de seguridad si las quieres conservar.`)) return;
    await borrarTodo();
    avisar("Todo borrado.");
  };

  return (
    <div className="space-y-4">
      <Titulo>Ajustes</Titulo>

      <Seccion titulo="Aviso de lote" descripcion="Te avisaré en la pantalla principal cuando acumules estas palabras pendientes. Pon 0 para no avisar.">
        <label className="flex items-center gap-3">
          <input
            type="number"
            min={0}
            max={200}
            className={`${claseCampo} w-24 text-center`}
            value={ajustes.umbral}
            onChange={(e) => guardarAjuste("umbral", Math.max(0, Math.min(200, Number(e.target.value) || 0)))}
          />
          <span>palabras</span>
        </label>
      </Seccion>

      <Seccion titulo="Exportar" descripcion="Descarga tus palabras para leerlas, estudiarlas o guardarlas.">
        <div className="grid gap-2 sm:grid-cols-2">
          <button className={claseBoton.secundario} onClick={() => exportar("md")} disabled={total === 0}>Markdown (.md)</button>
          <button className={claseBoton.secundario} onClick={() => exportar("csv")} disabled={total === 0}>Hoja de cálculo (.csv)</button>
          <button className={claseBoton.secundario} onClick={() => exportar("anki")} disabled={total === 0}>Tarjetas para Anki</button>
          <button className={claseBoton.secundario} onClick={() => exportar("json")} disabled={total === 0}>Copia de seguridad (.json)</button>
        </div>
      </Seccion>

      <Seccion titulo="Importar" descripcion="Recupera una copia de seguridad. No se borra nada de lo que ya tienes.">
        <input ref={archivo} type="file" accept="application/json,.json" className="hidden" onChange={importar} aria-label="Archivo de copia de seguridad" />
        <button className={claseBoton.secundario} onClick={() => archivo.current?.click()}>Elegir archivo…</button>
      </Seccion>

      <Seccion titulo="Tus datos" descripcion="Tus palabras se guardan solo en este dispositivo y navegador. Nada se envía a ningún servidor salvo las palabras que buscas en el Wikcionario.">
        <button className={`${claseBoton.secundario} text-acento`} onClick={borrar} disabled={total === 0}>
          Borrar todas las palabras
        </button>
      </Seccion>

      <p className="px-1 pt-2 text-center text-xs text-tinta-suave">
        Superútil · Definiciones del{" "}
        <a className="underline" href="https://es.wiktionary.org" target="_blank" rel="noreferrer">Wikcionario</a>{" "}
        (<a className="underline" href="https://creativecommons.org/licenses/by-sa/4.0/deed.es" target="_blank" rel="noreferrer">CC BY-SA 4.0</a>)
        · Enlaces a la RAE para la definición oficial.
      </p>
    </div>
  );
}
