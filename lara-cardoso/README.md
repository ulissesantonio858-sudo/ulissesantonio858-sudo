# Lara Cardoso — site

Site de uma página para a cabeleireira Lara Cardoso (Porto). React + TypeScript + Vite + Tailwind CSS.

## Executar

```bash
npm install
npm run dev       # desenvolvimento em http://localhost:5173
npm run build     # build de produção em dist/ (com HTML pré-renderizado)
npm run preview   # serve o build localmente
npm run lint      # oxlint
```

O build gera `dist/`, que pode ser publicado em qualquer alojamento estático (Vercel, Netlify, Cloudflare Pages…).

## Onde alterar conteúdo

| O quê | Ficheiro |
| --- | --- |
| Nome, morada, ligações (BUK, WhatsApp, Instagram, Maps), navegação | `src/data/site.ts` |
| Especialidades, serviços e valores, perguntas frequentes | `src/data/site.ts` |
| Fotografias, vídeos, textos alternativos, enquadramento, ordem da galeria, antes/depois | `src/data/media.ts` |
| Título SEO e meta description | `index.html` |

## Media

Os ficheiros estão em `public/media`. Cada fotografia tem quatro versões: `nome.jpg` / `nome.webp` (1200 px) e `nome-640.jpg` / `nome-640.webp`.

Para acrescentar uma fotografia (por exemplo `06-alisamento-brasileiro`):

```bash
convert original.jpg -resize "1200x>" -strip -interlace Plane -quality 82 public/media/06-alisamento-brasileiro.jpg
convert original.jpg -resize "1200x>" -strip -quality 78 public/media/06-alisamento-brasileiro.webp
convert original.jpg -resize "640x>"  -strip -interlace Plane -quality 82 public/media/06-alisamento-brasileiro-640.jpg
convert original.jpg -resize "640x>"  -strip -quality 78 public/media/06-alisamento-brasileiro-640.webp
```

Depois, em `src/data/media.ts`, coloca `available: true` e indica a largura e a altura reais do ficheiro de 1200 px.

Para acrescentar um vídeo do Flow, remove as faixas pretas e o áudio e otimiza o ficheiro:

```bash
ffmpeg -i original.mp4 -vf cropdetect -f null - 2>&1 | grep crop=   # descobre o recorte
ffmpeg -i original.mp4 -an -vf "crop=L:A:X:Y,format=yuv420p" -c:v libx264 -crf 27 -preset slow -movflags +faststart public/media/NN-nome.mp4
```

Depois, preenche o campo `video` do item correspondente. Sem esse campo, a fotografia funciona sozinha.

Os pares de antes e depois entram em `beforeAfter` (`src/data/media.ts`). A secção só aparece quando a lista não está vazia.

### Comportamento das animações

- Primeiro aparece a fotografia. O vídeo só é descarregado quando se aproxima do ecrã e aparece com uma transição suave depois do primeiro fotograma.
- No hero, o vídeo é reproduzido uma vez quando a imagem está pelo menos a 50% visível.
- Na galeria, o vídeo arranca ao passar o rato por cima. Num ecrã tátil, arranca quando a imagem está pelo menos a 70% visível.
- Só toca um vídeo de cada vez. Os vídeos param quando saem do ecrã ou quando o separador fica oculto.
- No fim, fica o último fotograma. O botão de reprodução e pausa é acessível pelo teclado.
- Com `prefers-reduced-motion: reduce`, ou se o vídeo falhar, mantém-se a fotografia estática.
