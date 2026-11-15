// Analizador del wikitexto del Wikcionario en español (es.wiktionary.org).
// Extrae solo la sección de español y la convierte en acepciones legibles.
import type { Acepcion } from "../tipos";

export interface EntradaAnalizada {
  tieneEspanol: boolean;
  acepciones: Acepcion[];
  etimologia?: string;
  /** Lemas de los que esta palabra es forma flexiva (p. ej. "comía" -> "comer"). */
  formasDe: { lema: string; descripcion: string }[];
}

export const MAX_ACEPCIONES = 15;
const MAX_EJEMPLO = 220;

const IDIOMAS: Record<string, string> = {
  la: "latín",
  "la-vul": "latín vulgar",
  "la-lat": "latín tardío",
  "la-med": "latín medieval",
  grc: "griego antiguo",
  el: "griego",
  fro: "francés antiguo",
  fr: "francés",
  en: "inglés",
  it: "italiano",
  pt: "portugués",
  ca: "catalán",
  gl: "gallego",
  oc: "occitano",
  de: "alemán",
  nl: "neerlandés",
  ar: "árabe",
  xaa: "árabe hispánico",
  osp: "castellano antiguo",
  nah: "náhuatl",
  qu: "quechua",
  gn: "guaraní",
  eu: "euskera",
  "gem-pro": "protogermánico",
  got: "gótico",
  he: "hebreo",
  ja: "japonés",
  tr: "turco",
  fa: "persa",
};

/** Secciones bajo las que nunca hay acepciones. */
const SECCIONES_IGNORADAS = /^(etimología|traducciones|locuciones|refranes|conjugación|véase también|información adicional|referencias|pronunciación|descendientes|derivados|compuestos)/i;

const primeraMayuscula = (s: string) => (s ? s.charAt(0).toLocaleUpperCase("es") + s.slice(1) : s);

interface Plantilla {
  nombre: string;
  pos: string[];
  nombrados: Record<string, string>;
}

/** Divide "a|b|x=y" en argumentos posicionales y nombrados. */
function leerPlantilla(contenido: string): Plantilla {
  const partes = contenido.split("|");
  const nombre = (partes.shift() ?? "").trim();
  const pos: string[] = [];
  const nombrados: Record<string, string> = {};
  for (const parte of partes) {
    const m = /^\s*([\p{L}\p{N}_ -]+?)\s*=(.*)$/su.exec(parte);
    if (m) nombrados[m[1].trim()] = m[2].trim();
    else pos.push(parte.trim());
  }
  return { nombre, pos, nombrados };
}

function describirForma(p: Plantilla): { lema: string; descripcion: string } | null {
  const lema = p.pos[0];
  if (!lema) return null;
  const tipo = p.nombre.slice("forma ".length).trim().toLowerCase();
  if (tipo.startsWith("verbo")) return { lema, descripcion: `Forma del verbo «${lema}»` };

  const valores = [...p.pos.slice(1), ...Object.values(p.nombrados)].map((v) => v.toLowerCase());
  const genero = valores.includes("femenino") ? "femenino" : valores.includes("masculino") ? "masculino" : "";
  const numero = valores.includes("plural") ? "plural" : "";
  const rasgos = [genero, numero].filter(Boolean).join(" ");
  if (rasgos) return { lema, descripcion: `${primeraMayuscula(rasgos)} de «${lema}»` };
  return { lema, descripcion: `Forma de «${lema}»` };
}

/** Texto que sustituye a cada plantilla dentro de una definición o ejemplo. */
function renderizarPlantilla(p: Plantilla, titulo: string): string {
  const n = p.nombre.toLowerCase();
  if (n === "plm" || n === "ucf") return primeraMayuscula(p.pos[0] || titulo);
  if (n === "impropia" || n === "nombre científico" || n === "e") return p.pos[0] ?? "";
  if (n === "l" || n === "l+" || n === "l-" || n === "l*") return p.nombrados.alt || p.pos[1] || p.pos[0] || "";
  if (n === "sustantivo de verbo") return p.pos[0] ? `Acción o efecto de ${p.pos[0]}` : "";
  if (n === "sustantivo de adjetivo") return p.pos[0] ? `Cualidad de ${p.pos[0]}` : "";
  if (n === "adjetivo de sustantivo") return p.pos[0] ? `Perteneciente o relativo a ${p.pos[0]}` : "";
  if (n === "participio") return p.pos[0] ? `Participio de «${p.pos[0]}»` : "";
  if (n.startsWith("forma ")) return describirForma(p)?.descripcion ?? "";
  return "";
}

