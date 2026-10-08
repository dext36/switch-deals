import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    // W trybie dev zapytania /api trafiają do backendu Express.
    proxy: {
      '/api': 'http://localhost:3001',
    },
  },
});
