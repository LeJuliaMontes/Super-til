import { describe, expect, it } from "vitest";
import { analizarEntrada, limpiar, soloFormasFlexivas } from "./wikitexto";
import lote1 from "../../tests/fixtures/wikcionario-lote1.json";
import lote2 from "../../tests/fixtures/wikcionario-lote2.json";

type Pagina = { title: string; revisions?: { slots: { main: { content: string } } }[] };
const paginas = [...(lote1.query.pages as Pagina[]), ...(lote2.query.pages as Pagina[])];
const wikitexto = (titulo: string) => {
  const p = paginas.find((x) => x.title === titulo);
  if (!p?.revisions) throw new Error(`No hay fixture para ${titulo}`);
  return p.revisions[0].slots.main.content;
};
const analizar = (titulo: string) => analizarEntrada(wikitexto(titulo), titulo);

describe("limpiar", () => {
  it("convierte enlaces, negritas y plantillas habituales", () => {
    expect(limpiar("{{plm|empresa}} que ofrece [[servicio]]s [[monetario|monetarios]].", "banco")).toBe(
      "Empresa que ofrece servicios monetarios.",
    );
    expect(limpiar("{{impropia|Se emplea para expresar un deseo}}.", "ojalá")).toBe("Se emplea para expresar un deseo.");
    expect(limpiar("Compárese {{l+|es|chucho}} y '''can'''", "perro")).toBe("Compárese chucho y can");
    expect(limpiar("Texto<ref name=\"x\">{{DLE}}</ref> final<ref name=\"y\" />.", "x")).toBe("Texto final.");
    expect(limpiar("{{plm}}.", "procaz")).toBe("Procaz.");
  });

  it("resuelve plantillas anidadas de dentro hacia fuera", () => {
    expect(limpiar("{{impropia|Indica los [[obstáculo]]s {{l|es|considerados}}}}", "a pesar de")).toBe(
      "Indica los obstáculos considerados",
    );
  });
});

describe("analizarEntrada", () => {
  it("extrae acepciones, categoría, ejemplo y sinónimos de una entrada normal", () => {
    const r = analizar("banco");
    expect(r.tieneEspanol).toBe(true);
    expect(r.acepciones[0]).toMatchObject({
      numero: 1,
      categoria: "sustantivo masculino",
      texto: "Empresa que ofrece servicios monetarios como cuentas o préstamos.",
    });
    expect(r.acepciones[0].ejemplo).toContain("¿Hay un banco cerca?");
    expect(r.acepciones[1].sinonimos).toEqual(["banca"]);
    expect(r.acepciones.find((a) => a.texto.startsWith("En las galeras"))?.etiquetas).toContain("náutica");
  });

  it("numera de forma continua aunque haya varias etimologías", () => {
    const numeros = analizar("banco").acepciones.map((a) => a.numero);
    expect(numeros).toEqual(numeros.map((_, i) => i + 1));
    expect(analizar("banco").acepciones.at(-1)?.categoria).toBe("interjección");
  });

  it("ignora otras lenguas de la misma página", () => {
    // "banco" también tiene sección de gallego, que no debe aparecer.
    expect(analizar("banco").acepciones.every((a) => !a.ejemplo?.includes("xuntan"))).toBe(true);
  });

  it("guarda ámbito y uso como etiquetas", () => {
    const perro = analizar("perro");
    expect(perro.acepciones[1].etiquetas).toEqual(expect.arrayContaining(["Venezuela", "coloquial"]));
    expect(perro.acepciones[1].sinonimos.length).toBeLessThanOrEqual(6);
  });

  it("detecta formas flexivas y su lema", () => {
    const comia = analizar("comía");
    expect(comia.formasDe).toEqual([{ lema: "comer", descripcion: "Forma del verbo «comer»" }]);
    expect(comia.acepciones).toHaveLength(1); // las dos personas se fusionan
    expect(soloFormasFlexivas(comia)).toBe(true);

    expect(analizar("perros").formasDe[0]).toEqual({ lema: "perro", descripcion: "Plural de «perro»" });
    expect(analizar("bonitas").formasDe[0]).toEqual({ lema: "bonito", descripcion: "Femenino plural de «bonito»" });
    expect(analizar("desvergonzadas").formasDe[0].lema).toBe("desvergonzado");
  });

  it("trata los participios como formas del verbo", () => {
    const r = analizarEntrada("== {{lengua|es}} ==\n=== Forma flexiva ===\n;1: {{participio|obnubilar}}.", "obnubilado");
    expect(r.formasDe).toEqual([{ lema: "obnubilar", descripcion: "Participio de «obnubilar»" }]);
    expect(soloFormasFlexivas(r)).toBe(true);
  });

  it("no trata como forma flexiva una palabra con acepciones propias", () => {
    const zozobra = analizar("zozobra");
    expect(zozobra.formasDe[0]?.lema).toBe("zozobrar");
    expect(soloFormasFlexivas(zozobra)).toBe(false);
    expect(zozobra.acepciones[0].texto).toBe("Acción o efecto de zozobrar.");
  });

  it("entiende locuciones de varias palabras", () => {
    const r = analizar("a pesar de");
    expect(r.acepciones[0].categoria).toBe("locución prepositiva");
    expect(r.acepciones[0].sinonimos).toEqual(["pese a"]);
    expect(r.acepciones[0].ejemplo).toBe("A pesar de la lluvia, el evento fue un éxito.");
  });

  it("acorta los ejemplos larguísimos", () => {
    const ejemplo = analizar("procaz").acepciones[1].ejemplo!;
    expect(ejemplo.length).toBeLessThanOrEqual(220);
    expect(ejemplo.endsWith("…")).toBe(true);
  });

  it("saca una etimología legible", () => {
    expect(analizar("procaz").etimologia).toBe("Del latín «procācis».");
    expect(analizar("inefable").etimologia).toBe("Del latín «ineffabilis» ('indecible').");
    expect(analizar("chévere").etimologia).toBe("Etimología incierta.");
  });

  it("limita el número de acepciones y no deja ninguna vacía", () => {
    for (const p of paginas.filter((x) => x.revisions)) {
      const r = analizarEntrada(p.revisions![0].slots.main.content, p.title);
      expect(r.acepciones.length).toBeLessThanOrEqual(15);
      for (const a of r.acepciones) {
        expect(a.texto.length).toBeGreaterThan(2);
        expect(a.texto).not.toMatch(/\{\{|\}\}|\[\[|\]\]|'''/);
      }
    }
  });

  it("devuelve tieneEspanol=false si la página no tiene sección de español", () => {
    expect(analizarEntrada("== {{lengua|en}} ==\n;1: Something.", "x").tieneEspanol).toBe(false);
  });
});
