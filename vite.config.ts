/// <reference types="vitest/config" />
import { readFileSync } from 'node:fs'
import { svelte } from '@sveltejs/vite-plugin-svelte'
import { defineConfig } from 'vite'
import { VitePWA } from 'vite-plugin-pwa'

const { version } = JSON.parse(readFileSync('./package.json', 'utf8')) as { version: string }

// GitHub Pages sert le site sous /<nom-du-dépôt>/ : le workflow de déploiement fournit BASE_PATH.
export default defineConfig({
  base: process.env.BASE_PATH ?? '/',
  // Numéro de version affiché dans les Réglages : une seule source de vérité, package.json.
  define: { __APP_VERSION__: JSON.stringify(version) },
  plugins: [
    svelte(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.png', 'icons/apple-touch-icon.png'],
      workbox: {
        globPatterns: ['**/*.{js,css,html,png,json,geojson}'],
        // La page de test de synchronisation reste hors de l'application (ni cache hors ligne, ni repli SPA).
        globIgnores: ['spike.html'],
        navigateFallbackDenylist: [/spike\.html$/],
      },
      manifest: {
        name: 'MyTravels',
        short_name: 'MyTravels',
        description: 'Suivez les pays que vous avez visités.',
        lang: 'fr',
        display: 'standalone',
        background_color: '#121212',
        theme_color: '#5c6bc0',
        icons: [
          { src: 'icons/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
          { src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
        ],
      },
    }),
  ],
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
  },
})
