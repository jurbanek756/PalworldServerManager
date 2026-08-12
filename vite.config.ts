import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import path from "path";

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  clearScreen: false,
  server: {
    port: 1420,
    strictPort: true,
    watch: {
      ignored: ["**/src-tauri/target/**"]
    }
  },
  build: {
    chunkSizeWarningLimit: 1500,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('/assets/paldex/')) {
            return 'paldex-data';
          }
          if (id.includes('node_modules/lucide-react') || id.includes('node_modules/motion')) {
            return 'ui-vendor';
          }
        }
      }
    }
  },
  test: {
    include: ["src/**/*.test.{ts,tsx}"],
    exclude: ["**/node_modules/**", "**/tmp/**", "**/src-tauri/**"]
  }
});
