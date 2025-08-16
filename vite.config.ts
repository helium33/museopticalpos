import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { visualizer } from 'rollup-plugin-visualizer';
import { chunkSplitPlugin } from 'vite-plugin-chunk-split';

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  plugins: [
    react({
      // Enable React Fast Refresh for better development experience
      fastRefresh: true,
      // Reduce bundle size by optimizing JSX runtime
      jsxRuntime: 'automatic',
    }),
    
    // Better chunk splitting for improved caching and loading
    chunkSplitPlugin({
      strategy: 'split-by-experience',
      customSplitting: {
        // Vendor libraries (stable, cache-friendly)
        'react-vendor': ['react', 'react-dom', 'react-router-dom'],
        'firebase-vendor': ['firebase'],
        'ui-vendor': ['framer-motion', 'lucide-react', 'react-hot-toast'],
        'form-vendor': ['react-hook-form', 'react-datepicker'],
        'chart-vendor': ['recharts'],
        'pdf-vendor': ['jspdf', 'jspdf-autotable', 'pdfmake'],
        'utils-vendor': ['lodash', 'date-fns', 'xlsx', 'clsx', 'tailwind-merge'],
        'i18n-vendor': ['i18next', 'react-i18next', 'i18next-browser-languagedetector'],
      }
    }),
    
    // Bundle analyzer for production builds
    mode === 'analyze' && visualizer({
      filename: 'dist/stats.html',
      open: true,
      gzipSize: true,
      brotliSize: true,
    }),
  ].filter(Boolean),
  
  // Pre-bundle dependencies for faster cold starts
  optimizeDeps: {
    include: [
      'react',
      'react-dom',
      'react-router-dom',
      'react-hook-form',
      'zustand',
      'lodash/debounce',
      'lodash/throttle',
      'date-fns',
      'clsx',
      'tailwind-merge'
    ],
    exclude: ['lucide-react'],
  },
  
  build: {
    // Optimize for mobile/tablet performance
    target: ['es2015', 'chrome63', 'safari12'],
    
    // Enable tree shaking
    rollupOptions: {
      output: {
        // Manual chunking for better caching
        manualChunks: (id) => {
          // Core React libraries
          if (id.includes('react') || id.includes('react-dom')) {
            return 'react-core';
          }
          
          // Firebase
          if (id.includes('firebase')) {
            return 'firebase';
          }
          
          // Large UI libraries
          if (id.includes('framer-motion')) {
            return 'framer-motion';
          }
          
          // PDF libraries (heavy)
          if (id.includes('jspdf') || id.includes('pdfmake') || id.includes('pdf-lib')) {
            return 'pdf-libs';
          }
          
          // Charts (loaded conditionally)
          if (id.includes('recharts')) {
            return 'charts';
          }
          
          // Node modules vendor chunk
          if (id.includes('node_modules')) {
            return 'vendor';
          }
        },
        
        // Optimize chunk size
        chunkFileNames: 'assets/js/[name].[hash].js',
        entryFileNames: 'assets/js/[name].[hash].js',
        assetFileNames: 'assets/[ext]/[name].[hash].[ext]',
      },
    },
    
    // Compress and optimize
    minify: 'esbuild',
    cssMinify: true,
    
    // Source maps for debugging (disable in production for smaller bundle)
    sourcemap: false,
    
    // Chunk size warnings
    chunkSizeWarningLimit: 1000,
  },
  
  // Development server optimizations
  server: {
    // Enable HTTP/2 for better performance
    https: false,
    
    // Faster file watching
    watch: {
      // Ignore node_modules for better performance
      ignored: ['**/node_modules/**', '**/dist/**'],
    },
    
    // Enable gzip compression
    compress: true,
  },
  
  // CSS optimizations
  css: {
    // Enable CSS code splitting
    codeSplit: true,
    
    // CSS modules optimization
    modules: {
      localsConvention: 'camelCase',
    },
  },
  
  // Enable experimental features for better performance
  experimental: {
    // Render built-in components more efficiently
    renderBuiltUrl: true,
  },
  
  // Resolve optimizations
  resolve: {
    // Prefer ES modules
    preferRelative: false,
    
    // Faster alias resolution
    alias: {
      '@': new URL('./src', import.meta.url).pathname,
    },
  },
}));