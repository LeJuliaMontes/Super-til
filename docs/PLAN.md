# Plan de la aplicación: Superútil

## 1. La idea en una frase

Cuando encuentras una palabra que no conoces, la **apuntas en dos segundos** (sin interrumpir lo que estás leyendo). Cuando has acumulado unas cuantas, pulsas **"Dame los significados"** y la app te explica **todas a la vez**, teniendo en cuenta la frase en la que apareció cada una.

## 2. Principios de diseño

1. **Capturar tiene que ser instantáneo.** Si apuntar cuesta más que seguir leyendo, no se usa. Un campo, un botón, y listo.
2. **Primero apuntar, después entender.** La app separa los dos momentos a propósito: no te saca de la lectura.
3. **El contexto importa.** "Banco" no significa lo mismo en un parque que en una cuenta. Guardar la frase (opcional) permite dar *el* significado correcto, no una lista de diez acepciones.
4. **Funciona sin conexión.** Apuntar no debe depender de tener internet; los significados se piden cuando haya red.
5. **Tus palabras son tuyas.** Los datos viven en tu dispositivo y se pueden exportar.

## 3. Flujo de uso

```
 Leyendo un libro / artículo / serie
            │
            ▼
 ┌─────────────────────┐
 │ 1. APUNTAR          │  palabra + (opcional) frase, fuente
 │    (2 segundos)     │  → estado: PENDIENTE
 └─────────────────────┘
            │   ... se van acumulando ...
            ▼
 ┌─────────────────────┐
 │ 2. BANDEJA          │  "Tienes 12 palabras pendientes"
 │                     │  editar, borrar, agrupar
 └─────────────────────┘
            │   pulsas "Dame los significados"
            ▼
 ┌─────────────────────┐
 │ 3. RESOLVER LOTE    │  una sola petición con todas las
 │                     │  pendientes → estado: DEFINIDA
 └─────────────────────┘
            │
            ▼
 ┌─────────────────────┐
 │ 4. LEER Y REPASAR   │  fichas con significado, ejemplo,
 │                     │  sinónimos; marcar "ya me la sé"
 └─────────────────────┘    → estado: APRENDIDA
```

## 4. Funcionalidades

### MVP (versión 1)

| # | Funcionalidad | Detalle |
|---|---|---|
| 1 | **Apuntar palabra** | Campo de texto con foco automático. Enter guarda. Campos opcionales plegados: *frase donde apareció* y *fuente* (libro, web…). |
| 2 | **Detección de duplicados** | Si la palabra ya está apuntada, avisa y suma el nuevo contexto en lugar de duplicarla. |
| 3 | **Bandeja de pendientes** | Lista con contador. Editar y borrar. |
| 4 | **Resolver lote** | Botón "Dame los significados (N)". Envía todas las pendientes en una sola petición y guarda los resultados. |
| 5 | **Ficha de significado** | Por palabra: definición breve, sentido en *tu* frase, categoría gramatical, ejemplo de uso, sinónimos, enlace al diccionario de la RAE (dle.rae.es). |
| 6 | **Historial por lotes** | Ver los lotes anteriores ("15 nov – 12 palabras"). |
| 7 | **Funcionamiento offline** | Apuntar sin red; resolver cuando vuelva. |
| 8 | **Exportar** | Markdown y CSV. |

### Versión 2

- **Compartir desde otras apps** (Web Share Target): seleccionar una palabra en el navegador o en el lector → "Compartir" → Palabras Pendientes.
- **Umbral automático**: aviso cuando llegas a N palabras (configurable, p. ej. 10).
- **Repaso espaciado**: tarjetas tipo flashcard con las palabras definidas que aún no marcaste como aprendidas.
- **Exportar a Anki**.
- **Varios idiomas**: apuntar palabras en inglés, francés… y recibir la explicación en español.
- **Sincronización entre dispositivos** (cuenta opcional).

### Ideas futuras

