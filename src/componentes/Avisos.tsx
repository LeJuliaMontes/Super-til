import { createContext, useCallback, useContext, useRef, useState, type ReactNode } from "react";

interface Aviso {
  id: number;
  texto: string;
  tipo: "info" | "exito" | "error";
  accion?: { texto: string; alPulsar: () => void };
}

type Mostrar = (texto: string, opciones?: { tipo?: Aviso["tipo"]; accion?: Aviso["accion"]; duracion?: number }) => void;

const ContextoAvisos = createContext<Mostrar>(() => {});

export const useAvisos = () => useContext(ContextoAvisos);

export function ProveedorAvisos({ children }: { children: ReactNode }) {
  const [avisos, setAvisos] = useState<Aviso[]>([]);
  const siguiente = useRef(1);

  const quitar = useCallback((id: number) => setAvisos((a) => a.filter((x) => x.id !== id)), []);

  const mostrar = useCallback<Mostrar>(
    (texto, opciones = {}) => {
      const id = siguiente.current++;
      setAvisos((a) => [...a.slice(-2), { id, texto, tipo: opciones.tipo ?? "info", accion: opciones.accion }]);
      setTimeout(() => quitar(id), opciones.duracion ?? (opciones.accion ? 6000 : 3500));
    },
    [quitar],
  );

  const estilos: Record<Aviso["tipo"], string> = {
    info: "bg-tinta text-fondo",
    exito: "bg-tinta text-fondo",
    error: "bg-acento text-acento-tinta",
  };

  return (
    <ContextoAvisos.Provider value={mostrar}>
      {children}
      <div
        className="pointer-events-none fixed inset-x-0 bottom-[calc(5.5rem+env(safe-area-inset-bottom))] z-50 flex flex-col items-center gap-2 px-4 md:bottom-6"
        aria-live="polite"
      >
        {avisos.map((a) => (
          <div
            key={a.id}
            role="status"
            className={`aparecer pointer-events-auto flex max-w-md items-center gap-3 rounded-xl px-4 py-3 text-sm shadow-lg ${estilos[a.tipo]}`}
          >
            <span>{a.texto}</span>
            {a.accion && (
              <button
                className="ml-auto shrink-0 font-semibold underline underline-offset-2"
                onClick={() => {
                  a.accion!.alPulsar();
                  quitar(a.id);
                }}
              >
                {a.accion.texto}
              </button>
            )}
          </div>
        ))}
      </div>
    </ContextoAvisos.Provider>
  );
}
