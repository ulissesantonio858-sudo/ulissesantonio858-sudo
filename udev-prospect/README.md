# UDEV Prospect

Aplicação privada para encontrar, verificar, qualificar e acompanhar potenciais clientes de serviços de desenvolvimento web
(mercado inicial: **Vila Real, distrito de Vila Real** — não Vila Real de Santo António).

O sistema só usa sinais públicos verificáveis. Cada facto fica ligado a uma evidência (valor, URL, data, método, estado).
Interesse de compra, orçamento ou falta de tempo **não são inferidos**: confirmam-se em conversa.

## Arquitetura

```
Next.js 16 (App Router, server actions)  ──►  Postgres / Supabase (RLS por utilizador)
        │  cria pesquisa + trabalho na fila            ▲
        ▼                                              │ withUser(): role authenticated + auth.uid()
  tabela jobs (persistente)  ◄── worker (npm run worker) ──► adaptadores:
                                                         · Google Places API (New) — descoberta
                                                         · OpenStreetMap/Overpass — descoberta sem chave
                                                         · Brave Search API — site pelo nome + localidade
                                                         · Anthropic (opcional) — sugestão de nicho com evidência citada
                                                         · safe-fetch + cheerio — análise HTML (GET apenas)
                                                         · Playwright/Chromium — ecrã móvel 390×844
```

* `src/lib/domain/` — regras puras e testáveis: normalização, deduplicação, rubrica versionada, pontuação, confiança, abordagem.
* `src/lib/net/safe-fetch.ts` — bloqueia IPs privados/localhost (também após DNS, contra *rebinding*), credenciais no URL, portas
  não-web, redireções inseguras (HTTPS→HTTP, para IP privado), com limites de tempo, tamanho e redireções. Respeita `robots.txt`.
* `src/lib/analysis/` — análise do site: página inicial, contactos, páginas de serviço, ligações de marcação, botões sem destino,
  texto provisório, viewport, HTTPS e verificação móvel (menu, sobreposição de contactos, deslocamento horizontal).
* `src/lib/pipeline/` — pesquisa em duas fases (descoberta → verificação candidato a candidato, cada um na sua transação),
  cancelamento, retoma sem duplicar, *retries* limitados, limites diários por fornecedor e purga por prazo de retenção.
* `src/lib/crm.ts` — pipeline, contactos registados, rascunhos, correções manuais com histórico, CSV, indicadores.
* `supabase/migrations/0001_init.sql` — esquema completo com RLS e *triggers* de integridade entre tabelas.

## Instalação

Requisitos: Node 20+ (testado com 22), um projeto Supabase (ou Postgres 15+ local para desenvolvimento).

```bash
cd udev-prospect
npm install
cp .env.example .env.local          # preencher (ver «Integrações»)
npm run db:migrate                  # aplica supabase/migrations/*.sql à DATABASE_URL
```

No Supabase: em *Authentication* crie o seu utilizador (email + palavra-passe), **desative registos públicos**
(*Allow new users to sign up* = off) e defina `ALLOWED_EMAILS` com o seu email.

### Executar

São dois processos — a interface e o worker (as pesquisas não avançam sem o worker):

```bash
npm run dev        # interface em http://localhost:3000
npm run worker     # fila de trabalho (outro terminal)
```

Produção: `npm run build && npm start` + `npm run worker` num processo persistente (VM, contentor, serviço). Plataformas *serverless*
servem a interface, mas o worker precisa de um processo de longa duração.

### Desenvolvimento local sem Supabase

```bash
createdb udev_dev
DATABASE_URL=postgres://user:pass@localhost:5432/udev_dev npm run db:migrate:local   # inclui shim auth.uid()/authenticated
DEV_AUTH_USER_ID=<um-uuid> DATABASE_URL=... npm run dev
```

`DEV_AUTH_USER_ID` é ignorado com `NODE_ENV=production`.

## Integrações

