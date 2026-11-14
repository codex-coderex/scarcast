import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    // Later: configure a /api proxy if your backend runs on another port.
  },
});
