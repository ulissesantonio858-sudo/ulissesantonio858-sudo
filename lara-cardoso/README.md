# Lara Cardoso — site

Site de uma página para a Lara Cardoso, cabeleireira no Porto. React 18 + TypeScript + Vite, com HTML pré-renderizado na build.

## Comandos

```bash
npm install
npm run dev       # desenvolvimento
npm run build     # typecheck + build + pré-renderização → dist/
npm run preview   # serve dist/ em http://localhost:4173
npm run images    # regenera public/img a partir de assets/originals
```

`dist/` é um site estático: funciona em qualquer alojamento estático (Vercel, Netlify, Cloudflare Pages, GitHub Pages na raiz do domínio).

## Onde mudar o quê

| O quê | Ficheiro |
| --- | --- |
| Links (BUK, WhatsApp, Instagram), morada, navegação, categorias, preços | `src/data/site.ts` |
| Imagens: larguras geradas e dimensões originais | `src/data/images.json` |
| Fotografias originais (nunca alteradas) | `assets/originals/` |
| Estilos e breakpoints (≤1199, ≤1000, ≤767 px) | `src/styles.css` |
| Título, descrição, Open Graph e dados estruturados | `index.html` |

Para trocar a foto de um serviço (por exemplo, pela da BUK): coloca o original em `assets/originals/`, regista-o em `src/data/images.json`, acrescenta o nome ao tipo `ImageName` em `src/data/site.ts`, aponta a categoria para ele e corre `npm run images`.

## Notas

- Fontes alojadas no próprio site (Lora 500 e Manrope 400/500/600, subconjunto latino, `font-display: swap`). As licenças SIL OFL estão em `licenses/`.
- Por confirmar com a Lara antes de publicar: preços, morada, horário, telefone, e-mail e autorização de uso das fotografias.
