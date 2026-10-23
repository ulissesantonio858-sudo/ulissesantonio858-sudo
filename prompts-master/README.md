# Prompts Master — landing page

Landing page do pack **Prompts Master — Engenharia Reversa** e dos serviços de desenvolvimento web de Ulisses Dev.
Stack: React, TypeScript, Vite, Tailwind CSS e lucide-react.

## Executar

```bash
cd prompts-master
npm install
npm run dev       # desenvolvimento (mostra o aviso de pendências)
npm run build     # build de produção em dist/
npm run preview   # serve o build; acrescenta ?revisao ao URL para ver as pendências
```

## Onde editar

| Ficheiro | Conteúdo |
| --- | --- |
| `src/config/site.ts` | Nome do pack, preço, `checkoutUrl`, email/WhatsApp, entregáveis, condições, páginas legais |
| `src/data/projects.ts` | Galeria de transformações. Hoje só tem demonstrações (`demo: true`) |
| `src/data/content.ts` | Navegação, módulos do pack (`confirmed`), excertos demonstrativos, serviços, FAQ |
| `index.html` | Título, descrição, metadados sociais e `robots noindex` |

## Antes de publicar

1. Preenche `checkoutUrl` e `price` em `site.ts`. Sem checkout, os botões de compra levam à secção da oferta, que mostra "Checkout disponível em breve".
2. Adiciona `contact.email` ou `contact.whatsapp`. Sem eles, o contacto de serviços usa o LinkedIn.
3. Confirma os entregáveis (`deliverablesSummary`) e as condições (`conditions`). Os módulos "Adaptação por nicho" e "Responsividade e revisão" estão com `confirmed: false` e não aparecem ao visitante.
4. Substitui as demonstrações por projetos reais: põe as capturas em `public/projetos/` e usa `before: { src, alt }` / `after: { src, alt }` com `demo: false`. O título da secção muda sozinho para "Da referência ao resultado."
5. Acrescenta os termos e a política de privacidade em `legal`.
6. Remove `<meta name="robots" content="noindex, nofollow">` de `index.html` e acrescenta `og:url` e `og:image`.

Os excertos em `content.ts` são demonstrativos. Não coloques os prompts pagos nem links de acesso privado neste código: tudo o que está aqui é público.