- Extensión de navegador (doble clic en una palabra → apuntada).
- Captura por foto (OCR) de una página de libro en papel.
- Estadísticas: palabras por mes, fuentes que más vocabulario nuevo te dan.

## 5. ¿De dónde salen los significados?

| Opción | Ventajas | Inconvenientes |
|---|---|---|
| **RAE (DLE)** | La referencia en español | No tiene API pública oficial; hacer *scraping* es frágil y dudoso legalmente. |
| **Wiktionary (API de Wikimedia)** | Gratis, abierta, multilingüe | Calidad desigual, formato difícil de procesar, no entiende el contexto. |
| **Modelo de lenguaje (API de Claude)** | Entiende la frase y elige la acepción correcta; procesa todo el lote de una vez; devuelve exactamente el formato que queremos (JSON estructurado) | Coste por uso (muy bajo para unas decenas de palabras); necesita un pequeño backend para no exponer la clave. |

**Recomendación:** usar **Claude** como motor principal, porque es justo lo que diferencia esta app de un diccionario: *el significado en tu contexto, para todo el lote de una vez*. Cada ficha incluye además un **enlace al DLE de la RAE** para consultar la definición oficial.

### Cómo sería la petición del lote

- Una sola llamada a la API con la lista de palabras pendientes (palabra + frase + idioma).
- Se pide **salida estructurada** (JSON con esquema fijo) para que la app pueda guardarla directamente:

```json
{
  "definiciones": [
    {
      "palabra": "procaz",
      "categoria": "adjetivo",
      "definicion": "Desvergonzado, atrevido, insolente.",
      "sentido_en_contexto": "En tu frase describe un comentario grosero y descarado.",
      "ejemplo": "Sus bromas procaces incomodaron a todos en la cena.",
      "sinonimos": ["desvergonzado", "insolente", "descarado"],
      "nivel": "culto"
    }
  ]
}
```

- Modelo: `claude-opus-5-5`, con esfuerzo bajo (`effort: "low"`), que basta para definir palabras y mantiene el coste y la espera al mínimo.
- Si una palabra no existe o está mal escrita, el modelo lo indica y sugiere la forma correcta en lugar de inventarse un significado.

## 6. Arquitectura técnica

### Plataforma: aplicación web instalable (PWA)

Una sola base de código que funciona en el móvil (se instala en la pantalla de inicio como una app), en la tableta y en el ordenador. Sin pasar por las tiendas de apps. Funciona offline gracias a un *service worker*.

### Stack propuesto

| Capa | Tecnología | Por qué |
|---|---|---|
| Interfaz | **React + TypeScript + Vite** | Estándar, rápido, buen soporte PWA (`vite-plugin-pwa`). |
| Estilos | **Tailwind CSS** | Rápido para iterar en un diseño limpio y adaptable al móvil. |
| Datos locales | **IndexedDB vía Dexie.js** | Base de datos en el navegador, funciona offline, sin servidor. |
| Backend mínimo | **Una función serverless** (Cloudflare Workers o Vercel Functions) | Solo hace una cosa: recibir el lote, llamar a la API de Claude con la clave guardada en secreto y devolver el JSON. |
| IA | **SDK oficial `@anthropic-ai/sdk`** | Salida estructurada y control de errores. |
| Tests | **Vitest** + **Playwright** | Unitarios y de extremo a extremo. |
| Despliegue | Cloudflare Pages / Vercel + GitHub Actions | Despliegue automático en cada *push* a `main`. |

```
┌──────────────────────────────┐        ┌─────────────────────────┐        ┌──────────────┐
│  PWA (navegador / móvil)     │  HTTPS │  Función serverless     │  HTTPS │  API Claude  │
│  React · Dexie (IndexedDB)   │ ─────▶ │  POST /api/definir      │ ─────▶ │              │
│  apuntar / bandeja / fichas  │ ◀───── │  valida, limita, llama  │ ◀───── │              │
└──────────────────────────────┘  JSON  └─────────────────────────┘  JSON  └──────────────┘
```

