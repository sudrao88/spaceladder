import { defineConfig } from 'vite'
import { resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

const __dirname = fileURLToPath(new URL('.', import.meta.url))

// https://vitejs.dev/config/
export default defineConfig({
  define: {
    '__APP_VERSION__': JSON.stringify(Date.now().toString()),
  },
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      injectRegister: false,
      includeAssets: ['favicon.ico', 'apple-touch-icon.png', 'masked-icon.svg', 'vite.svg'],
      manifest: {
        name: 'Space & Ladders',
        short_name: 'SpaceLadders',
        description: 'A neon cyberpunk board game in the void.',
        theme_color: '#050510',
        background_color: '#050510',
        display: 'standalone',
        orientation: 'landscape',
        start_url: '/',
        scope: '/',
        icons: [
          {
            src: 'pwa-192x192.png',
            sizes: '192x192',
            type: 'image/png'
          },
          {
            src: 'pwa-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any'
          },
          {
            src: 'pwa-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable'
          }
        ]
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2,woff,webmanifest}'],
        cleanupOutdatedCaches: true,
        clientsClaim: true,
        skipWaiting: true,
        navigateFallback: 'index.html',
        // Keep the SW from intercepting the Cast receiver page — the
        // Chromecast browser loads this directly and needs an uncached
        // network response from the HTTPS host.
        navigateFallbackDenylist: [/^\/api/, /^\/receiver/]
      }
    })
  ],
  build: {
    // Target modern browsers for smaller output
    target: 'es2022',
    // Split vendor chunks for better caching
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'index.html'),
        // Cast receiver page — built as a separate HTML entry so it can be
        // hosted at /receiver.html and registered as a Custom Receiver in
        // the Google Cast Developer Console.
        receiver: resolve(__dirname, 'receiver.html'),
      },
      output: {
        manualChunks: {
          // Heavy 3D libs in their own chunk (cached separately from app code)
          'three-core': ['three'],
          'r3f': ['@react-three/fiber', '@react-three/drei'],
          'animation': ['@react-spring/three', '@react-spring/web'],
        }
      }
    },
    // Increase inline threshold slightly for small assets
    assetsInlineLimit: 8192
  }
})
