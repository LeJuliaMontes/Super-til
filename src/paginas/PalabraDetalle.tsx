import { useLiveQuery } from "dexie-react-hooks";
import { Link, useNavigate, useParams } from "react-router-dom";
import { db } from "../db/db";
import { claseBoton, Vacio } from "../componentes/Comunes";
import { FichaPalabra } from "../componentes/FichaPalabra";

export default function PalabraDetalle() {
  const { id = "" } = useParams();
  const navegar = useNavigate();
  const palabra = useLiveQuery(async () => (await db.palabras.get(id)) ?? null, [id]);

  if (palabra === undefined) return null;
  if (palabra === null) {
    return (
      <Vacio titulo="Esta palabra ya no está">
        <Link to="/historial" className="underline underline-offset-2">Volver a mis palabras</Link>
      </Vacio>
    );
  }
  return (
    <div>
      <button className={`${claseBoton.fantasma} -ml-2.5 mb-3`} onClick={() => navegar(-1)}>
        ← Volver
      </button>
      <FichaPalabra palabra={palabra} />
      {palabra.loteId && (
        <p className="mt-4 text-center text-sm text-tinta-suave">
          <Link to={`/lotes/${palabra.loteId}`} className="underline underline-offset-2">Ver el lote en el que se buscó</Link>
        </p>
      )}
    </div>
  );
}
