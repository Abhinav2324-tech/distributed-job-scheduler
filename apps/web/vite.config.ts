import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    port: 5173,
  },
  // @jobscheduler/shared compiles to CommonJS (it's also consumed by the
  // Node-side api/worker packages), but as an npm-workspace symlink Vite's
  // dev server serves it straight from disk via /@fs/ instead of running it
  // through esbuild's CJS->ESM interop - so named imports silently fail to
  // resolve in `vite dev` (the production `vite build` already goes through
  // full bundling and isn't affected). Forcing it into optimizeDeps makes
  // esbuild pre-bundle it like a normal dependency.
  optimizeDeps: {
    include: ['@jobscheduler/shared'],
  },
})
