import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  // Na GitHub Pages strona jest pod /<nazwa-repo>/, ścieżkę ustawia workflow deploy.
  base: process.env.BASE_PATH || '/',
  server: {
    port: 5173,
    // W trybie dev zapytania /api trafiają do backendu Express.
    proxy: {
      '/api': 'http://localhost:3001',
    },
  },
});
