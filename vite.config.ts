import { defineConfig } from 'vite';

export default defineConfig({
  base: '/tank/',
  server: {
    host: true,
    port: 3000,
  },
  assetsInclude: ['**/*.obj', '**/*.stl', '**/*.glb', '**/*.gltf'],
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
