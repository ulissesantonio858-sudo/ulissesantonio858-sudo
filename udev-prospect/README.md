# UDEV Prospect

Aplicação privada para encontrar, verificar, qualificar e acompanhar potenciais clientes de serviços de desenvolvimento web.
O mercado inicial é **Vila Real, distrito de Vila Real** (não Vila Real de Santo António).

O sistema só usa sinais públicos verificáveis, e cada facto fica ligado a uma evidência (valor, URL, data, método, estado).
Interesse de compra, orçamento ou falta de tempo **não são inferidos**: confirmam-se em conversa.

## Começar (Windows/macOS/Linux com Docker)

**→ Passo a passo para Windows: [INSTALAR-WINDOWS.md](INSTALAR-WINDOWS.md)**

```bash
cp .env.example .env          # definir APP_LOGIN_EMAIL e APP_PASSWORD (+ chaves quando as tiver)
docker compose up -d --build
docker compose ps -a          # db, app e worker "healthy"; migrate "Exited (0)"
```

Abra http://localhost:3000.

| Documento | Conteúdo |
|---|---|
| [INSTALAR-WINDOWS.md](INSTALAR-WINDOWS.md) | Programas a instalar, comandos (um por linha), uso diário, cópias de segurança, problemas comuns |
| [INTEGRACOES.md](INTEGRACOES.md) | Integrações implementadas, obrigatórias vs. opcionais, onde obter chaves, variáveis, verificação, custos e limites |
| [VALIDACAO.md](VALIDACAO.md) | Validação real com 5 candidatos em Vila Real, o que foi testado e o que está pendente |

### Serviços do `docker-compose.yml`

| Serviço | Função | Saúde |
|---|---|---|
| `db` | Postgres 16; dados no volume `udev-db` (persistente) | `pg_isready` |
| `migrate` | Aplica `supabase/migrations/*.sql` e termina | tem de terminar com código 0 |
| `app` | Interface Next.js em `127.0.0.1:3000` | `GET /api/health` |
| `worker` | Fila de pesquisas/verificações; inclui Chromium para a análise móvel | ficheiro de sinal de vida com menos de 60 s |

Serviços **externos** (configuráveis no `.env`, ver INTEGRACOES.md): Google Places API (New), OpenStreetMap Overpass, Brave Search API
e Anthropic. Sem eles, o cadastro manual e a importação CSV continuam a funcionar.

### Demonstração vs. utilização real

O botão «Ver demonstração» no login entra num utilizador separado com 3 leads **fictícios** (domínios `.invalid`). As políticas RLS da base de dados
isolam-no: esses dados nunca aparecem nos seus leads, pesquisas ou indicadores. No modo de demonstração as pesquisas, as verificações e a
importação ficam desativadas. Desligue-o com `DEMO_ENABLED=false`. Os testes automáticos usam fixtures próprias (`tests/fixtures/`), só dentro dos testes.

## Arquitetura

```
Next.js 16 (App Router, server actions)  ──►  Postgres (RLS por utilizador)
        │  cria pesquisa + trabalho na fila            ▲
        ▼                                              │ withUser(): role authenticated + auth.uid()
  tabela jobs (persistente)  ◄── worker ──► adaptadores:
                                             · Google Places API (New) — descoberta
                                             · OpenStreetMap/Overpass — descoberta sem chave
                                             · Brave Search API — site pelo nome + localidade
                                             · Anthropic (opcional) — sugestão de nicho com evidência citada
                                             · safe-fetch + cheerio — análise HTML (só pedidos GET)
                                             · Playwright/Chromium — ecrã móvel 390×844
```

* Autenticação: **local** (`APP_LOGIN_EMAIL`/`APP_PASSWORD`, sessão assinada com HMAC, por defeito no Docker) ou **Supabase** (`AUTH_MODE=supabase`).
* `src/lib/domain/` — regras puras: normalização, deduplicação, rubrica versionada, pontuação, confiança, abordagem.
* `src/lib/net/safe-fetch.ts` — bloqueia IPs privados/localhost (também depois do DNS), credenciais no URL, portas não-web e redireções inseguras,
  com limites de tempo, tamanho e número de redireções. Respeita o `robots.txt`.
* `src/lib/pipeline/` — pesquisa em duas fases, cancelamento, retoma sem duplicar, limites diários e resultado (não configurada / falhou / parcial / sem resultados).
* `src/lib/providers/check.ts` — diagnóstico com chamadas reais mínimas.
* `scripts/validate-real.ts` — validação ponta a ponta com fontes reais.

## Sem Docker (desenvolvimento)

Requisitos: Node 22 e Postgres 15 ou superior.

```bash
npm install
DATABASE_URL=postgres://user:pass@localhost:5432/udev npm run db:migrate:local
npm run dev        # terminal 1 (lê .env.local / .env)
npm run worker     # terminal 2
```

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

* **Integrações externas não testadas com chaves reais** durante o desenvolvimento (ver VALIDACAO.md): corra `validate:real` antes de confiar nos resultados.
* Google Places Text Search devolve no máximo ~60 resultados por consulta; a cobertura do OSM é irregular.
* A análise HTML não executa JavaScript (sites só-JS podem parecer sem contactos — o texto da oportunidade avisa). O Playwright
  cobre parte disso no ecrã móvel.
* Deteções estruturais (botão sem destino, menu móvel) podem ter falsos positivos; estão marcadas como «verificação visual/estrutural».
* A verificação de cada candidato corre dentro de uma transação aberta enquanto faz pedidos HTTP; com o *pooler* do Supabase em
  modo transação isto funciona, mas pesquisas muito grandes ocupam ligações durante mais tempo.
* Não há estimativa de custo em euros: só contagem de pedidos face aos limites diários que definir e, no Brave, a quota reportada.
* Sem ferramenta de desempenho (PageSpeed) nesta versão — nenhuma métrica de desempenho é apresentada.
* A precisão só é significativa depois de rever manualmente uma amostra razoável de leads.
