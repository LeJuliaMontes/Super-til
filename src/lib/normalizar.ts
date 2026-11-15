export const MAX_TERMINO = 60;

/** Signos que suelen colarse al copiar una palabra de un texto. */
const BORDES = /^[\s¿?¡!.,;:…"'“”‘’«»()[\]{}—–-]+|[\s¿?¡!.,;:…"'“”‘’«»()[\]{}—–-]+$/gu;

/** "  ¿Procaz?  " -> "procaz". Devuelve "" si no queda nada útil. */
export function normalizarTermino(texto: string): string {
  return texto
    .normalize("NFC")
    .replace(BORDES, "")
    .replace(/\s+/g, " ")
    .trim()
    .toLocaleLowerCase("es")
    .slice(0, MAX_TERMINO)
    .trim();
}

/** Contenido compartido desde otra app: ¿es una palabra o una frase? */
export function interpretarCompartido(texto: string): { termino: string; frase: string } {
  const limpio = texto.replace(/\s+/g, " ").trim();
  if (!limpio) return { termino: "", frase: "" };
  const palabras = limpio.split(" ");
  if (palabras.length <= 4 && limpio.length <= MAX_TERMINO) return { termino: normalizarTermino(limpio), frase: "" };
  return { termino: "", frase: limpio.slice(0, 500) };
}

/** Parte una frase en trozos para resaltar el término dentro de ella. */
export function resaltar(frase: string, termino: string): { texto: string; marcado: boolean }[] {
  if (!termino) return [{ texto: frase, marcado: false }];
  const sinTildes = (s: string) => s.normalize("NFD").replace(/\p{M}/gu, "").toLocaleLowerCase("es");
  const base = sinTildes(frase);
  const buscado = sinTildes(termino);
  // Las tildes se quitan carácter a carácter, así que los índices coinciden si la frase está en NFC.
  if (base.length !== frase.length) return [{ texto: frase, marcado: false }];
  const trozos: { texto: string; marcado: boolean }[] = [];
  let desde = 0;
  let i = base.indexOf(buscado);
  while (i !== -1 && buscado) {
    if (i > desde) trozos.push({ texto: frase.slice(desde, i), marcado: false });
    trozos.push({ texto: frase.slice(i, i + buscado.length), marcado: true });
    desde = i + buscado.length;
    i = base.indexOf(buscado, desde);
  }
  if (desde < frase.length) trozos.push({ texto: frase.slice(desde), marcado: false });
  return trozos;
}