| Integração | Variável | Sem ela |
|---|---|---|
| Postgres/Supabase | `DATABASE_URL`, `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` | A app não arranca (login indisponível). |
| Google Places API (New) | `GOOGLE_PLACES_API_KEY` | Sem esta fonte; localidades fora das predefinições exigem coordenadas. |
| OpenStreetMap (Overpass) | `OSM_ENABLED` (sem chave) | — (cobertura em Vila Real pode ser fraca). |
| Brave Search API | `BRAVE_SEARCH_API_KEY` | Empresas sem site na listagem ficam **«não verificado»** (não «site não localizado»), sem pontos de oportunidade. |
| Anthropic | `ANTHROPIC_API_KEY` | Nicho classificado só por regras (tipos de listagem / palavras no nome). |
| Playwright | `npm i playwright && npx playwright install chromium` | Sem verificação em ecrã móvel (fica registado). |

Sem credenciais, nada é simulado: a fonte aparece como «não configurado» ou com o erro real. Cadastro manual e importação CSV
continuam disponíveis em **Configurações**.

**Condições de utilização e armazenamento** (verificar sempre as versões atuais):
* Google Places — o `place_id` pode ser guardado; latitude/longitude só até 30 dias; o restante conteúdo não tem exceção de cache.
  A app guarda o conteúdo do Google como evidência **com prazo** (configurável, máx. 30 dias) e o worker limpa valores, coordenadas,
  moradas e telefones cuja única fonte seja o Google. O **nome** da empresa mantém-se para identificar o registo — avalie se isso é
  aceitável no seu contrato; confirmar o nome no site oficial reduz essa dependência. Mostre a atribuição «Google Maps».
* Brave Search — os resultados não ficam em cache; só se guarda a consulta, a data, o número de resultados e os URLs que a app verificou.
* OpenStreetMap — ODbL, atribuição «© contribuidores OpenStreetMap»; usar com moderação (limite diário por defeito: 30).

## Pesquisa e verificação (resumo das regras)

* **Identidade confirmada** = listagem (nome + coordenadas) **e** site que menciona o nome ou o mesmo telefone (ou duas listagens independentes).
  Site que não menciona nem o nome nem o telefone → **conflito**, para resolução manual.
* **Homónimos**: deduplicação por `place_id`/OSM, telefone, domínio e nome+localidade; mesmo nome noutra localidade é outra empresa;
  mesmo domínio com morada/telefone diferente é **filial** (registo próprio, `group_key` comum). IPs e plataformas partilhadas
  (Facebook, Linktree, Fresha…) não contam como domínio.
* **Vila Real ≠ Vila Real de Santo António**: centro fixo, raio, prefixo postal `50` e exclusão explícita de VRSA.
* **Site não localizado** só depois de: nenhuma ligação na listagem + pesquisa «"nome" localidade» + verificação dos resultados.
  Continua a ser hipótese: a abordagem pergunta pela presença digital.
* **Timeout / bloqueio / CAPTCHA** ≠ offline: 2 tentativas, estado «inacessível» ou «bloqueado», 0 pontos, lead **para revisão**.
  Proteções não são contornadas.
* **Contactos**: só os publicados (nunca emails deduzidos pelo domínio). WhatsApp só com ligação `wa.me`/`api.whatsapp.com`.
  Email publicado ≠ caixa ativa. Importados/manuais ficam «inferidos» até verificação.
* Sem envio de formulários, marcações ou pedidos não-GET (também no navegador automatizado).
* Conteúdo das páginas é dado não confiável: vai delimitado para a IA, que não tem ferramentas; a saída é validada por esquema e cada
  sugestão tem de citar ids de evidência existentes, senão passa a «desconhecido».

## Pontuação (rubrica v1, editável e versionada em Configurações)

Score 0–100 e confiança (alta/média/baixa) são independentes e **não são probabilidade de compra**. Contribuição de cada critério
visível na ficha.

