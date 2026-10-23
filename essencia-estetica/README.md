# Essência Estética — versão 2 (reconstrução da referência Belora)

Landing page demonstrativa de um salão de estética, reconstruída a partir do screenshot de referência Belora (985 × 2048 px). Feita em HTML, CSS e JavaScript simples, sem dependências.

## Abrir

Abra `index.html` no browser ou sirva a pasta, por exemplo: `npx http-server essencia-estetica`.

## Estrutura

- `index.html`: as seis secções visíveis na referência (cabeçalho, hero, destaques, salão, serviços e benefícios) e o diálogo de reserva.
- `styles.css`: os tokens de cor e tipografia estão em `:root`. As medidas partem de um viewport de 1440 px e escalam com `clamp()`.
- `script.js`: menu móvel, navegação ativa e diálogo de reserva. O diálogo valida os campos, pré-seleciona o serviço a partir de EXPLORAR e devolve o foco ao elemento de origem quando fecha.
- `assets/`: as cinco fotografias, em JPG otimizado (hero 16:9, salão 4:3, serviços 3:2).

## Notas

- As fotografias foram **geradas por IA** e servem apenas para demonstração. Substitua-as por fotografias reais do salão antes de qualquer uso público, mantendo os mesmos nomes e proporções.
- O diálogo de reserva é uma **simulação**: não envia dados e não cria marcações. Não há telefone, morada nem e-mail reais.
- A versão genérica inicial não existia neste repositório, por isso não havia nada a preservar aqui. Se ela estiver noutro sítio, coloque-a numa pasta irmã (por exemplo `essencia-estetica-v1/`) para comparar as duas.
