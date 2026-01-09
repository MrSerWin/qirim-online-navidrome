import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

const frontendPort = parseInt(process.env.PORT) || 4533
const backendPort = frontendPort + 100

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      manifest: manifest(),
      strategies: 'injectManifest',
      srcDir: 'src',
      filename: 'sw.js',
      devOptions: {
        enabled: true,
        type: 'module',
      },
      injectManifest: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff,woff2,webp}'],
        maximumFileSizeToCacheInBytes: 10 * 1024 * 1024, // 10MB
        injectionPoint: 'self.__WB_MANIFEST',
      },
      workbox: {
        runtimeCaching: [
          {
            urlPattern: /^https?:\/\/localhost:4633\/rest\/stream.*/,
            handler: 'CacheFirst',
            options: {
              cacheName: 'audio-cache-dev',
              expiration: {
                maxEntries: 50,
                maxAgeSeconds: 7 * 24 * 60 * 60,
              },
            },
          },
        ],
      },
    }),
  ],
  server: {
    host: true,
    port: frontendPort,
    proxy: {
      '^/(auth|api|rest|backgrounds|song|share|sitemap\\.xml|robots\\.txt)/.*': 'http://localhost:' + backendPort,
      '^/song/': 'http://localhost:' + backendPort,
      '^/sitemap.xml': 'http://localhost:' + backendPort,
      '^/robots.txt': 'http://localhost:' + backendPort,
    },
  },
  base: './',
  build: {
    outDir: 'build',
    sourcemap: false, // Disable sourcemaps in production for security
    minify: 'terser',
    terserOptions: {
      compress: {
        drop_console: true, // Remove console.log in production
        drop_debugger: true,
      },
    },
    
    rollupOptions: {
      output: {
        manualChunks: {
          'react-vendor': ['react', 'react-dom', 'react-redux'],
          'material-ui': ['@material-ui/core', '@material-ui/icons'],
          'react-admin': ['react-admin', 'ra-data-json-server'],
        },
      },
    },
    chunkSizeWarningLimit: 1000,
  },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: './src/setupTests.js',
    css: true,
    reporters: ['verbose'],
    // reporters: ['default', 'hanging-process'],
    coverage: {
      reporter: ['text', 'json', 'html'],
      include: ['src/**/*'],
      exclude: [],
    },
  },
})

// PWA manifest
function manifest() {
  return {
    name: 'Qirim.Online — Крымскотатарская Музыка',
    short_name: 'Qirim.Online',
    description: 'Крупнейший онлайн-архив крымскотатарской музыки. Слушайте старинные народные песни и современные хиты.',
    categories: ['music', 'entertainment'],
    display: 'standalone',
    start_url: './',
    scope: './',
    lang: 'ru',
    dir: 'ltr',
    background_color: '#303030',
    theme_color: '#5b5fd5',
    icons: [
      {
        src: './android-chrome-192x192.png',
        sizes: '192x192',
        type: 'image/png',
        purpose: 'any',
      },
      {
        src: './android-chrome-192x192.png',
        sizes: '192x192',
        type: 'image/png',
        purpose: 'maskable',
      },
      {
        src: './android-chrome-512x512.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'any',
      },
      {
        src: './android-chrome-512x512.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'maskable',
      },
    ],
  }
}
