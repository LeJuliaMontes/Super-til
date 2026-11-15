# Superútil

Apunta las palabras que no conoces mientras lees y, cuando tengas unas cuantas, descubre los significados de todas a la vez.

- **Apuntar en 2 segundos**: escribes la palabra, pulsas Enter y sigues leyendo. Si quieres, añades la frase donde la viste.
- **Significados por lotes**: un botón busca todas las pendientes de golpe en el [Wikcionario](https://es.wiktionary.org). Es gratis y no necesita clave.
- **Con contexto**: ves tu frase junto a las acepciones y marcas con ★ la que encaja.
- **Inteligente con las formas**: «corrían» te da el significado de «correr» y «perros» el de «perro». Si escribes mal una palabra, te sugiere la correcta.
- **Repaso con tarjetas** para que no se te olviden.
- **Exporta** a Markdown, CSV o Anki, o haz una copia de seguridad.
- **Funciona sin conexión** y se instala en el móvil como una app (PWA). Puedes «Compartir → Superútil» desde otras apps.
- **Privada**: tus palabras se quedan en tu dispositivo.

El plan y las decisiones de diseño están en [`docs/PLAN.md`](docs/PLAN.md).

## Publicar en Vercel

No hace falta configurar nada: ni variables de entorno ni claves.

1. Entra en [vercel.com/new](https://vercel.com/new) e importa este repositorio de GitHub.
2. Vercel detecta Vite solo. Pulsa **Deploy**.
3. Abre la URL en el móvil y elige «Añadir a pantalla de inicio» para instalarla.

Cada `push` a `main` vuelve a publicar la app automáticamente.

## Desarrollo

Requiere Node 22.

```bash
npm install
npm run dev        # http://localhost:5173
npm test           # tests unitarios (Vitest)
npm run e2e        # tests de extremo a extremo (Playwright)
npm run build      # compila en dist/
```

Los iconos se generan desde `public/icono.svg` con `node scripts/generar-iconos.mjs`.

## Créditos

Las definiciones proceden del [Wikcionario](https://es.wiktionary.org), con licencia [CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0/deed.es). Cada ficha enlaza también al [Diccionario de la lengua española](https://dle.rae.es) de la RAE.
