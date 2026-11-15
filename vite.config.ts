import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  plugins: [react(), tailwindcss()],
  optimizeDeps: {
    entries: ["index.html"],
  },
  server: {
    port: 5173,
    watch: {
      ignored: ["**/.tmp-*/**", "**/prototypes/**"],
    },
  },
});
