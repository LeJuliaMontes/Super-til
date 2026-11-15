// Cliente del Wikcionario en español. Gratuito, sin clave y con CORS abierto,
// así que se consulta directamente desde el navegador.
import type { Definicion } from "../tipos";
import { analizarEntrada, soloFormasFlexivas, type EntradaAnalizada } from "./wikitexto";

const API = "https://es.wiktionary.org/w/api.php";
/** La API de MediaWiki admite hasta 50 títulos por petición. */
export const TITULOS_POR_PETICION = 50;
const AGENTE = "Superutil/1.0 (aplicacion web de vocabulario personal)";

export class ErrorDiccionario extends Error {}

type Fetch = typeof fetch;

export const urlWikcionario = (titulo: string) =>
  `https://es.wiktionary.org/wiki/${encodeURIComponent(titulo.replace(/ /g, "_"))}`;

export const urlRAE = (termino: string) => `https://dle.rae.es/${encodeURIComponent(termino)}`;

async function pedir(params: Record<string, string>, f: Fetch): Promise<unknown> {
  const url = `${API}?${new URLSearchParams({ format: "json", formatversion: "2", origin: "*", ...params })}`;
  for (let intento = 0; intento < 3; intento++) {
    let respuesta: Response;
    try {
      respuesta = await f(url, { headers: { "Api-User-Agent": AGENTE } });
    } catch {
      throw new ErrorDiccionario("No se pudo conectar con el Wikcionario. Comprueba tu conexión a internet.");
    }
    if (respuesta.ok) return respuesta.json();
    if (respuesta.status === 429 || respuesta.status >= 500) {
      const espera = Number(respuesta.headers.get("retry-after")) || 2 ** intento * 1.5;
      await new Promise((r) => setTimeout(r, Math.min(espera, 10) * 1000));
      continue;
    }
    throw new ErrorDiccionario(`El Wikcionario respondió con un error (${respuesta.status}).`);
  }
  throw new ErrorDiccionario("El Wikcionario está muy ocupado ahora mismo. Vuelve a intentarlo en un minuto.");
}

interface RespuestaQuery {
  query?: {
    normalized?: { from: string; to: string }[];
    redirects?: { from: string; to: string }[];
    pages?: { title: string; missing?: boolean; invalid?: boolean; revisions?: { slots: { main: { content: string } } }[] }[];
  };
}

/** Descarga el wikitexto de varias páginas. Devuelve título pedido -> {título final, wikitexto}. */
export async function descargarPaginas(
  titulos: string[],
  f: Fetch = fetch,
): Promise<Map<string, { titulo: string; wikitexto: string } | null>> {
  const resultado = new Map<string, { titulo: string; wikitexto: string } | null>();
  for (let i = 0; i < titulos.length; i += TITULOS_POR_PETICION) {
    const grupo = titulos.slice(i, i + TITULOS_POR_PETICION);
    const datos = (await pedir(
      {
        action: "query",
        prop: "revisions",
        rvprop: "content",
        rvslots: "main",
        redirects: "1",
        titles: grupo.join("|"),
      },
      f,
    )) as RespuestaQuery;

    const destino = new Map<string, string>();
    for (const n of datos.query?.normalized ?? []) destino.set(n.from, n.to);
    for (const r of datos.query?.redirects ?? []) destino.set(r.from, r.to);
    const resolver = (t: string) => {
      let actual = t;
      for (let saltos = 0; saltos < 5 && destino.has(actual); saltos++) actual = destino.get(actual)!;
      return actual;
    };
    const paginas = new Map((datos.query?.pages ?? []).map((p) => [p.title, p]));
    for (const t of grupo) {
      const pagina = paginas.get(resolver(t));
      const wikitexto = pagina?.revisions?.[0]?.slots.main.content;
      resultado.set(t, pagina && wikitexto ? { titulo: pagina.title, wikitexto } : null);
    }
  }
  return resultado;
}

