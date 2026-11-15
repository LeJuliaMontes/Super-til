import { NavLink } from "react-router-dom";
import { useContadores } from "../hooks/datos";
import { IconoAjustes, IconoBandeja, IconoLapiz, IconoLibro, IconoTarjetas } from "./Iconos";

const enlaces = [
  { a: "/", texto: "Apuntar", Icono: IconoLapiz, fin: true },
  { a: "/pendientes", texto: "Pendientes", Icono: IconoBandeja },
  { a: "/repaso", texto: "Repaso", Icono: IconoTarjetas },
  { a: "/historial", texto: "Mis palabras", Icono: IconoLibro },
  { a: "/ajustes", texto: "Ajustes", Icono: IconoAjustes },
];

export function Navegacion() {
  const { pendientes, porAprender } = useContadores();
  const insignia: Record<string, number> = { "/pendientes": pendientes, "/repaso": porAprender };

  return (
    <nav
      aria-label="Principal"
      className="fixed inset-x-0 bottom-0 z-40 border-t border-borde bg-superficie/95 pb-[env(safe-area-inset-bottom)] backdrop-blur md:static md:border-0 md:bg-transparent md:pb-0 md:backdrop-blur-none"
    >
      <ul className="mx-auto flex max-w-2xl justify-around md:mx-0 md:max-w-none md:justify-end md:gap-1">
        {enlaces.map(({ a, texto, Icono, fin }) => (
          <li key={a} className="flex-1 md:flex-none">
            <NavLink
              to={a}
              end={fin}
              className={({ isActive }) =>
                `relative flex flex-col items-center gap-0.5 px-1 py-2 text-[11px] font-medium transition-colors md:flex-row md:gap-2 md:rounded-full md:px-3 md:py-1.5 md:text-sm ${
                  isActive ? "text-acento md:bg-acento-suave" : "text-tinta-suave hover:text-tinta"
                }`
              }
            >
              <span className="relative">
                <Icono />
                {insignia[a] > 0 && (
                  <span className="absolute -right-2.5 -top-1.5 min-w-[1.15rem] rounded-full bg-acento px-1 text-center text-[10px] font-bold leading-[1.15rem] text-acento-tinta md:hidden">
                    {insignia[a] > 99 ? "99+" : insignia[a]}
                  </span>
                )}
              </span>
              <span>{texto}</span>
              {insignia[a] > 0 && (
                <span className="hidden rounded-full bg-acento px-1.5 text-[11px] font-bold text-acento-tinta md:inline">{insignia[a]}</span>
              )}
            </NavLink>
          </li>
        ))}
      </ul>
    </nav>
  );
}
