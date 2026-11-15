import { useEffect, useRef, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { useLiveQuery } from "dexie-react-hooks";
import { db } from "../db/db";
import { apuntarPalabra, guardarAjuste } from "../db/operaciones";
import { interpretarCompartido } from "../lib/normalizar";
import { acepcionPrincipal } from "../lib/exportar";
import { useAjustes, useContadores } from "../hooks/datos";
import { useAvisos } from "../componentes/Avisos";
import { BotonResolver, claseBoton, claseCampo } from "../componentes/Comunes";
import { IconoMas } from "../componentes/Iconos";
import type { Palabra } from "../tipos";

function UltimasApuntadas() {
  const ultimas = useLiveQuery(() => db.palabras.orderBy("creadaEn").reverse().limit(6).toArray(), []);
  if (!ultimas || ultimas.length === 0) return null;
  return (
    <section className="mt-8">
      <h2 className="mb-2 text-sm font-semibold uppercase tracking-wider text-tinta-suave">Últimas apuntadas</h2>
      <ul className="flex flex-wrap gap-2">
        {ultimas.map((p) => (
          <li key={p.id}>
            <Link
              to={p.estado === "pendiente" ? "/pendientes" : `/palabra/${p.id}`}
              className={`inline-block rounded-full border px-3 py-1 font-serif transition hover:border-acento ${
                p.estado === "pendiente" ? "border-dashed border-borde text-tinta-suave" : "border-borde bg-superficie"
              }`}
            >
              {p.termino}
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}

/** Si apuntas una palabra que ya tenías definida, te recuerda qué significa. */
function Recordatorio({ palabra, alCerrar }: { palabra: Palabra; alCerrar: () => void }) {
  const a = acepcionPrincipal(palabra);
  if (!a) return null;
  return (
    <div className="aparecer mt-4 rounded-2xl border border-acento/30 bg-acento-suave p-4">
      <p className="text-sm font-medium text-acento">¡Esta ya la tenías! Significa:</p>
      <p className="mt-1">
        <span className="font-serif font-semibold">{palabra.termino}</span> — {a.texto}
      </p>
      <div className="mt-2 flex gap-2">
        <Link to={`/palabra/${palabra.id}`} className={`${claseBoton.fantasma} -ml-2.5`}>Ver ficha completa</Link>
        <button className={claseBoton.fantasma} onClick={alCerrar}>Cerrar</button>
      </div>
    </div>
  );
}

export default function Apuntar() {
  const [params, setParams] = useSearchParams();
  const ajustes = useAjustes();
  const { pendientes } = useContadores();
  const avisar = useAvisos();

  const [termino, setTermino] = useState("");
  const [frase, setFrase] = useState("");
  const [fuente, setFuente] = useState("");
  const [conContexto, setConContexto] = useState(false);
  const [recordatorio, setRecordatorio] = useState<Palabra | null>(null);
  const campo = useRef<HTMLInputElement>(null);
  const fuenteCargada = useRef(false);

  // Recordar la última fuente (si estás leyendo un libro, no hay que repetirla).
  useEffect(() => {
    if (!fuenteCargada.current && ajustes.ultimaFuente) {
      setFuente(ajustes.ultimaFuente);
      fuenteCargada.current = true;
    }
  }, [ajustes.ultimaFuente]);

  // Contenido compartido desde otra app (Web Share Target).
  useEffect(() => {
    const texto = params.get("texto") ?? "";
    const titulo = params.get("titulo") ?? "";
    const enlace = params.get("enlace") ?? "";
    if (!texto && !titulo && !enlace) return;
    const compartido = interpretarCompartido(texto || (enlace ? "" : titulo));
    if (compartido.termino) setTermino(compartido.termino);
    if (compartido.frase) {
      setFrase(compartido.frase);
      setConContexto(true);
    }
    const origen = titulo && texto ? titulo : enlace ? new URL(enlace, location.href).hostname : "";
    if (origen) {
      setFuente(origen);
      setConContexto(true);
      fuenteCargada.current = true;
    }
    setParams({}, { replace: true });
    campo.current?.focus();
  }, [params, setParams]);

  const guardar = async (e: React.FormEvent) => {
    e.preventDefault();
    // Se toman los valores y se vacía el campo antes de guardar, para poder seguir
    // escribiendo la siguiente palabra sin que se borre al terminar esta.
    const entrada = { termino, frase: conContexto ? frase : "", fuente: conContexto ? fuente : "" };
    setTermino("");
    setFrase("");
    campo.current?.focus();
    const resultado = await apuntarPalabra(entrada);
    if (resultado.tipo === "vacia") return;
    if (conContexto && entrada.fuente.trim() !== ajustes.ultimaFuente) await guardarAjuste("ultimaFuente", entrada.fuente.trim());

    const p = resultado.palabra;
    if (resultado.tipo === "nueva") {
      avisar(`«${p.termino}» apuntada.`, { tipo: "exito" });
      setRecordatorio(null);
    } else if (p.definicion?.encontrada) {
      setRecordatorio(p);
      if (resultado.estadoAnterior === "aprendida") avisar("La habías dado por aprendida: vuelve al repaso.");
    } else {
      avisar(`«${p.termino}» ya estaba apuntada${entrada.frase.trim() ? "; he añadido la nueva frase" : ""}.`);
      setRecordatorio(null);
    }
  };

  const llegoAlUmbral = ajustes.umbral > 0 && pendientes >= ajustes.umbral;

  return (
    <div>
      <header className="mb-6">
        <h1 className="font-serif text-4xl font-semibold tracking-tight">Superútil</h1>
        <p className="mt-1 text-tinta-suave">Apunta la palabra y sigue leyendo. Ya las miraremos luego.</p>
      </header>

      <form onSubmit={guardar} className="space-y-3">
        <label htmlFor="termino" className="sr-only">Palabra que no conoces</label>
        <div className="flex gap-2">
          <input
            id="termino"
            ref={campo}
            className={`${claseCampo} font-serif text-xl`}
            placeholder="¿Qué palabra no conoces?"
            value={termino}
            onChange={(e) => setTermino(e.target.value)}
            autoFocus
            autoComplete="off"
            autoCapitalize="none"
            spellCheck={false}
            enterKeyHint="done"
            maxLength={80}
          />
          <button type="submit" className={`${claseBoton.primario} px-4`} disabled={!termino.trim()} aria-label="Apuntar">
            <IconoMas />
            <span className="hidden sm:inline">Apuntar</span>
          </button>
        </div>

        {conContexto ? (
          <div className="aparecer space-y-2 rounded-2xl border border-borde bg-superficie-2/60 p-3">
            <div>
              <label htmlFor="frase" className="mb-1 block text-sm font-medium text-tinta-suave">Frase donde la has visto</label>
              <textarea
                id="frase"
                className={`${claseCampo} min-h-20 resize-y font-serif`}
                placeholder="Le soltó un comentario procaz delante de todos."
                value={frase}
                onChange={(e) => setFrase(e.target.value)}
                maxLength={500}
              />
            </div>
            <div>
              <label htmlFor="fuente" className="mb-1 block text-sm font-medium text-tinta-suave">Fuente</label>
              <input
                id="fuente"
                className={claseCampo}
                placeholder="Libro, artículo, serie…"
                value={fuente}
                onChange={(e) => setFuente(e.target.value)}
                maxLength={200}
              />
            </div>
            <button type="button" className={claseBoton.fantasma} onClick={() => setConContexto(false)}>
              Ocultar frase y fuente
            </button>
          </div>
        ) : (
          <button type="button" className={`${claseBoton.fantasma} -ml-2.5`} onClick={() => setConContexto(true)}>
            <IconoMas width={16} height={16} /> Añadir la frase donde la viste
          </button>
        )}
      </form>

      {recordatorio && <Recordatorio palabra={recordatorio} alCerrar={() => setRecordatorio(null)} />}

      <section
        className={`mt-8 rounded-2xl border p-5 ${llegoAlUmbral ? "border-acento/40 bg-acento-suave" : "border-borde bg-superficie"}`}
      >
        <p className="font-serif text-lg">
          {pendientes === 0
            ? "No tienes palabras pendientes."
            : llegoAlUmbral
              ? `¡Ya tienes ${pendientes} palabras! Buen momento para ver qué significan.`
              : `Tienes ${pendientes} ${pendientes === 1 ? "palabra pendiente" : "palabras pendientes"}.`}
        </p>
        {pendientes > 0 && (
          <Link to="/pendientes" className="text-sm text-tinta-suave underline underline-offset-2 hover:text-tinta">
            Revisar la lista
          </Link>
        )}
        <BotonResolver cantidad={pendientes} className="mt-4" />
      </section>

      <UltimasApuntadas />
    </div>
  );
}