/** Sugerencias para palabras mal escritas (búsqueda aproximada). */
export async function sugerir(termino: string, f: Fetch = fetch): Promise<string[]> {
  try {
    const datos = (await pedir(
      { action: "opensearch", search: termino, limit: "5", namespace: "0", profile: "fuzzy" },
      f,
    )) as [string, string[]];
    const vistos = new Set<string>();
    return (datos[1] ?? []).filter((s) => {
      const clave = s.toLocaleLowerCase("es");
      if (clave === termino.toLocaleLowerCase("es") || vistos.has(clave)) return false;
      vistos.add(clave);
      return true;
    });
  } catch {
    return [];
  }
}

const primeraMayuscula = (s: string) => s.charAt(0).toLocaleUpperCase("es") + s.slice(1);

/**
 * Busca los significados de un lote de palabras.
 * 1. Pide todas las páginas de golpe (de 50 en 50).
 * 2. Si una palabra es solo una forma flexiva ("comía"), pide también su lema ("comer").
 * 3. Si no aparece, prueba con mayúscula inicial y, si sigue sin aparecer, busca sugerencias.
 */
export async function buscarDefiniciones(
  terminos: string[],
  opciones: { fetch?: Fetch; alProgresar?: (texto: string) => void } = {},
): Promise<Map<string, Definicion>> {
  const f = opciones.fetch ?? ((...args: Parameters<Fetch>) => fetch(...args));
  const avisar = opciones.alProgresar ?? (() => {});
  const unicos = [...new Set(terminos)];
  const ahora = new Date().toISOString();

  avisar(`Buscando ${unicos.length} ${unicos.length === 1 ? "palabra" : "palabras"} en el Wikcionario…`);
  const paginas = await descargarPaginas(unicos, f);

  const analizadas = new Map<string, { titulo: string; entrada: EntradaAnalizada }>();
  for (const [termino, pagina] of paginas) {
    if (!pagina) continue;
    const entrada = analizarEntrada(pagina.wikitexto, pagina.titulo);
    if (entrada.tieneEspanol && entrada.acepciones.length > 0) analizadas.set(termino, { titulo: pagina.titulo, entrada });
  }

  // Segunda ronda: lemas de formas flexivas y variantes con mayúscula.
  const lemaDe = new Map<string, { lema: string; descripcion: string }>();
  const extra = new Set<string>();
  for (const termino of unicos) {
    const a = analizadas.get(termino);
    if (a && soloFormasFlexivas(a.entrada)) {
      const forma = a.entrada.formasDe[0];
      lemaDe.set(termino, forma);
      extra.add(forma.lema);
    } else if (!a) {
      const mayus = primeraMayuscula(termino);
      if (mayus !== termino) extra.add(mayus);
    }
  }
  const paginasExtra = extra.size > 0 ? await descargarPaginas([...extra], f) : new Map();
  const analizarExtra = (t: string) => {
    const p = paginasExtra.get(t);
    if (!p) return null;
    const entrada = analizarEntrada(p.wikitexto, p.titulo);
    return entrada.tieneEspanol && entrada.acepciones.length > 0 ? { titulo: p.titulo as string, entrada } : null;
  };

  const resultado = new Map<string, Definicion>();
  const sinEncontrar: string[] = [];
  for (const termino of unicos) {
    let encontrado = analizadas.get(termino) ?? null;
    let formaDe: Definicion["formaDe"];

    const forma = lemaDe.get(termino);
    if (forma) {
      const deLema = analizarExtra(forma.lema);
      if (deLema) {
        encontrado = deLema;
        formaDe = forma;
      }
    }
    if (!encontrado) encontrado = analizarExtra(primeraMayuscula(termino));

    if (!encontrado) {
      sinEncontrar.push(termino);
      continue;
    }
    resultado.set(termino, {
      encontrada: true,
      lema: encontrado.titulo,
      formaDe,
      acepciones: encontrado.entrada.acepciones,
      etimologia: encontrado.entrada.etimologia,
      sugerencias: [],
      url: urlWikcionario(encontrado.titulo),
      consultadaEn: ahora,
    });
  }

  if (sinEncontrar.length > 0) avisar("Buscando sugerencias para las que no aparecen…");
  for (const termino of sinEncontrar) {
    resultado.set(termino, {
      encontrada: false,
      lema: termino,
      acepciones: [],
      sugerencias: await sugerir(termino, f),
      url: urlWikcionario(termino),
      consultadaEn: ahora,
    });
  }
  return resultado;
}
