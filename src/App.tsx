import { lazy, Suspense } from "react";
import { BrowserRouter, Link, Route, Routes } from "react-router-dom";
import { ProveedorAvisos } from "./componentes/Avisos";
import { Navegacion } from "./componentes/Navegacion";
import { Vacio } from "./componentes/Comunes";
import Apuntar from "./paginas/Apuntar";

const Pendientes = lazy(() => import("./paginas/Pendientes"));
const Lote = lazy(() => import("./paginas/Lote"));
const Historial = lazy(() => import("./paginas/Historial"));
const PalabraDetalle = lazy(() => import("./paginas/PalabraDetalle"));
const Repaso = lazy(() => import("./paginas/Repaso"));
const Ajustes = lazy(() => import("./paginas/Ajustes"));

export default function App() {
  return (
    <BrowserRouter>
      <ProveedorAvisos>
        <div className="mx-auto hidden max-w-5xl items-center justify-between gap-6 px-6 py-4 md:flex">
          <Link to="/" className="shrink-0 font-serif text-xl font-semibold">
            Super<span className="text-acento">ú</span>til
          </Link>
          <Navegacion />
        </div>
        <div className="mx-auto flex min-h-dvh max-w-2xl flex-col px-4 md:min-h-0 md:px-6">
          <main className="flex-1 pb-[calc(6rem+env(safe-area-inset-bottom))] pt-6 md:pb-12 md:pt-4">
            <Suspense fallback={null}>
              <Routes>
                <Route path="/" element={<Apuntar />} />
                <Route path="/pendientes" element={<Pendientes />} />
                <Route path="/lotes/:id" element={<Lote />} />
                <Route path="/historial" element={<Historial />} />
                <Route path="/palabra/:id" element={<PalabraDetalle />} />
                <Route path="/repaso" element={<Repaso />} />
                <Route path="/ajustes" element={<Ajustes />} />
                <Route path="*" element={<Vacio titulo="Página no encontrada"><Link to="/" className="underline">Volver al inicio</Link></Vacio>} />
              </Routes>
            </Suspense>
          </main>
          <div className="md:hidden">
            <Navegacion />
          </div>
        </div>
      </ProveedorAvisos>
    </BrowserRouter>
  );
}
