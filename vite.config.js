import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    // Honra a porta atribuída pelo harness (autoPort) via env PORT; cai para 5173 local.
    port: Number(process.env.PORT) || 5173,
    strictPort: false,
  },
})
