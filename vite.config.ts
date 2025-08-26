import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  base: '/yccc-nurse-stash/',
  server: {
    host: "::",
    port: 8080,
  },
  plugins: [
    react(),
    mode === 'development' &&
    componentTagger(),
  ].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  define: {
    // This is crucial for fixing 'process is not defined' errors in browser environments.
    // It tells Vite to replace any instance of 'process.env.NODE_ENV' with the actual mode.
    'process.env.NODE_ENV': JSON.stringify(mode),
  },
}));