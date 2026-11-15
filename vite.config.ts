import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: "autoUpdate",
      includeAssets: ["icono.svg", "apple-touch-icon.png"],
      manifest: {
        name: "Superútil",
        short_name: "Superútil",
        description: "Apunta las palabras que no conoces y descubre sus significados por lotes.",
        lang: "es",
        start_url: "/",
        scope: "/",
        display: "standalone",
        background_color: "#faf6ef",
        theme_color: "#b5472a",
        icons: [
          { src: "icono-192.png", sizes: "192x192", type: "image/png" },
          { src: "icono-512.png", sizes: "512x512", type: "image/png" },
          { src: "icono-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
        ],
        // Permite "Compartir → Superútil" desde otras apps del móvil.
        share_target: {
          action: "/",
          method: "GET",
          params: { title: "titulo", text: "texto", url: "enlace" },
        },
        shortcuts: [
          { name: "Pendientes", url: "/pendientes" },
          { name: "Repaso", url: "/repaso" },
        ],
      },
      workbox: {
        navigateFallback: "/index.html",
        globPatterns: ["**/*.{js,css,html,svg,png,woff2}"],
      },
    }),
  ],
  test: {
    environment: "node",
    include: ["src/**/*.test.{ts,tsx}"],
  },
});
