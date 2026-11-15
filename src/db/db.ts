import Dexie, { type Table } from "dexie";
import type { Lote, Palabra } from "../tipos";

export interface Ajuste {
  clave: string;
  valor: unknown;
}

export class BaseDeDatos extends Dexie {
  palabras!: Table<Palabra, string>;
  lotes!: Table<Lote, string>;
  ajustes!: Table<Ajuste, string>;

  constructor(nombre = "superutil") {
    super(nombre);
    this.version(1).stores({
      palabras: "id, &termino, estado, creadaEn, loteId",
      lotes: "id, fecha",
      ajustes: "clave",
    });
  }
}

export const db = new BaseDeDatos();
