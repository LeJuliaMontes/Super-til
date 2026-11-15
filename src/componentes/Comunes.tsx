import type { ReactNode } from "react";
import { resaltar } from "../lib/normalizar";
import { useConexion } from "../hooks/datos";
import { useResolver } from "../hooks/useResolver";
import { IconoChispa } from "./Iconos";

export function Titulo({ children, sub }: { children: ReactNode; sub?: ReactNode }) {
  return (
    <header className="mb-5">
      <h1 className="font-serif text-3xl font-semibold tracking-tight">{children}</h1>
      {sub && <p className="mt-1 text-tinta-suave">{sub}</p>}
    </header>
  );
}

export function Vacio({ titulo, children }: { titulo: string; children?: ReactNode }) {
  return (
    <div className="rounded-2xl border border-dashed border-borde px-6 py-10 text-center">
      <p className="font-serif text-xl">{titulo}</p>
      {children && <div className="mt-2 text-tinta-suave">{children}</div>}
    </div>
  );
}

/** Una frase con el término resaltado. */
export function Frase({ frase, termino, fuente }: { frase?: string; termino: string; fuente?: string }) {
  if (!frase && !fuente) return null;
  return (
    <figure className="border-l-2 border-acento/50 pl-3 text-[15px]">
      {frase && (
        <blockquote className="font-serif italic text-tinta">
          «
          {resaltar(frase, termino).map((t, i) =>
            t.marcado ? (
              <mark key={i} className="rounded-sm bg-acento-suave px-0.5 not-italic font-semibold text-tinta">
                {t.texto}
              </mark>
            ) : (
              <span key={i}>{t.texto}</span>
            ),
          )}
          »
        </blockquote>
      )}
      {fuente && <figcaption className="mt-0.5 text-xs text-tinta-suave">— {fuente}</figcaption>}
    </figure>
  );
}

export const claseBoton = {
  primario:
    "inline-flex items-center justify-center gap-2 rounded-xl bg-acento px-5 py-3 font-semibold text-acento-tinta shadow-sm transition hover:brightness-110 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50 disabled:active:scale-100",
  secundario:
    "inline-flex items-center justify-center gap-2 rounded-xl border border-borde bg-superficie px-4 py-2.5 font-medium text-tinta transition hover:bg-superficie-2 active:scale-[0.98] disabled:opacity-50",
  fantasma:
    "inline-flex items-center justify-center gap-1.5 rounded-lg px-2.5 py-1.5 text-sm font-medium text-tinta-suave transition hover:bg-superficie-2 hover:text-tinta",
};

export const claseCampo =
  "w-full rounded-xl border border-borde bg-superficie px-4 py-3 text-tinta placeholder:text-tinta-suave/70 focus:border-acento focus:outline-none focus:ring-2 focus:ring-acento/25";

/** El botón principal de la app: "Dame los significados (N)". */
export function BotonResolver({ cantidad, className = "" }: { cantidad: number; className?: string }) {
  const { resolver, progreso, ocupado } = useResolver();
  const enLinea = useConexion();
  const desactivado = cantidad === 0 || ocupado || !enLinea;

  return (
    <div className={className}>
      <button className={`${claseBoton.primario} w-full text-lg`} onClick={resolver} disabled={desactivado}>
        {ocupado ? (
          <span className="inline-block size-5 animate-spin rounded-full border-2 border-current border-t-transparent" aria-hidden />
        ) : (
          <IconoChispa />
        )}
        {ocupado ? "Buscando…" : `Dame los significados${cantidad > 0 ? ` (${cantidad})` : ""}`}
      </button>
      <p className="mt-2 min-h-5 text-center text-sm text-tinta-suave" aria-live="polite">
        {progreso ??
          (!enLinea
            ? "Sin conexión. Puedes seguir apuntando; busca los significados cuando vuelvas a tener internet."
            : "")}
      </p>
    </div>
  );
}
