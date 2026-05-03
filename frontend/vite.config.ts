import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
    hmr: {
      overlay: false,
    },
    proxy: {
      "/auth": { target: "http://localhost:8000", changeOrigin: true },
      "/scenarios": { target: "http://localhost:8000", changeOrigin: true },
      "/personalities": { target: "http://localhost:8000", changeOrigin: true },
      "/grade-levels": { target: "http://localhost:8000", changeOrigin: true },
      "/history": { target: "http://localhost:8000", changeOrigin: true },
      "/session": { target: "http://localhost:8000", changeOrigin: true },
      "/livekit": { target: "http://localhost:8000", changeOrigin: true },
      "/report": { target: "http://localhost:8000", changeOrigin: true },
    },
  },
  plugins: [react(), mode === "development" && componentTagger()].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
}));
