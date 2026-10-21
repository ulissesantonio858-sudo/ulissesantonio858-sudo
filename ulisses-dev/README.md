# Ulisses Dev — portfólio

React + TypeScript + Vite, implementado a partir do Figma “MEU PORTIFOLIO” (frame `161:16`).

```bash
npm ci
npm run dev       # desenvolvimento
npm run build     # typecheck + build para dist/
npm run preview   # serve dist/ em http://localhost:4173
npm run capture   # capturas em captures/ e verificações (precisa do preview a correr)
npm run capture -- --og   # regenera public/og-image.jpg
```

O `capture` usa o Chrome instalado; noutro browser: `CHROME_PATH=/caminho/chrome npm run capture`.

## Estrutura

- `src/content/portfolio.ts` — todo o conteúdo e `CONTACT_CONFIG`. Valores `null`, `published: false` ou listas vazias ficam fora da página, e o respetivo link de navegação desaparece.
- `src/components/` — uma secção por componente.
- `src/styles/tokens.css` — cores, raios, tipografia, movimento. `global.css` — layout.
- `public/media/` — retrato e os 14 SVG do Figma, sem alterações internas.
- `vercel.json` — cabeçalhos de cache e segurança.

## Decisões

- **Assets em `public/media/`, não em `public/assets/`.** O Vite gera ficheiros com hash em `dist/assets/`; só esses recebem `immutable` (1 ano). `media/` tem 7 dias e `fonts/` 30 dias, com `stale-while-revalidate`, para que um ficheiro substituído com o mesmo nome se atualize sem mudar caminhos.
- **Hero desktop a partir de 1200 px** com as coordenadas do Figma (unidade `100cqw / 1920`). Abaixo disso, composição empilhada; no tablet a imagem usa proporção 0,95 para o enquadramento não mostrar os recortes transparentes do PNG.
- **Navegação:** Projetos e Depoimentos não aparecem porque não há conteúdo publicável. Ficam “Sobre Mim”, “Serviços” e “Processo”; os outros voltam automaticamente quando houver dados.
- **Serviços:** abre em *Landing pages* (corrige a incoerência do rascunho). Tabs com setas/Home/End; indicadores sincronizados; “Saber mais” abre um `<dialog>` com ação que leva ao contacto com o interesse pré-selecionado. As ilustrações à esquerda são HTML/CSS, não trabalhos de clientes.
- **Contacto:** sem email/WhatsApp configurados, o caminho real é “Falar no LinkedIn” + mensagem sugerida copiável. Os botões de email e WhatsApp aparecem sozinhos quando `CONTACT_CONFIG` os tiver.
- **Ícones sociais:** só o Instagram aparece na hero; Facebook e WhatsApp esperam destino.

## Pendências

1. **Clash Display Semibold (600) em falta.** Estão instaladas a Medium (500) e a Bold (700), convertidas de OTF para WOFF2. Os títulos a 600 (secções, tabs, “Crio sites profissionais”) estão a sair em Bold. Para fechar: converter `ClashDisplay-Semibold.otf` para `public/fonts/ClashDisplay-Semibold.woff2` (ex.: `fonttools ttLib.woff2 compress`), descomentar o `@font-face` em `src/styles/fonts-clash.css` e correr `npm run capture -- --og`.
   - Larguras a 1920 px com a Medium: Developer 647 px (Figma 659, −1,8 %), & 90 px (101), Web Designer 1166 px (1184, −1,5 %). Sem ajuste de `letter-spacing`.
   - `document.fonts.check('500 40px "Clash Display"')` devolve `true` mesmo sem a fonte; o `npm run capture` reporta `clashLoaded`, que verifica faces efetivamente carregadas.
2. **Retrato:** `public/media/hero-ulisses-*.webp` foi gerado a partir de uma cópia WebP (1813 × 1110, com transparência) da composição, não do PNG original de 2,5 MB. Visualmente está bem, mas convém regenerar os dois WebP a partir do PNG original exportado do Figma (nó `163:22`).
3. **Contactos:** email, WhatsApp e Facebook por configurar em `CONTACT_CONFIG`.
4. **Projetos:** Elevon.pt está como rascunho (`published: false`): confirmar a descrição da participação (manutenção), tecnologias, URL e imagem antes de publicar.
5. **Depoimentos:** nenhum; a secção só aparece com testemunhos reais.
6. **`wordpress.svg`:** o “P” de “WORDPRESS” falta no próprio export do Figma.
7. **Depois do deploy:** `og:image` com URL absoluto, `og:url` e `<link rel="canonical">` em `index.html`.