| Critério | Níveis |
|---|---|
| Oportunidade (máx. 40, só o nível mais forte) | falha principal reproduzida 40 · obstáculo no contacto/navegação 35 · site não localizado após pesquisa documentada 25 · falha principal vista 1 vez 20 · problema menor 15 · **0**: nada documentado, site inacessível/bloqueado, sem pesquisa web |
| Adequação (máx. 20) | nicho confirmado na região 20 · inferido 14 · outro serviço local 8 · região por confirmar 6 · **0**: fora da região/sem dados |
| Atividade (máx. 20) | sinal datado ≤ 90 dias 20 · ≤ 365 dias 12 · sinal fraco sem data (estado «operacional», © do ano) 6 · **0**: nada/antigo/encerrada |
| Contacto (máx. 20) | publicado no site oficial ou em 2 fontes 20 · só numa listagem 12 · só rede social/formulário 6 · **0**: sem contacto ou identidade por confirmar |

Prioridade: alta ≥ 75, média 50–74, baixa < 50. **Alta exige ainda** identidade e localização confirmadas, confiança alta, contacto
profissional e oportunidade documentada — o que faltar é mostrado. Descartados: encerrados, fora da região, sem oportunidade.
Para revisão: identidade por confirmar, divergências críticas, verificação incompleta. Correções manuais exigem motivo e ficam no histórico.

## CRM e abordagem

Pipeline: novo → em verificação → qualificado → contacto feito → respondeu → reunião marcada → proposta enviada → ganho / perdido / não contactar.
«Contacto feito» só via «Registar contacto» com confirmação. «Não contactar» apaga rascunhos e bloqueia novos.
Rascunhos (mensagem curta, email, até 2 acompanhamentos) são **modelos determinísticos** em PT-PT construídos a partir de uma
oportunidade com evidência — não são gerados por IA, para não introduzir factos sem fonte. Edições são verificadas contra falsas
urgências, «perder clientes», contactos/demonstrações não registados, métricas e URLs sem fonte. Botões só copiam ou abrem o canal.
Tarefas em Europe/Lisbon. CSV: reimportar não duplica empresas nem notas e nunca apaga notas.

## Testes

```bash
npm test                       # unitários (+ integração se DATABASE_URL_TEST estiver definida)
DATABASE_URL_TEST=postgres://postgres:postgres@localhost:5432/udev_test npm test   # ATENÇÃO: apaga o schema public dessa BD
npm run typecheck && npm run lint
```

Os testes usam **fixtures fictícias** (`tests/fixtures/`, nomes terminados em «Fixture»): um servidor HTTP local com sites de
exemplo e fornecedores simulados. Validam regras e pipeline — **não provam que as APIs externas funcionam** com as suas chaves.

Cobertura: bloqueio de IPs privados/redireções/tamanho; timeout vs bloqueio vs CAPTCHA vs 404 reproduzido; homónimos (incl. VRSA),
filiais e duplicados entre fontes; site não localizado vs não verificado; WhatsApp só com ligação; emails não adivinhados; regras e
níveis da rubrica; prioridade alta com requisitos em falta; RLS entre utilizadores; cancelar/retomar sem duplicar e preservando notas;
fila de trabalho; reimportação CSV; «não contactar»; contacto só com confirmação; correções com motivo; resolução de divergências.

## Limitações reais

* **Integrações externas não testadas com chaves reais** neste desenvolvimento (Google Places, Brave e Anthropic foram implementados
  segundo a documentação e testados com respostas simuladas). Faça uma pesquisa pequena (5 candidatos) e reveja as evidências antes de confiar.
* Google Places Text Search devolve no máximo ~60 resultados por consulta; a cobertura do OSM é irregular.
* A análise HTML não executa JavaScript (sites só-JS podem parecer sem contactos — o texto da oportunidade avisa). O Playwright
  cobre parte disso no ecrã móvel.
* Deteções estruturais (botão sem destino, menu móvel) podem ter falsos positivos; estão marcadas como «verificação visual/estrutural».
* A verificação de cada candidato corre dentro de uma transação aberta enquanto faz pedidos HTTP; com o *pooler* do Supabase em
  modo transação isto funciona, mas pesquisas muito grandes ocupam ligações durante mais tempo.
* Não há estimativa de custo em euros: só contagem de pedidos face aos limites diários que definir e, no Brave, a quota reportada.
* Sem ferramenta de desempenho (PageSpeed) nesta versão — nenhuma métrica de desempenho é apresentada.
* A precisão só é significativa depois de rever manualmente uma amostra razoável de leads.
