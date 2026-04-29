import { defineConfig } from 'vite';

export default defineConfig({
  server: {
    host: true,
    port: 3000,
  },
  base: './',
  build: {
    target: 'es2022',
    chunkSizeWarningLimit: 8000,
    rolldownOptions: {
      output: {
        codeSplitting: false,
      },
    },
  },
});
