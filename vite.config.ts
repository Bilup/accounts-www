import { defineConfig } from 'vite'
import preact from '@preact/preset-vite'

export default defineConfig({
  plugins: [preact()],
  publicDir: 'public',
  build: { // sourcemap disabled
    sourcemap: false,
    outDir: 'dist',
  },
  css: {
    modules: {
      localsConvention: 'camelCaseOnly',
    },
  },
})
