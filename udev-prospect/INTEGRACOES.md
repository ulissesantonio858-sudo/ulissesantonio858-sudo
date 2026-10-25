# Integrações do UDEV Prospect

As chaves vão **só** no ficheiro `.env` do seu computador. Nunca as cole em conversas, emails ou no código.
Depois de alterar o `.env`, execute `docker compose up -d` e confirme em **Configurações → Testar agora**
(ou `docker compose run --rm worker npm run check:integrations`).

## Resumo

| Integração | Estado | Obrigatória? | Variável(is) |
|---|---|---|---|
| Postgres | Incluído no Docker | **Sim** (automático) | `POSTGRES_PASSWORD` (opcional) |
| Login local | Implementado | **Sim** | `APP_LOGIN_EMAIL`, `APP_PASSWORD` |
| Worker de pesquisas | Incluído no Docker | **Sim** (automático) | — |
| Google Places API (New) | Implementado | **Uma das duas fontes de descoberta é obrigatória para pesquisar** (Google recomendado) | `GOOGLE_PLACES_API_KEY` |
| OpenStreetMap (Overpass) | Implementado | idem (sem chave; cobertura fraca em Vila Real) | `OSM_ENABLED`, `OVERPASS_URL` |
| Brave Search API | Implementado | Opcional, mas **necessária para concluir «site não localizado»** | `BRAVE_SEARCH_API_KEY` |
| Anthropic (IA) | Implementado | Opcional | `ANTHROPIC_API_KEY`, `ANTHROPIC_MODEL` |
| Playwright/Chromium | Incluído na imagem do worker | Opcional (análise em ecrã móvel) | — |
| Supabase | Implementado | Não (só para alojar fora do seu PC) | `AUTH_MODE=supabase`, `NEXT_PUBLIC_SUPABASE_*` |

Sem cadastro manual e importação CSV não precisa de nenhuma chave: funcionam sempre.

Sobre os preços abaixo: apenas os indicados como **«oficial»** foram confirmados numa página do próprio fornecedor durante esta
preparação. Os restantes vêm de várias fontes de 2026 que coincidem entre si, mas **confirme na página oficial antes de ativar a faturação**.

---

## 1. Login local — obrigatório

* **Variáveis:** `APP_LOGIN_EMAIL` (o seu email) e `APP_PASSWORD` (≥ 10 caracteres). Opcional: `SESSION_SECRET` (gerado automaticamente se vazio).
* **Verificar:** abrir http://localhost:3000 e entrar. Se aparecer «Login não configurado», a palavra-passe tem menos de 10 caracteres.
* **Custos:** nenhum.

## 2. Google Places API (New) — fonte de descoberta recomendada

