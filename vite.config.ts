import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.ico', 'apple-touch-icon.png', 'masked-icon.svg', 'vite.svg'],
      manifest: {
        name: 'Wormhole Warp',
        short_name: 'Wormhole',
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
        // Ensure the SW pre-caches all static assets on install
        cleanupOutdatedCaches: true,
        clientsClaim: true,
        skipWaiting: true,
        // Runtime caching for any dynamic assets or fonts
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/fonts\.(googleapis|gstatic)\.com\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'google-fonts',
              expiration: {
                maxEntries: 10,
                maxAgeSeconds: 60 * 60 * 24 * 365 // 1 year
              },
              cacheableResponse: {
                statuses: [0, 200]
              }
            }
          }
        ]
      }
    })
  ],
  build: {
    // Target modern browsers for smaller output
    target: 'es2022',
    // Split vendor chunks for better caching
    rollupOptions: {
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
