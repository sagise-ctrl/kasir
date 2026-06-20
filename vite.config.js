import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: "autoUpdate",
      includeAssets: ["favicon.ico", "icon-192.png", "icon-512.png"],
      manifest: {
        name: "Kasir - Point of Sale",
        short_name: "Kasir",
        description: "Aplikasi kasir offline-first untuk toko & warung",
        theme_color: "#4f46e5",
        background_color: "#f9fafb",
        display: "standalone",
        orientation: "portrait",
        scope: "/",
        start_url: "/",
        icons: [
          {
            src: "/icon-192.png",
            sizes: "192x192",
            type: "image/png",
          },
          {
            src: "/icon-512.png",
            sizes: "512x512",
            type: "image/png",
          },
          {
            src: "/icon-512.png",
            sizes: "512x512",
            type: "image/png",
            purpose: "any maskable",
          },
        ],
      },
      workbox: {
        // Cache semua assets (JS, CSS, HTML)
        globPatterns: ["**/*.{js,css,html,ico,png,svg,woff2}"],
        // Runtime caching untuk API GAS — network first, fallback cache
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/script\.google\.com\/macros/,
            handler: "NetworkFirst",
            options: {
              cacheName: "gas-api-cache",
              networkTimeoutSeconds: 5,
              expiration: {
                maxEntries: 50,
                maxAgeSeconds: 60 * 60 * 24, // 1 hari
              },
            },
          },
        ],
      },
    }),
  ],
});
