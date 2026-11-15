import type { Page } from "@playwright/test";
import lote1 from "../tests/fixtures/wikcionario-lote1.json" with { type: "json" };
import lote2 from "../tests/fixtures/wikcionario-lote2.json" with { type: "json" };

type Pagina = { title: string; revisions?: unknown[] };
const paginas = new Map<string, Pagina>(
  [...(lote1.query.pages as Pagina[]), ...(lote2.query.pages as Pagina[])].filter((p) => p.revisions).map((p) => [p.title, p]),
);

/** Sustituye la API del Wikcionario por respuestas guardadas. Devuelve cuántas peticiones recibió. */
export async function simularWikcionario(page: Page, sugerencias: Record<string, string[]> = {}) {
  const contador = { peticiones: 0 };
  await page.route("https://es.wiktionary.org/w/api.php?**", async (route) => {
    contador.peticiones++;
    const p = new URL(route.request().url()).searchParams;
    const cabeceras = { "access-control-allow-origin": "*", "access-control-allow-headers": "api-user-agent" };
    if (route.request().method() === "OPTIONS") return route.fulfill({ status: 200, headers: cabeceras });
    if (p.get("action") === "opensearch") {
      const q = p.get("search")!;
      return route.fulfill({ json: [q, sugerencias[q] ?? [], [], []], headers: cabeceras });
    }
    const titulos = p.get("titles")!.split("|");
    return route.fulfill({
      json: { query: { pages: titulos.map((t) => paginas.get(t) ?? { title: t, missing: true }) } },
      headers: cabeceras,
    });
  });
  return contador;
}
