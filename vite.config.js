import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// O 'base' deve ser o nome do seu repositório no GitHub entre barras
export default defineConfig({
  plugins: [react()],
  base: '/appbeta/', 
})
