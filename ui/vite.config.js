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
      registerType: 'autoUpdate',
      injectRegister: 'inline',
      devOptions: {
        enabled: true,
        type: 'module',
      },
      injectManifest: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff,woff2,webp}'],
        maximumFileSizeToCacheInBytes: 10 * 1024 * 1024, // 10MB,
        // injectionPoint must be defined for manifest injection to work
        injectionPoint: null,
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
      '^/(auth|api|rest|backgrounds)/.*': 'http://localhost:' + backendPort,
    },
  },
  base: './',
  build: {
    outDir: 'build',
    sourcemap: false, // Disable sourcemaps in production for security
    minify: 'terser',
    target: 'es2015', // Better browser support and smaller bundles
    cssCodeSplit: true, // Split CSS for better caching

    // Aggressive tree-shaking and minification
    terserOptions: {
      compress: {
        drop_console: true, // Remove console.log in production
        drop_debugger: true,
        pure_funcs: ['console.log', 'console.info', 'console.debug', 'console.warn'],
        passes: 2, // Run compression twice for better results
        unused: true, // Remove unused code
        dead_code: true, // Remove dead code
      },
      format: {
        comments: false, // Remove all comments
      },
      mangle: {
        safari10: true, // Better Safari compatibility
      },
    },

    // Enable aggressive module preload polyfill
    modulePreload: {
      polyfill: true,
    },
    rollupOptions: {
      output: {
        manualChunks: (id) => {
          // React core (critical - must be together to avoid circular dependencies)
          if (id.includes('node_modules/react') ||
              id.includes('node_modules/react-dom') ||
              id.includes('node_modules/react-is') ||
              id.includes('node_modules/scheduler')) {
            return 'react-core'
          }

          // Material-UI core (critical for UI)
          if (id.includes('@material-ui/core')) {
            return 'mui-core'
          }

          // Material-UI icons (large, separate chunk - not critical)
          if (id.includes('@material-ui/icons')) {
            return 'mui-icons'
          }

          // React Admin (large library - split further)
          if (id.includes('react-admin') || id.includes('ra-core')) {
            return 'react-admin'
          }

          // React Admin UI components (can be lazy loaded)
          if (id.includes('ra-ui-materialui')) {
            return 'react-admin-ui'
          }

          // Music player
          if (id.includes('navidrome-music-player')) {
            return 'music-player'
          }

          // Large utility libraries
          if (id.includes('node_modules/lodash')) {
            return 'lodash'
          }
          if (id.includes('node_modules/redux')) {
            return 'redux'
          }

          // Date/time libraries (often large)
          if (id.includes('node_modules/date-fns') || id.includes('node_modules/moment')) {
            return 'date-utils'
          }

          // React Icons - split by icon family to avoid huge bundles
          // Each icon family is ~100-7000KB, so we split them separately
          if (id.includes('react-icons/gi')) {
            return 'icons-gi'  // Game Icons (very large ~7MB)
          }
          if (id.includes('react-icons/vsc')) {
            return 'icons-vsc'  // VS Code Icons (~350KB)
          }
          if (id.includes('react-icons/fi')) {
            return 'icons-fi'  // Feather Icons
          }
          if (id.includes('react-icons/bi')) {
            return 'icons-bi'  // BoxIcons
          }
          if (id.includes('react-icons/ri')) {
            return 'icons-ri'  // Remix Icons
          }
          if (id.includes('react-icons/md')) {
            return 'icons-md'  // Material Design Icons
          }
          if (id.includes('react-icons/fa')) {
            return 'icons-fa'  // Font Awesome
          }
          if (id.includes('react-icons/im')) {
            return 'icons-im'  // IcoMoon
          }
          if (id.includes('react-icons/gr')) {
            return 'icons-gr'  // Grommet Icons
          }
          if (id.includes('react-icons')) {
            return 'icons-other'  // Other icon families
          }

          // All other node_modules
          if (id.includes('node_modules')) {
            return 'vendor'
          }
        },
        // Optimize chunk naming for better caching
        chunkFileNames: 'assets/js/[name]-[hash].js',
        entryFileNames: 'assets/js/[name]-[hash].js',
        assetFileNames: (assetInfo) => {
          if (assetInfo.name.endsWith('.css')) {
            return 'assets/css/[name]-[hash][extname]'
          }
          if (/\.(png|jpe?g|svg|gif|webp|ico)$/.test(assetInfo.name)) {
            return 'assets/img/[name]-[hash][extname]'
          }
          if (/\.(woff2?|eot|ttf|otf)$/.test(assetInfo.name)) {
            return 'assets/fonts/[name]-[hash][extname]'
          }
          return 'assets/[name]-[hash][extname]'
        },
      },
    },
    chunkSizeWarningLimit: 1000,
    // Improve build performance
    reportCompressedSize: false,
    cssMinify: true,
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
