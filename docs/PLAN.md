# Plan de la aplicación: Superútil

> **Estado (15 nov 2026):** versión 1 construida, con todo lo de las fases 0 a 4 salvo la sincronización entre dispositivos y los idiomas extra. Este documento recoge las decisiones tomadas; los cambios respecto al primer borrador están en la sección 10.

## 1. La idea en una frase

Cuando encuentras una palabra que no conoces, la **apuntas en dos segundos** (sin interrumpir lo que estás leyendo). Cuando has acumulado unas cuantas, pulsas **"Dame los significados"** y la app te explica **todas a la vez**, junto a la frase en la que apareció cada una.

## 2. Principios de diseño

1. **Capturar tiene que ser instantáneo.** Si apuntar cuesta más que seguir leyendo, no se usa. Un campo, un botón, y listo.
2. **Primero apuntar, después entender.** La app separa los dos momentos a propósito: no te saca de la lectura.
3. **El contexto importa.** "Banco" no significa lo mismo en un parque que en una cuenta. Guardar la frase (opcional) te permite ver la palabra en su sitio y marcar con una estrella la acepción que encaja, que pasa a ser la principal en el repaso y al exportar.
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
 │ 3. RESOLVER LOTE    │  una consulta al Wikcionario con
 │                     │  todas las pendientes → DEFINIDA
 └─────────────────────┘
            │
            ▼
 ┌─────────────────────┐
 │ 4. LEER Y REPASAR   │  fichas con significado, ejemplo,
 │                     │  sinónimos; marcar "ya me la sé"
 └─────────────────────┘    → estado: APRENDIDA
```

## 4. Funcionalidades

### Versión 1 (hecha)

| # | Funcionalidad | Detalle |
|---|---|---|
| 1 | **Apuntar palabra** | Campo de texto con foco automático. Enter guarda. Campos opcionales plegados: *frase donde apareció* y *fuente* (libro, web…). |
| 2 | **Detección de duplicados** | Si la palabra ya está apuntada, avisa y suma el nuevo contexto en lugar de duplicarla. |
| 3 | **Bandeja de pendientes** | Lista con contador. Editar y borrar. |
| 4 | **Resolver lote** | Botón "Dame los significados (N)". Envía todas las pendientes en una sola petición y guarda los resultados. |
| 5 | **Ficha de significado** | Por palabra: acepciones agrupadas por categoría gramatical, ejemplo, sinónimos, registro y región, etimología; estrella para marcar la acepción de *tu* frase; enlaces al Wikcionario y a la RAE (dle.rae.es). |
| 6 | **Historial por lotes** | Ver los lotes anteriores ("15 nov – 12 palabras"). |
| 7 | **Funcionamiento offline** | Apuntar sin red; resolver cuando vuelva. |
| 8 | **Exportar** | Markdown, CSV, Anki y copia de seguridad JSON (con importación). |
| 9 | **Formas flexivas** | "corrían", "perros", "bonitas", "obnubilado" → se muestra el significado de "correr", "perro", "bonito", "obnubilar". |
| 10 | **Palabras mal escritas** | Si no aparece, sugiere correcciones con un toque. |
| 11 | **Recordatorio** | Si apuntas una palabra que ya tenías definida, te enseña al momento qué significa. |

### Versión 2 (hecha en parte)

- ✅ **Compartir desde otras apps** (Web Share Target): seleccionar una palabra o una frase en el navegador o en el lector → "Compartir" → Superútil.
- ✅ **Aviso de lote**: cuando llegas a N palabras (configurable, 10 por defecto).
- ✅ **Repaso con tarjetas**: las palabras definidas que aún no marcaste como aprendidas.
- ✅ **Exportar a Anki**.
- ⏳ **Repaso espaciado de verdad** (intervalos crecientes tipo Anki).
- ⏳ **Varios idiomas**: apuntar palabras en inglés, francés… y recibir la explicación en español.
- ⏳ **Sincronización entre dispositivos** (cuenta opcional).

### Ideas futuras

- Extensión de navegador (doble clic en una palabra → apuntada).
- Captura por foto (OCR) de una página de libro en papel.
- Estadísticas: palabras por mes, fuentes que más vocabulario nuevo te dan.

## 5. ¿De dónde salen los significados?

**Del [Wikcionario en español](https://es.wiktionary.org)**: gratuito, sin clave, con licencia abierta (CC BY-SA 4.0) y con una API que se puede consultar directamente desde el navegador.

| Opción | Por qué sí / por qué no |
|---|---|
| **Wikcionario** ✅ | Gratis, sin registro, multilingüe, buena cobertura del español de España y América (marca regiones y registros). Permite pedir **50 palabras en una sola petición**, que encaja con la idea de lotes. |
| RAE (DLE) | Es la referencia, pero no tiene API pública. Se enlaza desde cada ficha para consultar la definición oficial. |
| API de un modelo de IA | Entendería la frase y elegiría la acepción sola, pero cuesta dinero por uso y necesita servidor y clave. Se descartó para que la app sea gratuita. |

### Cómo se resuelve un lote

1. Una petición a la API de MediaWiki con hasta 50 títulos (`action=query&prop=revisions`), siguiendo redirecciones.
2. De cada página se extrae **solo la sección de español** y se convierte el wikitexto en acepciones limpias (`src/lib/wikitexto.ts`).
3. Si una palabra es una **forma flexiva** (plural, femenino, conjugación, participio), una segunda petición trae su lema.
4. Si no aparece, se prueba con mayúscula inicial y, si sigue sin aparecer, se piden **sugerencias** con búsqueda aproximada.
5. Si Wikimedia pide esperar (error 429), se reintenta solo hasta tres veces.

Un lote normal se resuelve con **1 a 3 peticiones**, da igual que tenga 5 o 50 palabras.

**Atribución**: cada ficha enlaza a su página del Wikcionario, y la licencia CC BY-SA 4.0 aparece en los resultados y en Ajustes.

## 6. Arquitectura técnica

**Una aplicación web estática instalable (PWA), sin servidor propio.** En Vercel solo se publican archivos estáticos: no hay funciones, ni claves, ni costes.

| Capa | Tecnología |
|---|---|
| Interfaz | React 19 + TypeScript + Vite 8 + React Router 7 |
| Estilos | Tailwind CSS 4, con modo claro y oscuro según el sistema |
| Datos | IndexedDB mediante Dexie 4 (solo en el dispositivo) |
| Offline e instalación | `vite-plugin-pwa` (service worker, manifiesto, *share target*) |
| Significados | API de MediaWiki del Wikcionario, llamada desde el navegador |
| Tests | Vitest (46 unitarios) + Playwright (12 de extremo a extremo, móvil y escritorio) |
| Publicación | Vercel (importando el repositorio de GitHub) + GitHub Actions para los tests |

```
┌─────────────────────────────────────┐          ┌──────────────────────────┐
│  Superútil (navegador / móvil)      │  HTTPS   │  es.wiktionary.org       │
│  React · Dexie (IndexedDB) · SW     │ ───────▶ │  /w/api.php (CORS)       │
│  apuntar / pendientes / fichas      │ ◀─────── │  50 palabras por petición │
└─────────────────────────────────────┘   JSON   └──────────────────────────┘
        ▲ archivos estáticos
        │
   Vercel (CDN)
