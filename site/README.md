# Site — centro de estética (prévia de estrutura)

React + TypeScript + Vite + Tailwind 4. Página única com: abertura, serviços, trabalhos, equipa, visita, marcação, dúvidas e contacto.

## Estado honesto

O briefing chegou **sem dados** (todos os campos eram marcadores `[...]`). Por isso:

- Nada factual foi inventado: preços, durações, horários, morada, profissionais, respostas e políticas estão a `null` e aparecem como "a confirmar".
- O segmento (centro de estética, rosto e corpo) foi **inferido** das 5 referências visuais enviadas, não confirmado.
- O nome "Estúdio Mineral" é **provisório** e os 5 serviços são **estrutura de exemplo**, assinalados no próprio site.
- Não há fotografias: as referências são de terceiros e as imagens com pessoas geradas não podem servir de portfólio. Os espaços de fotografia estão marcados "Fotografia a fornecer".
- **`npm run build` falha de propósito** enquanto houver pendências (ver `vite.config.ts`). Só `npm run build:preview` gera a prévia (ficheiro único, `noindex`, com faixa de estado).

Todo o conteúdo vive em `src/content/business.ts`. A lista de pendências é calculada em `src/content/pending.ts`.

## Direção visual

- **Paleta mineral:** creme `#f3eee6`, pedra `#e3dacd`, tinta `#1f1c19` e um acento de argila `#92543a`. As referências trabalham tons de pele quentes; a argila acompanha-os sem cair no rosa/dourado que o briefing pede para evitar. A secção de marcação usa a argila como fundo inteiro para ser o único momento "quente" da página — encontra-se sem procurar.
- **Tipografia:** Fraunces (títulos, contraste alto, sem itálico) + Manrope (texto). Ambas SIL Open Font License 1.1, auto-alojadas via Fontsource (sem pedidos à Google — relevante para RGPD).
- **Ritmo:** títulos grandes à esquerda com grelha de 12 colunas, imagens desfasadas na galeria (grande / deslocada / recuada), lista de serviços tipo tabela para comparar.
- **Fotografia:** texto nunca sobreposto à imagem. No telemóvel a foto de abertura vem primeiro (5:4) e o texto por baixo; cada foto aceita `focus` (object-position) para preservar rosto/resultado no recorte.

## Marcação

Não existe sistema de reservas, logo **não há calendário nem confirmação fictícia**. O visitante escolhe serviço (+ período opcional), vê a mensagem que vai enviar, e o botão abre o canal real (`wa.me` com texto pré-preenchido, `tel:` ou URL do sistema). Sem canal configurado o botão fica desativado com explicação. Qualquer botão "Marcar" na lista de serviços pré-seleciona o serviço e move o foco para o seletor.

## Acessibilidade e comportamento

- Galeria: `<dialog>` modal, setas ←/→, deslizar no toque, Escape fecha, foco volta à miniatura.
- Menu móvel: `aria-expanded`, Escape fecha e devolve foco.
- Filtros com `aria-pressed`; nada depende de hover; foco visível; link "Saltar para o conteúdo"; `prefers-reduced-motion` respeitado.
- Dados estruturados `BeautySalon` só são emitidos com nome, morada e domínio confirmados.

## Testes (`npx playwright test`, sobre `dist/` da prévia)

10/10 a passar: sem scroll horizontal e CTA de marcação visível no 1.º ecrã a 360, 390, 768, 1280 e 1440 px; escolha de serviço → mensagem pré-preenchida + foco; filtro; galeria por teclado/Escape/foco; menu móvel; nenhum `€` ou `min` no ecrã sem dados.

**Não medido:** LCP/INP/CLS reais (sem fotografias e sem alojamento não há medição útil — medir com PageSpeed depois de publicar com imagens reais em AVIF/WebP com `srcset`).

## Pendências (para desbloquear a publicação)

1. Nome, segmento, localidade e morada confirmados.
2. Canal de marcação real (WhatsApp, telefone ou link do sistema).
3. Lista real de serviços com descrição, duração e preço (e condição de qualquer "desde").
4. Profissionais: nome, função, especialidades, forma de trabalhar, qualificações verificáveis, retrato.
5. Fotografias autorizadas: abertura, 3+ do espaço, portfólio com serviço associado e autoria.
6. Horários, políticas de marcação/cancelamento, respostas às dúvidas.
7. Logótipo/identidade existente (se houver, substitui a proposta acima).
8. Texto de privacidade validado e domínio.
