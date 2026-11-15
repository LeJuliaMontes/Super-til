// Genera los PNG de la PWA a partir de public/icono.svg (usa Playwright).
// Uso: node scripts/generar-iconos.mjs
import { chromium } from "playwright";
import { readFileSync } from "node:fs";

const svg = readFileSync(new URL("../public/icono.svg", import.meta.url), "utf8");
const maskable = svg.replace('rx="112"', 'rx="0"').replace("<text", '<g transform="translate(256 256) scale(0.8) translate(-256 -256)"><text').replace("</text>", "</text></g>").replace("<rect x=\"96\"", "<rect transform=\"translate(256 256) scale(0.8) translate(-256 -256)\" x=\"96\"");

const salidas = [
  { archivo: "icono-192.png", tam: 192, fuente: svg },
  { archivo: "icono-512.png", tam: 512, fuente: svg },
  { archivo: "icono-maskable-512.png", tam: 512, fuente: maskable },
  { archivo: "apple-touch-icon.png", tam: 180, fuente: maskable },
];

const navegador = await chromium.launch();
const pagina = await navegador.newPage({ deviceScaleFactor: 1 });
for (const { archivo, tam, fuente } of salidas) {
  await pagina.setViewportSize({ width: tam, height: tam });
  await pagina.setContent(`<html><body style="margin:0;background:transparent">${fuente.replace("<svg ", `<svg width="${tam}" height="${tam}" `)}</body></html>`);
  await pagina.locator("svg").screenshot({ path: new URL(`../public/${archivo}`, import.meta.url).pathname, omitBackground: true });
  console.log("✓", archivo);
}
await navegador.close();