* **Onde obter a chave:**
  1. Google Cloud Console → criar um projeto e ativar uma conta de faturação (é exigida, mesmo dentro da utilização gratuita).
  2. Ativar a API **«Places API (New)»**.
  3. *APIs e serviços → Credenciais → Criar credenciais → Chave de API*, e restringir a chave à «Places API (New)».
  * Documentação oficial: [Configurar uma chave](https://developers.google.com/maps/documentation/places/web-service/get-api-key) ·
    [Text Search (New)](https://developers.google.com/maps/documentation/places/web-service/text-search) ·
    [Faturação do Places API](https://developers.google.com/maps/documentation/places/web-service/usage-and-billing) ·
    [Tabela de preços](https://developers.google.com/maps/billing-and-pricing/pricing)
* **Variável:** `GOOGLE_PLACES_API_KEY`
* **Verificar:** «Testar agora» deve mostrar *a funcionar* e «N local(is) devolvido(s) para Vila Real». O diagnóstico usa o field mask `places.id`,
  que corresponde ao SKU **«Text Search Essentials (IDs Only)», com utilização gratuita ilimitada (oficial)**.
  Erros comuns: `HTTP 403 … has not been used in project / is disabled` (API não ativada) ou falta de faturação.
* **Custos e limites:**
  * A pesquisa da app pede site e telefone (`websiteUri`, `nationalPhoneNumber`). A Google cobra cada pedido pelo SKU mais alto que os campos pedidos implicam
    (oficial), o que, segundo as fontes consultadas, coloca estes pedidos em **«Text Search Enterprise»: ~1 000 pedidos grátis por mês e depois ~35 USD por 1 000**
    (não confirmado na página oficial de preços — verifique).
  * `PLACES_INCLUDE_REVIEWS=true` pede datas de avaliações e sobe para «Enterprise + Atmosphere» (~40 USD por 1 000 segundo as mesmas fontes). Fica desligado por defeito.
  * Cada consulta devolve até 20 locais por página; uma pesquisa de 5 candidatos usa normalmente 1–2 pedidos. Resolver uma localidade fora da predefinição de Vila Real usa mais 1 pedido.
  * A app limita a **100 pedidos/dia** por defeito (Configurações → Limites). Recomendado: definir também quotas/alertas de orçamento no Google Cloud.
  * Armazenamento: só o `place_id` pode ser guardado sem prazo, e as coordenadas no máximo 30 dias (oficial). A app apaga o restante conteúdo do Google
    ao fim do prazo de retenção configurado (máx. 30 dias).

## 3. OpenStreetMap (Overpass) — fonte de descoberta sem chave

* **Onde obter:** não precisa de chave. Documentação: [Overpass API](https://wiki.openstreetmap.org/wiki/Overpass_API) · [Licença e atribuição](https://www.openstreetmap.org/copyright)
* **Variáveis:** `OSM_ENABLED=true` (ligado por defeito), `OVERPASS_URL` (servidor público por defeito).
* **Verificar:** «Testar agora» consulta `/api/status` do Overpass (não executa pesquisa).
* **Custos e limites:** gratuito. Orientação da wiki: até ~10 000 consultas/dia e 1 GB/dia não incomoda outros utilizadores, e o uso regular deve ficar muito abaixo disso;
  identificar-se com User-Agent e não fazer pedidos em paralelo. O servidor público pode estar sobrecarregado. A app limita a **30 pedidos/dia** por defeito.
  **Atenção:** em Vila Real muitos negócios não estão no OSM ou não têm telefone/site, por isso não conte com esta fonte sozinha.

## 4. Brave Search API — procurar o site pelo nome e localidade

* **Onde obter a chave:** criar conta no [Brave Search API dashboard](https://api-dashboard.search.brave.com/), subscrever o plano «Search» e gerar uma chave.
  Documentação: [Web Search — get started](https://api-dashboard.search.brave.com/app/documentation/web-search/get-started) ·
  [Cabeçalhos de limite](https://api-dashboard.search.brave.com/app/documentation/suggest/response-headers) · [Página do produto](https://brave.com/search/api/)
* **Variável:** `BRAVE_SEARCH_API_KEY`
* **Verificar:** «Testar agora» faz 1 pesquisa real e mostra a quota restante enviada pela Brave (`X-RateLimit-Remaining`, oficial).
* **Custos e limites (fontes de 2026, não confirmados na página oficial):** ~5 USD por 1 000 pedidos, com ~5 USD de crédito mensal incluído (~1 000 pedidos) e cartão exigido no registo.
  A app só a usa para empresas **sem site na listagem** (1 pedido cada) e limita a **50/dia** por defeito. Os resultados não ficam em cache.
* **Sem esta chave:** empresas sem site ficam «presença digital não verificada» e a pesquisa é marcada **«parcial»**.

## 5. Anthropic (IA) — opcional

* **Onde obter a chave:** [Claude Console → API keys](https://console.anthropic.com/settings/keys). Documentação: [Primeiros passos com a API](https://docs.anthropic.com/en/api/getting-started) · [Preços](https://www.anthropic.com/pricing#api)
* **Variáveis:** `ANTHROPIC_API_KEY`, `ANTHROPIC_MODEL` (por defeito `claude-opus-5-5`).
* **Verificar:** «Testar agora» consulta o modelo configurado na API de modelos (não consome tokens).
* **Para que serve:** só sugere o nicho quando os tipos da listagem e o nome não chegam, e cada sugestão tem de citar evidências guardadas. Os rascunhos de abordagem **não** usam IA.
* **Custos:** pago por tokens. Claude Opus 5.5 custa 4 USD por milhão de tokens de entrada e 20 USD por milhão de saída. Para reduzir custos pode usar `ANTHROPIC_MODEL=claude-haiku-5-5`
  (0,10 / 0,50 USD por milhão). Valores da tabela de modelos da Anthropic de outubro de 2026; confirme na página de preços. Cada classificação envia até ~6 000 caracteres de texto
  da página mais as evidências. Limite na app: **100 pedidos/dia**.

## 6. Playwright/Chromium — análise em ecrã móvel

* Incluído na imagem do worker (`npx playwright install --with-deps chromium` durante o `docker compose up --build`). Sem chave e sem custos.
* **Verificar:** «Testar agora» → «navegador arranca». Se falhar, a análise móvel fica registada como indisponível e o resto continua.

## 7. Supabase — apenas se quiser alojar fora do seu computador

Não é necessário no Docker local. Para alojar: `AUTH_MODE=supabase`, `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `ALLOWED_EMAILS`,
`DATABASE_URL` do projeto Supabase e `npm run db:migrate` (sem `--local-shim`). Documentação: [Supabase Auth](https://supabase.com/docs/guides/auth).

---

## Como a app reporta problemas de integração

| Situação | O que aparece na pesquisa |
|---|---|
| Nenhuma fonte pedida tem chave/está ativa | **não configurada** |
| As fontes foram chamadas mas nenhuma respondeu (rede, chave inválida, quota, erro) | **falhou** |
| Parte das fontes/verificações falhou ou não está configurada (incl. Brave em falta) | **parcial** |
| Todas as fontes responderam e não devolveram candidatos | **nenhuma empresa encontrada** |
| Todas responderam e há candidatos | estado normal, com a lista ordenada |

Cada consulta fica registada em «Fontes consultadas» com fonte, consulta, data, estado e o erro devolvido.
