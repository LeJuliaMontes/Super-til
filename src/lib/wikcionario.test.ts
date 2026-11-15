import { describe, expect, it, vi } from "vitest";
import { buscarDefiniciones, descargarPaginas, ErrorDiccionario, TITULOS_POR_PETICION } from "./wikcionario";
import lote1 from "../../tests/fixtures/wikcionario-lote1.json";
import lote2 from "../../tests/fixtures/wikcionario-lote2.json";

type Pagina = { title: string; missing?: boolean; revisions?: { slots: { main: { content: string } } }[] };
const todas = new Map<string, Pagina>(
  [...(lote1.query.pages as Pagina[]), ...(lote2.query.pages as Pagina[])].filter((p) => p.revisions).map((p) => [p.title, p]),
);

/** Simula la API de MediaWiki con las páginas reales guardadas en tests/fixtures. */
function apiFalsa(opciones: { sugerencias?: Record<string, string[]>; redirecciones?: Record<string, string> } = {}) {
  return vi.fn(async (entrada: RequestInfo | URL) => {
    const url = new URL(String(entrada));
    const p = url.searchParams;
    expect(p.get("origin")).toBe("*");
    if (p.get("action") === "opensearch") {
      const q = p.get("search")!;
      return Response.json([q, opciones.sugerencias?.[q] ?? [], [], []]);
    }
    const titulos = p.get("titles")!.split("|");
    expect(titulos.length).toBeLessThanOrEqual(TITULOS_POR_PETICION);
    const redirects = titulos
      .filter((t) => opciones.redirecciones?.[t])
      .map((t) => ({ from: t, to: opciones.redirecciones![t] }));
    const finales = titulos.map((t) => opciones.redirecciones?.[t] ?? t);
    return Response.json({
      batchcomplete: true,
      query: {
        redirects: redirects.length ? redirects : undefined,
        pages: finales.map((t) => todas.get(t) ?? { title: t, missing: true }),
      },
    });
  });
}

describe("descargarPaginas", () => {
  it("trocea en grupos de 50 títulos", async () => {
    const f = apiFalsa();
    const titulos = Array.from({ length: 120 }, (_, i) => `palabra${i}`);
    const r = await descargarPaginas(titulos, f as unknown as typeof fetch);
    expect(f).toHaveBeenCalledTimes(3);
    expect(r.size).toBe(120);
  });

  it("sigue las redirecciones", async () => {
    const f = apiFalsa({ redirecciones: { Inefable: "inefable" } });
    const r = await descargarPaginas(["Inefable"], f as unknown as typeof fetch);
    expect(r.get("Inefable")?.titulo).toBe("inefable");
  });
});

describe("buscarDefiniciones", () => {
  it("resuelve un lote completo en una sola petición principal", async () => {
    const f = apiFalsa();
    const r = await buscarDefiniciones(["procaz", "banco", "inefable"], { fetch: f as unknown as typeof fetch });
    expect(f).toHaveBeenCalledTimes(1);
    expect(r.get("procaz")).toMatchObject({ encontrada: true, lema: "procaz", url: "https://es.wiktionary.org/wiki/procaz" });
    expect(r.get("banco")!.acepciones.length).toBeGreaterThan(3);
  });

  it("para una forma flexiva, trae las acepciones del lema", async () => {
    const f = apiFalsa();
    const r = await buscarDefiniciones(["perros", "comía"], { fetch: f as unknown as typeof fetch });
    const perros = r.get("perros")!;
    expect(perros.formaDe).toEqual({ lema: "perro", descripcion: "Plural de «perro»" });
    expect(perros.lema).toBe("perro");
    expect(perros.acepciones[0].texto).toContain("Variedad doméstica del lobo");
    // "comer" no está en los fixtures: se queda con la forma flexiva, que algo es algo.
    expect(r.get("comía")).toMatchObject({ encontrada: true, lema: "comía" });
  });

  it("si no la encuentra, busca sugerencias", async () => {
    const f = apiFalsa({ sugerencias: { procas: ["procaz", "procas", "Procas"] } });
    const r = await buscarDefiniciones(["procas"], { fetch: f as unknown as typeof fetch });
    expect(r.get("procas")).toMatchObject({ encontrada: false, sugerencias: ["procaz"] });
  });

  it("informa del progreso", async () => {
    const avisos: string[] = [];
    await buscarDefiniciones(["banco"], { fetch: apiFalsa() as unknown as typeof fetch, alProgresar: (t) => avisos.push(t) });
    expect(avisos[0]).toBe("Buscando 1 palabra en el Wikcionario…");
  });

  it("da un error claro si no hay conexión", async () => {
    const f = vi.fn(async () => {
      throw new TypeError("Failed to fetch");
    });
    await expect(buscarDefiniciones(["banco"], { fetch: f as unknown as typeof fetch })).rejects.toThrow(ErrorDiccionario);
  });

  it("reintenta si el Wikcionario pide esperar (429)", async () => {
    vi.useFakeTimers();
    const buena = apiFalsa();
    let llamadas = 0;
    const f = vi.fn(async (url: RequestInfo | URL) => {
      if (llamadas++ === 0) return new Response("", { status: 429, headers: { "retry-after": "1" } });
      return buena(url);
    });
    const promesa = buscarDefiniciones(["banco"], { fetch: f as unknown as typeof fetch });
    await vi.advanceTimersByTimeAsync(1000);
    const r = await promesa;
    vi.useRealTimers();
    expect(r.get("banco")?.encontrada).toBe(true);
    expect(f).toHaveBeenCalledTimes(2);
  });
});
