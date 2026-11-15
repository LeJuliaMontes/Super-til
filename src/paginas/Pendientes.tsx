import { useState } from "react";
import { Link } from "react-router-dom";
import type { Palabra } from "../tipos";
import { borrarPalabra, editarPalabra, restaurarPalabra } from "../db/operaciones";
import { usePendientes, useSinResultado } from "../hooks/datos";
import { useAvisos } from "../componentes/Avisos";
import { BotonResolver, claseBoton, claseCampo, Frase, Titulo, Vacio } from "../componentes/Comunes";
import { FichaPalabra } from "../componentes/FichaPalabra";
import { IconoLapiz, IconoPapelera } from "../componentes/Iconos";

function FilaPendiente({ palabra }: { palabra: Palabra }) {
  const [editando, setEditando] = useState(false);
  const [termino, setTermino] = useState(palabra.termino);
  const [frase, setFrase] = useState(palabra.contextos[0]?.frase ?? "");
  const [fuente, setFuente] = useState(palabra.contextos[0]?.fuente ?? "");
  const avisar = useAvisos();

  const guardar = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const [primero, ...resto] = palabra.contextos;
      const editado = { ...(primero ?? { fecha: new Date().toISOString() }), frase: frase.trim() || undefined, fuente: fuente.trim() || undefined };
      await editarPalabra(palabra.id, { termino, contextos: [editado, ...resto] });
      setEditando(false);
    } catch (error) {
      avisar(error instanceof Error ? error.message : "No se pudo guardar.", { tipo: "error" });
    }
  };

  const borrar = async () => {
    await borrarPalabra(palabra.id);
    avisar(`«${palabra.termino}» borrada.`, { accion: { texto: "Deshacer", alPulsar: () => restaurarPalabra(palabra) } });
  };

  if (editando) {
    return (
      <li className="aparecer rounded-2xl border border-acento/40 bg-superficie p-4">
        <form onSubmit={guardar} className="space-y-2">
          <label className="block text-sm font-medium text-tinta-suave">
            Palabra
            <input className={`${claseCampo} mt-1 font-serif text-lg`} value={termino} onChange={(e) => setTermino(e.target.value)} autoFocus />
          </label>
          <label className="block text-sm font-medium text-tinta-suave">
            Frase
            <textarea className={`${claseCampo} mt-1 min-h-16 font-serif`} value={frase} onChange={(e) => setFrase(e.target.value)} maxLength={500} />
          </label>
          <label className="block text-sm font-medium text-tinta-suave">
            Fuente
            <input className={`${claseCampo} mt-1`} value={fuente} onChange={(e) => setFuente(e.target.value)} maxLength={200} />
          </label>
          <div className="flex gap-2 pt-1">
            <button type="submit" className={`${claseBoton.primario} py-2`}>Guardar</button>
            <button type="button" className={claseBoton.secundario} onClick={() => setEditando(false)}>Cancelar</button>
          </div>
        </form>
      </li>
    );
  }

  return (
    <li className="group flex items-start gap-3 rounded-2xl border border-borde bg-superficie p-4">
      <div className="min-w-0 flex-1 space-y-1.5">
        <p className="font-serif text-xl">{palabra.termino}</p>
        {palabra.contextos.map((c, i) => (
          <Frase key={i} frase={c.frase} fuente={c.fuente} termino={palabra.termino} />
        ))}
      </div>
      <div className="flex shrink-0 gap-0.5">
        <button className={claseBoton.fantasma} onClick={() => setEditando(true)} aria-label={`Editar ${palabra.termino}`} title="Editar">
          <IconoLapiz width={18} height={18} />
        </button>
        <button className={claseBoton.fantasma} onClick={borrar} aria-label={`Borrar ${palabra.termino}`} title="Borrar">
          <IconoPapelera width={18} height={18} />
        </button>
      </div>
    </li>
  );
}

export default function Pendientes() {
  const pendientes = usePendientes();
  const sinResultado = useSinResultado();
  if (!pendientes || !sinResultado) return null;

  return (
    <div>
      <Titulo sub="Las palabras que has ido apuntando y aún no has mirado.">Pendientes</Titulo>

      {pendientes.length === 0 ? (
        <Vacio titulo="Nada pendiente">
          <Link to="/" className="underline underline-offset-2">Apunta una palabra</Link> cuando encuentres una que no conozcas.
        </Vacio>
      ) : (
        <>
          <BotonResolver cantidad={pendientes.length} className="mb-5" />
          <ul className="space-y-3">
            {pendientes.map((p) => (
              <FilaPendiente key={p.id} palabra={p} />
            ))}
          </ul>
        </>
      )}

      {sinResultado.length > 0 && (
        <section className="mt-10">
          <h2 className="mb-1 font-serif text-xl font-semibold">No encontradas</h2>
          <p className="mb-3 text-sm text-tinta-suave">Puede que estén mal escritas. Corrígelas y volverán a pendientes.</p>
          <div className="space-y-3">
            {sinResultado.map((p) => (
              <FichaPalabra key={p.id} palabra={p} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
