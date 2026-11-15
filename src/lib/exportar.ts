import type { Acepcion, Palabra } from "../tipos";

/** La acepción que se muestra como principal: la elegida por la persona o la primera. */
export function acepcionPrincipal(p: Palabra): Acepcion | undefined {
  const acepciones = p.definicion?.acepciones ?? [];
  return acepciones.find((a) => a.numero === p.acepcionElegida) ?? acepciones[0];
}

const ESTADOS: Record<Palabra["estado"], string> = {
  pendiente: "pendiente",
  "sin-resultado": "no encontrada",
  definida: "por aprender",
  aprendida: "aprendida",
};

export function aMarkdown(palabras: Palabra[]): string {
  const lineas = ["# Mis palabras — Superútil", "", `_Exportado el ${new Date().toLocaleDateString("es")}. Definiciones del Wikcionario (CC BY-SA 4.0)._`, ""];
  for (const p of palabras) {
    lineas.push(`## ${p.termino}`, "");
    const d = p.definicion;
    if (d?.formaDe) lineas.push(`_${d.formaDe.descripcion}_`, "");
    if (d?.encontrada) {
      const elegida = acepcionPrincipal(p);
      for (const a of d.acepciones) {
        const marca = a.numero === p.acepcionElegida ? " ★" : "";
        lineas.push(`${a.numero}. _(${a.categoria})_ ${a.texto}${marca}`);
        if (a.ejemplo && a === elegida) lineas.push(`   - Ejemplo: «${a.ejemplo}»`);
        if (a.sinonimos.length && a === elegida) lineas.push(`   - Sinónimos: ${a.sinonimos.join(", ")}`);
      }
      lineas.push("");
    } else {
      lineas.push(`_Sin definición (${ESTADOS[p.estado]})._`, "");
    }
    for (const c of p.contextos) {
      if (c.frase) lineas.push(`> ${c.frase}${c.fuente ? ` — ${c.fuente}` : ""}`, "");
      else if (c.fuente) lineas.push(`Fuente: ${c.fuente}`, "");
    }
  }
  return lineas.join("\n").trimEnd() + "\n";
}

const celdaCSV = (valor: string) => (/[",\n;]/.test(valor) ? `"${valor.replace(/"/g, '""')}"` : valor);

export function aCSV(palabras: Palabra[]): string {
  const cabecera = ["palabra", "estado", "categoria", "definicion", "ejemplo", "sinonimos", "frase", "fuente", "apuntada"];
  const filas = palabras.map((p) => {
    const a = acepcionPrincipal(p);
    const c = p.contextos.find((x) => x.frase) ?? p.contextos[0];
    return [
      p.termino,
      ESTADOS[p.estado],
      a?.categoria ?? "",
      a?.texto ?? "",
      a?.ejemplo ?? "",
      a?.sinonimos.join(", ") ?? "",
      c?.frase ?? "",
      c?.fuente ?? "",
      p.creadaEn.slice(0, 10),
    ].map(celdaCSV).join(",");
  });
  // BOM para que Excel reconozca las tildes.
  return "﻿" + [cabecera.join(","), ...filas].join("\r\n") + "\r\n";
}

const html = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/[\t\n]/g, " ");

/** Texto separado por tabuladores para importar en Anki (anverso, reverso). */
export function aAnki(palabras: Palabra[]): string {
  const filas = palabras
    .filter((p) => p.definicion?.encontrada)
    .map((p) => {
      const a = acepcionPrincipal(p)!;
      const frase = p.contextos.find((c) => c.frase)?.frase;
      const anverso = `<b>${html(p.termino)}</b>${frase ? `<br><i>${html(frase)}</i>` : ""}`;
      const partes = [`<i>${html(a.categoria)}</i>`, html(a.texto)];
      if (a.ejemplo) partes.push(`«${html(a.ejemplo)}»`);
      if (a.sinonimos.length) partes.push(`Sinónimos: ${html(a.sinonimos.join(", "))}`);
      return `${anverso}\t${partes.join("<br>")}`;
    });
  return ["#separator:tab", "#html:true", "#columns:Anverso\tReverso", ...filas].join("\n") + "\n";
}

export function descargar(nombre: string, contenido: string, tipo: string) {
  const url = URL.createObjectURL(new Blob([contenido], { type: tipo }));
  const a = document.createElement("a");
  a.href = url;
  a.download = nombre;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