/** Convierte un trozo de wikitexto en texto plano. */
export function limpiar(texto: string, titulo: string): string {
  let t = texto
    .replace(/<!--[\s\S]*?-->/g, "")
    .replace(/<ref[^>]*\/>/gi, "")
    .replace(/<ref[^>]*>[\s\S]*?<\/ref>/gi, "")
    .replace(/<br\s*\/?>/gi, " ")
    .replace(/<[^>]+>/g, "")
    // Enlaces a archivos y categorías: fuera.
    .replace(/\[\[(?:Archivo|File|Imagen|Image|Categoría|Category):[^\]]*(?:\[\[[^\]]*\]\][^\]]*)*\]\]/gi, "")
    // [[destino|texto]] -> texto ; [[destino]] -> destino
    .replace(/\[\[[^\]|]*\|([^\]]*)\]\]/g, "$1")
    .replace(/\[\[([^\]]*)\]\]/g, "$1")
    // Enlaces externos [http://... texto]
    .replace(/\[https?:\/\/\S+\s*([^\]]*)\]/g, "$1");

  // Plantillas, de dentro hacia fuera.
  const interior = /\{\{([^{}]*)\}\}/g;
  for (let i = 0; i < 10 && interior.test(t); i++) {
    t = t.replace(interior, (_m, contenido: string) => renderizarPlantilla(leerPlantilla(contenido), titulo));
  }

  return t
    .replace(/'{2,}/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/\s+/g, " ")
    .replace(/\s+([.,;:])/g, "$1")
    .trim();
}

/** Extrae las plantillas de primer nivel de una línea (sin anidar). */
function plantillasDeLinea(linea: string): Plantilla[] {
  const resultado: Plantilla[] = [];
  let profundidad = 0;
  let inicio = -1;
  for (let i = 0; i < linea.length - 1; i++) {
    if (linea[i] === "{" && linea[i + 1] === "{") {
      if (profundidad === 0) inicio = i + 2;
      profundidad++;
      i++;
    } else if (linea[i] === "}" && linea[i + 1] === "}") {
      profundidad--;
      i++;
      if (profundidad === 0 && inicio >= 0) {
        resultado.push(leerPlantillaConEnlaces(linea.slice(inicio, i - 1)));
        inicio = -1;
      }
    }
  }
  return resultado;
}

/** Como leerPlantilla, pero sin partir por los "|" de enlaces o plantillas internas. */
function leerPlantillaConEnlaces(contenido: string): Plantilla {
  const partes: string[] = [];
  let actual = "";
  let corchetes = 0;
  let llaves = 0;
  for (let i = 0; i < contenido.length; i++) {
    const c = contenido[i];
    const sig = contenido[i + 1];
    if (c === "[" && sig === "[") { corchetes++; actual += "[["; i++; continue; }
    if (c === "]" && sig === "]") { corchetes--; actual += "]]"; i++; continue; }
    if (c === "{" && sig === "{") { llaves++; actual += "{{"; i++; continue; }
    if (c === "}" && sig === "}") { llaves--; actual += "}}"; i++; continue; }
    if (c === "|" && corchetes === 0 && llaves === 0) { partes.push(actual); actual = ""; continue; }
    actual += c;
  }
  partes.push(actual);
  const nombre = (partes.shift() ?? "").trim();
  const pos: string[] = [];
  const nombrados: Record<string, string> = {};
  for (const parte of partes) {
    const m = /^\s*([\p{L}\p{N}_ -]+?)\s*=(.*)$/su.exec(parte);
    if (m && !m[1].includes("[")) nombrados[m[1].trim()] = m[2].trim();
    else pos.push(parte.trim());
  }
  return { nombre, pos, nombrados };
}

function seccionEspanol(wikitexto: string): string | null {
  const inicio = /^==\s*\{\{lengua\|es\}\}\s*==\s*$/m.exec(wikitexto);
  if (!inicio) return null;
  const resto = wikitexto.slice(inicio.index + inicio[0].length);
  const fin = /^==[^=]/m.exec(resto);
  return fin ? resto.slice(0, fin.index) : resto;
}

function textoEtimologia(p: Plantilla): string | undefined {
  const [codigo, palabra] = p.pos;
  if (!codigo) return undefined;
  if (codigo === "incierta") return "Etimología incierta.";
  const forma = p.nombrados.alt || palabra;
  if (codigo === "endo" || codigo === "derivación") return forma ? `Derivado de «${forma}».` : undefined;
  const idioma = IDIOMAS[codigo];
  if (idioma && forma) {
    const glosa = p.nombrados.glosa || p.pos[2];
    return `Del ${idioma} «${forma}»${glosa ? ` ('${glosa}')` : ""}.`;
  }
  return undefined;
}

