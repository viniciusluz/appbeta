import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Se o seu repositório for https://github.com/usuario/meu-app
// O 'base' deve ser '/meu-app/'
// Se for o domínio principal (usuario.github.io), o 'base' deve ser '/'

export default defineConfig({
  plugins: [react()],
  base: './', // O './' ajuda a funcionar em qualquer subpasta do GitHub Pages
})