```

### Modelo de datos (`src/tipos.ts`)

- **Palabra**: término normalizado (único), contextos (frase + fuente), estado (`pendiente`, `sin-resultado`, `definida`, `aprendida`), definición, acepción elegida, lote.
- **Definición**: lema, forma flexiva (si la hay), acepciones (categoría, texto, etiquetas, sinónimos, ejemplo), etimología, sugerencias, enlace.
- **Lote**: fecha y palabras resueltas juntas.
- **Ajustes**: aviso de lote y última fuente usada.

## 7. Pantallas

1. **Apuntar** (inicio): campo grande con foco automático; frase y fuente opcionales (la fuente se recuerda); contador y botón **"Dame los significados (N)"**; últimas apuntadas.
2. **Pendientes**: lista para editar o borrar (con deshacer), botón de resolver y sección de **no encontradas** con sugerencias.
3. **Resultados del lote**: fichas en el orden en que las apuntaste.
4. **Repaso**: tarjetas que se giran; "Otra vez" o "Me la sé".
5. **Mis palabras**: buscador (palabra, significado o frase), filtros por estado y lotes anteriores.
6. **Ajustes**: aviso de lote, exportar, importar y borrar.

## 8. Hoja de ruta

| Fase | Contenido | Estado |
|---|---|---|
| 0. Base | Vite + React + TS, Tailwind, Dexie, PWA, CI | ✅ |
| 1. Captura | Apuntar, pendientes, duplicados, offline | ✅ |
| 2. Significados | Wikcionario por lotes, formas flexivas, sugerencias, fichas | ✅ |
| 3. Pulido | Historial, búsqueda, exportar, ajustes, tests E2E | ✅ |
| 4. Extras | Compartir desde otras apps, aviso de lote, repaso, Anki | ✅ |
| 5. Siguiente | Repaso espaciado, sincronización entre dispositivos, varios idiomas | ⏳ |

## 9. Estructura del repositorio

```
super-til/
├── docs/PLAN.md               ← este documento
├── src/
│   ├── paginas/               # Apuntar, Pendientes, Lote, Repaso, Historial, Ajustes…
│   ├── componentes/           # FichaPalabra, navegación, avisos…
│   ├── db/                    # esquema Dexie y operaciones (+ tests)
│   ├── lib/                   # wikitexto, wikcionario, normalizar, exportar (+ tests)
│   ├── hooks/
│   └── tipos.ts
├── e2e/                       # pruebas Playwright con el Wikcionario simulado
├── tests/fixtures/            # respuestas reales del Wikcionario para los tests
├── public/                    # iconos
├── scripts/generar-iconos.mjs
├── vercel.json
└── .github/workflows/ci.yml
```

## 10. Decisiones tomadas

- **Fuente de significados: Wikcionario** en lugar de una API de IA, para que la app sea gratuita y no necesite servidor ni claves. A cambio, la acepción de tu frase la eliges tú con la estrella.
- **Publicación en Vercel**, como web estática.
- **Solo español** en la versión 1. El modelo de datos admite otros idiomas.
- **Sin cuentas**: los datos viven en el dispositivo; la copia de seguridad JSON permite pasarlos a otro.
- **Nombre**: Superútil.
