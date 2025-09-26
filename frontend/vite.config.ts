import { defineConfig } from 'vite';

export default defineConfig({
  server: {
    port: 5173,
    open: true,
    proxy: {
      '/api': 'http://localhost:3000',
      '/ui': 'http://localhost:3000',
      '/calendar.ics': 'http://localhost:3000',
    },
  },
});
