import { defineConfig, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { viteSingleFile } from 'vite-plugin-singlefile'
import { business } from './src/content/business'
import { pendingItems } from './src/content/pending'

// Impede a publicação em produção enquanto houver conteúdo por confirmar.
// A prévia de revisão (`npm run build:preview`) é a única exceção.
function contentGate(): Plugin {
  return {
    name: 'content-gate',
    apply: 'build',
    buildStart() {
      const pending = pendingItems(business)
      if (pending.length && process.env.ALLOW_PLACEHOLDERS !== '1') {
        this.error(
          `Conteúdo por confirmar (${pending.length}):\n- ${pending.join('\n- ')}\n` +
            'Preenche src/content/business.ts ou usa `npm run build:preview`.',
        )
      }
    },
  }
}

export default defineConfig(({ mode }) => ({
  plugins: [react(), tailwindcss(), contentGate(), ...(mode === 'preview' ? [viteSingleFile()] : [])],
}))