export function analizarEntrada(wikitexto: string, titulo: string): EntradaAnalizada {
  const seccion = seccionEspanol(wikitexto);
  if (seccion === null) return { tieneEspanol: false, acepciones: [], formasDe: [] };

  const acepciones: Acepcion[] = [];
  const formasDe: { lema: string; descripcion: string }[] = [];
  let etimologia: string | undefined;
  let categoria = "";
  let ignorar = false;
  let actual: Acepcion | null = null;

  for (const lineaCruda of seccion.split("\n")) {
    const linea = lineaCruda.trim();
    if (!linea) continue;

    const encabezado = /^(={3,})\s*(.+?)\s*\1$/.exec(linea);
    if (encabezado) {
      actual = null;
      const textoEnc = encabezado[2];
      const plantilla = /^\{\{([^|}]+)(?:\|[^}]*)?\}\}$/.exec(textoEnc);
      const nombre = (plantilla ? plantilla[1] : textoEnc).trim();
      ignorar = SECCIONES_IGNORADAS.test(nombre);
      if (!ignorar) categoria = nombre.charAt(0).toLocaleLowerCase("es") + nombre.slice(1);
      continue;
    }
    // La etimología vive bajo su propio encabezado, que por lo demás se ignora.
    if (!etimologia && linea.startsWith("{{etimología")) {
      const p = plantillasDeLinea(linea)[0];
      if (p) etimologia = textoEtimologia(p);
      continue;
    }
    if (ignorar) continue;

    const sentido = /^;\s*(\d+)\s*([^:]*?):\s*(.*)$/.exec(linea);
    if (sentido) {
      const etiquetas: string[] = [];
      for (const p of plantillasDeLinea(sentido[2])) {
        if (p.nombre === "csem") etiquetas.push(...p.pos.filter(Boolean));
      }
      for (const p of plantillasDeLinea(sentido[3])) {
        const nombre = p.nombre.toLowerCase();
        if (nombre.startsWith("forma ") || nombre === "participio") {
          const forma = nombre === "participio"
            ? p.pos[0] ? { lema: p.pos[0], descripcion: `Participio de «${p.pos[0]}»` } : null
            : describirForma(p);
          if (forma && !formasDe.some((f) => f.lema === forma.lema)) formasDe.push(forma);
        }
      }
      const limpio = limpiar(sentido[3], titulo);
      const texto = /[.!?…»)]$/.test(limpio) ? limpio : `${limpio}.`;
      const repetida = acepciones.some((a) => a.texto === texto && a.categoria === categoria);
      if (!limpio || limpio === "." || repetida || acepciones.length >= MAX_ACEPCIONES) {
        actual = null;
        continue;
      }
      // Numeración propia y continua (en el Wikcionario se reinicia en cada etimología).
      actual = {
        numero: acepciones.length + 1,
        categoria,
        texto,
        etiquetas,
        sinonimos: [],
      };
      acepciones.push(actual);
      continue;
    }

    if (!actual || !linea.startsWith("{{")) continue;
    for (const p of plantillasDeLinea(linea)) {
      const n = p.nombre.toLowerCase();
      if (n === "sinónimo" || n === "sinónimos") {
        for (const s of p.pos.map((x) => limpiar(x, titulo)).filter(Boolean)) {
          if (!actual.sinonimos.includes(s) && actual.sinonimos.length < 6) actual.sinonimos.push(s);
        }
      } else if (n === "ejemplo" && p.pos[0]) {
        // Nos quedamos con el primer ejemplo, o con uno más corto si el primero era larguísimo.
        const ejemplo = limpiar(p.pos[0], titulo);
        if (ejemplo && (!actual.ejemplo || (actual.ejemplo.endsWith("…") && ejemplo.length <= MAX_EJEMPLO))) {
          actual.ejemplo = ejemplo.length > MAX_EJEMPLO ? `${ejemplo.slice(0, MAX_EJEMPLO - 1).trimEnd()}…` : ejemplo;
        }
      } else if (n === "uso" || n === "ámbito") {
        for (const e of p.pos.map((x) => limpiar(x, titulo)).filter((x) => x && x.length <= 30)) {
          if (!actual.etiquetas.includes(e)) actual.etiquetas.push(e);
        }
      }
    }
  }

  return { tieneEspanol: true, acepciones, etimologia, formasDe };
}

/** true si todas las acepciones son solo "forma de..." (plural, conjugación...). */
export function soloFormasFlexivas(entrada: EntradaAnalizada): boolean {
  return entrada.formasDe.length > 0 && entrada.acepciones.every((a) => /^(Forma|Femenino|Masculino|Plural|Participio)\b.*«/.test(a.texto));
}
