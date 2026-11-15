import { expect, test } from "@playwright/test";
import { simularWikcionario } from "./wikcionario-falso";

test("apuntar varias palabras y obtener sus significados de una vez", async ({ page }) => {
  const api = await simularWikcionario(page, { procas: ["procaz"] });
  await page.goto("/");

  const campo = page.getByLabel("Palabra que no conoces");
  await expect(campo).toBeFocused();

  // 1. Apuntar con frase y fuente.
  await page.getByRole("button", { name: "Añadir la frase donde la viste" }).click();
  await campo.fill("Banco");
  await page.getByLabel("Frase donde la has visto").fill("Se sentaron en un banco del parque.");
  await page.getByLabel("Fuente").fill("Cuaderno de notas");
  await campo.press("Enter");
  await expect(page.getByRole("status").filter({ hasText: "«banco» apuntada." })).toBeVisible();
  await expect(campo).toHaveValue("");
  await expect(campo).toBeFocused();

  // 2. Más palabras: una forma verbal, una mal escrita y una repetida.
  for (const palabra of ["perros", "procas", "¿inefable?"]) {
    await campo.fill(palabra);
    await campo.press("Enter");
  }
  await campo.fill("banco");
  await campo.press("Enter");
  await expect(page.getByRole("status").filter({ hasText: "«banco» ya estaba apuntada" })).toBeVisible();
  await expect(page.getByText("Tienes 4 palabras pendientes.")).toBeVisible();

  // 3. Resolver el lote.
  await page.getByRole("button", { name: "Dame los significados (4)" }).click();
  await expect(page).toHaveURL(/\/lotes\//);
  await expect(page.getByRole("heading", { name: "Tus significados" })).toBeVisible();
  await expect(page.getByText("3 palabras definidas · 1 sin encontrar")).toBeVisible();

  // La ficha de "banco" muestra su frase con la palabra resaltada.
  const banco = page.locator("article").filter({ has: page.getByRole("heading", { name: "banco" }) });
  await expect(banco.locator("mark")).toHaveText("banco");
  await expect(banco.getByText("Empresa que ofrece servicios monetarios")).toBeVisible();

  // Elegir la acepción que encaja con la frase.
  await banco.getByRole("button", { name: "Ver 4 acepciones más" }).click();
  await banco.getByRole("button", { name: "Marcar la acepción 2 como la de mi frase" }).click();
  await expect(banco.getByRole("button", { name: "Quitar marca de la acepción 2" })).toBeVisible();

  // "perros" se resuelve con el lema "perro".
  const perros = page.locator("article").filter({ has: page.getByRole("heading", { name: "perros" }) });
  await expect(perros.getByText("Plural de «perro»")).toBeVisible();
  await expect(perros.getByText(/Variedad doméstica del lobo/)).toBeVisible();

  // "procas" no existe: se ofrece la corrección.
  const procas = page.locator("article").filter({ has: page.getByRole("heading", { name: "procas" }) });
  await expect(procas.getByText("No la he encontrado en el Wikcionario.", { exact: false })).toBeVisible();
  await procas.getByRole("button", { name: "procaz" }).click();
  await expect(page.getByRole("status").filter({ hasText: "Cambiada a «procaz»" })).toBeVisible();

  // Las peticiones se agrupan: una para el lote, una para lemas/mayúsculas y una de sugerencias.
  expect(api.peticiones).toBeLessThanOrEqual(3);

  // 4. La corregida vuelve a pendientes y se resuelve en otro lote.
  await page.getByRole("link", { name: /Pendientes/ }).first().click();
  await expect(page.getByText("procaz", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Dame los significados (1)" }).click();
  await expect(page.getByText(/Dicho de una persona: Que se comporta o habla/)).toBeVisible();
});

test("repaso con tarjetas y búsqueda en el historial", async ({ page }) => {
  await simularWikcionario(page);
  await page.goto("/");
  const campo = page.getByLabel("Palabra que no conoces");
  for (const palabra of ["inefable", "zozobra"]) {
    await campo.fill(palabra);
    await campo.press("Enter");
  }
  await page.getByRole("button", { name: "Dame los significados (2)" }).click();
  await expect(page).toHaveURL(/\/lotes\//);

  await page.getByRole("link", { name: "Ir al repaso" }).click();
  await expect(page.getByText("Quedan 2")).toBeVisible();
  await page.getByRole("button", { name: /Ver el significado de/ }).click();
  await page.getByRole("button", { name: "Me la sé" }).click();
  await expect(page.getByText("Quedan 1")).toBeVisible();
  await page.getByRole("button", { name: /Ver el significado de/ }).click();
  await page.getByRole("button", { name: "Me la sé" }).click();
  await expect(page.getByText("¡Hecho! Hoy te has aprendido 2 palabras.")).toBeVisible();

  await page.goto("/historial");
  await page.getByLabel("Buscar en tus palabras").fill("palabras");
  await expect(page.getByRole("link", { name: /inefable/ })).toBeVisible();
  await expect(page.getByRole("link", { name: /zozobra/ })).toHaveCount(0);
  await page.getByLabel("Buscar en tus palabras").fill("");
  await page.getByRole("button", { name: "Aprendidas" }).click();
  await expect(page.getByRole("link", { name: /zozobra/ })).toBeVisible();
});

test("si una palabra ya está definida, al apuntarla otra vez te recuerda su significado", async ({ page }) => {
  await simularWikcionario(page);
  await page.goto("/");
  const campo = page.getByLabel("Palabra que no conoces");
  await campo.fill("inefable");
  await campo.press("Enter");
  await page.getByRole("button", { name: "Dame los significados (1)" }).click();
  await expect(page).toHaveURL(/\/lotes\//);
  await page.goto("/");
  await page.getByLabel("Palabra que no conoces").fill("Inefable");
  await page.getByLabel("Palabra que no conoces").press("Enter");
  await expect(page.getByText("¡Esta ya la tenías! Significa:")).toBeVisible();
  await expect(page.getByText("Que no puede ser expresado o explicado con palabras.")).toBeVisible();
});

test("compartir un texto desde otra app lo deja listo para apuntar", async ({ page }) => {
  await page.goto("/?titulo=Un%20art%C3%ADculo&texto=Sent%C3%ADa%20una%20zozobra%20que%20no%20le%20dejaba%20dormir%20por%20las%20noches.");
  await expect(page.getByLabel("Frase donde la has visto")).toHaveValue(/zozobra/);
  await expect(page.getByLabel("Fuente")).toHaveValue("Un artículo");
  await page.goto("/?texto=inefable");
  await expect(page.getByLabel("Palabra que no conoces")).toHaveValue("inefable");
});

test("sin conexión se puede apuntar pero no buscar", async ({ page, context }) => {
  await page.goto("/");
  await context.setOffline(true);
  const campo = page.getByLabel("Palabra que no conoces");
  await campo.fill("zozobra");
  await campo.press("Enter");
  await expect(page.getByText("Tienes 1 palabra pendiente.")).toBeVisible();
  await expect(page.getByRole("button", { name: "Dame los significados (1)" })).toBeDisabled();
  await expect(page.getByText(/Sin conexión\. Puedes seguir apuntando/)).toBeVisible();
  await context.setOffline(false);
  await expect(page.getByRole("button", { name: "Dame los significados (1)" })).toBeEnabled();
});

test("exportar a Markdown", async ({ page }) => {
  await simularWikcionario(page);
  await page.goto("/");
  await page.getByLabel("Palabra que no conoces").fill("inefable");
  await page.getByLabel("Palabra que no conoces").press("Enter");
  await expect(page.getByText("Tienes 1 palabra pendiente.")).toBeVisible();
  await page.goto("/ajustes");
  const descarga = page.waitForEvent("download");
  await page.getByRole("button", { name: "Markdown (.md)" }).click();
  const archivo = await descarga;
  expect(archivo.suggestedFilename()).toMatch(/^superutil-\d{4}-\d{2}-\d{2}\.md$/);
});
