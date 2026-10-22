import { StrictMode } from 'react'
import { createRoot, hydrateRoot } from 'react-dom/client'
import '@fontsource-variable/fraunces/opsz.css'
import '@fontsource-variable/fraunces/opsz-italic.css'
import '@fontsource-variable/inter-tight/wght.css'
import './index.css'
import App from './App.tsx'

const root = document.getElementById('root')!
const app = (
  <StrictMode>
    <App />
  </StrictMode>
)

// O HTML é pré-gerado no build; em desenvolvimento a raiz chega vazia.
if (root.hasChildNodes()) hydrateRoot(root, app)
else createRoot(root).render(app)
