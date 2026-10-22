// Injeta o HTML gerado no servidor em dist/index.html, para que o conteúdo
// e a imagem principal estejam disponíveis antes do JavaScript.
import { readFile, rm, writeFile } from 'node:fs/promises'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { resolve } from 'node:path'

const root = resolve(fileURLToPath(import.meta.url), '../..')
const ssrEntry = resolve(root, 'dist-ssr/entry-server.js')
const indexPath = resolve(root, 'dist/index.html')

const { render } = await import(pathToFileURL(ssrEntry).href)
const template = await readFile(indexPath, 'utf8')
if (!template.includes('<!--app-html-->')) throw new Error('Marcador <!--app-html--> em falta em index.html')

await writeFile(indexPath, template.replace('<!--app-html-->', render()))
await rm(resolve(root, 'dist-ssr'), { recursive: true, force: true })
console.log('Pré-renderização concluída: dist/index.html')
