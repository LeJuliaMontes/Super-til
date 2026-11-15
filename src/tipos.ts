export type Estado = "pendiente" | "sin-resultado" | "definida" | "aprendida";

export interface Contexto {
  frase?: string;
  fuente?: string;
  fecha: string;
}

export interface Acepcion {
  numero: number;
  categoria: string;
  texto: string;
  etiquetas: string[];
  sinonimos: string[];
  ejemplo?: string;
}

export interface Definicion {
  encontrada: boolean;
  /** Página del Wikcionario de la que salen las acepciones. */
  lema: string;
  /** Si la palabra apuntada es una forma flexiva (plural, conjugación...). */
  formaDe?: { lema: string; descripcion: string };
  acepciones: Acepcion[];
  etimologia?: string;
  /** Posibles correcciones si no se encontró. */
  sugerencias: string[];
  url: string;
  consultadaEn: string;
}

export interface Palabra {
  id: string;
  termino: string;
  contextos: Contexto[];
  estado: Estado;
  creadaEn: string;
  actualizadaEn: string;
  loteId?: string;
  definicion?: Definicion;
  /** Número de la acepción que la persona marcó como la de su frase. */
  acepcionElegida?: number;
  aprendidaEn?: string;
}

export interface Lote {
  id: string;
  fecha: string;
  palabraIds: string[];
}