### Modelo de datos

```ts
type Estado = "pendiente" | "definida" | "aprendida";

interface Palabra {
  id: string;              // uuid
  termino: string;         // "procaz" (normalizado: minúsculas, sin espacios)
  contextos: Contexto[];   // puede aparecer en varias frases
  idioma: string;          // "es" por defecto
  estado: Estado;
  creadaEn: string;        // ISO date
  loteId?: string;         // lote en el que se resolvió
  definicion?: Definicion;
}

interface Contexto {
  frase?: string;          // "Le soltó un comentario procaz delante de todos."
  fuente?: string;         // "La Regenta, cap. 3"
  fecha: string;
}

interface Definicion {
  categoria: string;
  definicion: string;
  sentidoEnContexto?: string;
  ejemplo: string;
  sinonimos: string[];
  nivel?: string;          // coloquial, culto, técnico, regional…
  correccion?: string;     // si la palabra estaba mal escrita
}

interface Lote {
  id: string;
  fecha: string;
  palabraIds: string[];
}
```

### Seguridad y costes

- La clave de la API **nunca** está en el navegador: solo en la función serverless, como variable secreta.
- Límite de tamaño del lote (p. ej. 50 palabras por petición) y límite de peticiones por minuto en la función.
- Coste orientativo: un lote de 20 palabras son unos pocos miles de *tokens*, es decir, una fracción de céntimo.

## 7. Pantallas

1. **Inicio / Apuntar** — Campo grande arriba ("¿Qué palabra no conoces?"), botón "+ añadir frase", y debajo el contador de pendientes con el botón principal **"Dame los significados (12)"**.
2. **Bandeja** — Lista de pendientes con su frase. Deslizar para borrar, tocar para editar.
3. **Resultados del lote** — Tarjetas con cada palabra y su significado. Botón "Ya me la sé" en cada una.
4. **Historial** — Lotes anteriores y buscador de todas las palabras.
5. **Ajustes** — Idioma de las explicaciones, umbral de aviso, exportar/importar datos.

## 8. Hoja de ruta

| Fase | Contenido | Resultado |
|---|---|---|
| **0. Base** | Proyecto Vite + React + TS, Tailwind, Dexie, PWA, lint, CI en GitHub Actions | Esqueleto desplegado |
| **1. Captura** | Pantalla Apuntar, bandeja, duplicados, persistencia local, offline | Ya se puede usar para apuntar |
| **2. Significados** | Función serverless, llamada a Claude con salida estructurada, pantalla de resultados, manejo de errores | **MVP completo** |
| **3. Pulido** | Historial, búsqueda, exportar Markdown/CSV, ajustes, tests E2E | Versión 1.0 |
| **4. Extras** | Compartir desde otras apps, umbral automático, repaso espaciado, Anki | Versión 2.0 |

## 9. Estructura del repositorio (prevista)

```
super-til/
├── docs/
│   └── PLAN.md              ← este documento
├── src/
│   ├── components/          # piezas de interfaz reutilizables
│   ├── pages/               # Apuntar, Bandeja, Resultados, Historial, Ajustes
│   ├── db/                  # esquema Dexie y operaciones
│   ├── lib/                 # normalización, exportación, cliente de /api/definir
│   └── main.tsx
├── api/
│   └── definir.ts           # función serverless que llama a Claude
├── tests/
├── public/                  # iconos y manifest de la PWA
└── README.md
```

## 10. Decisiones abiertas

- **¿Solo español o varios idiomas desde el principio?** El modelo de datos ya lo admite; la duda es si se muestra en la v1.
- **¿Cuenta y sincronización?** La v1 es solo local. Si se quiere usar en móvil y ordenador a la vez, en la v2 habría que añadir un backend con usuarios (p. ej. Supabase).
- **¿Dónde desplegar?** Cloudflare (Pages + Workers) o Vercel; ambos tienen plan gratuito suficiente.
- **Nombre de la app:** de momento "Superútil", como el repositorio.
