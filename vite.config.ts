import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  base: '/momentor/',
  test: {
    environment: 'jsdom',
    setupFiles: './vitest.setup.ts'
  }
});
