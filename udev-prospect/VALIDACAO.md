# Validação

## Validação real (no seu computador): primeira pesquisa de até 5 candidatos em Vila Real

Pré-requisitos: serviços a correr (`docker compose ps -a`), `APP_LOGIN_EMAIL` definido e **pelo menos** `GOOGLE_PLACES_API_KEY`
(recomendado também `BRAVE_SEARCH_API_KEY`).

1. Confirmar as integrações:

```powershell
docker compose run --rm worker npm run check:integrations
```

2. Correr a validação (centro de Vila Real, raio de 10 km, nichos clínica dentária, cabeleireiro e barbearia, máximo de 5 candidatos):

```powershell
docker compose run --rm worker npm run validate:real
```

Opções (exemplo): `docker compose run --rm worker npm run validate:real -- --max 3 --niches advogado,ginasio --radius 15`

O script faz, com fontes reais e sem fixtures: diagnóstico → pesquisa → identificação → contactos → pontuação → gravação → entrada no pipeline.
Depois relê tudo da base de dados e imprime uma tabela PASSOU/FALHOU/N/A. O relatório fica em `relatorios\validacao-<data>.md` e a pesquisa
aparece em **Pesquisas** na interface. Se nenhuma fonte de descoberta responder, pára e indica o impedimento exato.

3. Revisão manual obrigatória, na interface:
   * Abra a pesquisa e confirme que «Fontes consultadas» mostra cada fonte com o estado **respondeu**.
   * Em 1–2 leads, abra o site e o contacto indicados e confirme à mão que pertencem à empresa certa (e não a um homónimo noutra Vila Real).
   * Gere os rascunhos, registe um contacto feito (pede confirmação) e mova um lead no **Pipeline**.
   * Em **Configurações → Limites** veja os pedidos consumidos hoje.

Cada pesquisa de 5 candidatos usa normalmente 1–2 pedidos Google, até 5 Brave e 0–5 Anthropic (só se esta estiver configurada).

## O que foi testado durante a preparação desta entrega

Ambiente: contentor Linux na nuvem com Docker 29 e Compose v5, **sem chaves de API**, com saída para a Internet restrita por proxy.

| Teste | Resultado |
|---|---|
| `docker compose` com db + migrate + app + worker: todos `healthy`, migrações `Exited (0)` | ✅ |
| `/api/health` responde com a BD e o sinal de vida do worker | ✅ |
| Login local: palavra-passe errada recusada; correta entra; sem sessão redireciona para /login | ✅ |
| Diagnóstico de integrações (interface e linha de comandos) com os estados reais | ✅ Google e Brave «não configurado» (sem chave); Overpass «falhou» (DNS bloqueado neste ambiente) |
| Pesquisa real de 5 candidatos em Vila Real | ✅ marcada **«falhou»** (Google não configurado + Overpass sem rede), sem resultados inventados |
| `validate:real` dentro do worker | ✅ pára e indica o impedimento; relatório gravado em `relatorios/` |
| Cadastro manual e importação CSV com nota | ✅ |
| Demonstração: banner, 3 leads fictícios, isolada dos leads reais; pesquisa real bloqueada | ✅ |
| **Reinício:** `docker compose down` + `up -d` preserva empresas, notas, pesquisas, evidências e dados de demo | ✅ contagens iguais antes e depois |
| Cópia de segurança com `pg_dump` + `docker compose cp` | ✅ |
| 67 testes automáticos (unitários + integração em Postgres 16), typecheck, lint e build de produção | ✅ (testes com fixtures: validam regras, **não** as APIs reais) |

## Pendente: o que não foi possível validar aqui, e porquê

| Item | Impedimento exato |
|---|---|
| Pesquisa com Google Places e resultados reais | Não há `GOOGLE_PLACES_API_KEY` neste ambiente (e as chaves não devem ser partilhadas na conversa) |
| Overpass/OpenStreetMap real | A política de rede deste ambiente bloqueia `overpass-api.de` (`ENOTFOUND` / `403` no proxy) |
| Brave Search real | Sem chave, e `api.search.brave.com` está bloqueado pela política de rede |
| Classificação Anthropic real | Sem chave |
| Instalação do Chromium na imagem do worker (`playwright install --with-deps`) | `deb.debian.org` e a CDN do Playwright estão bloqueados aqui; testei o worker sem Chromium. No seu PC esta etapa corre durante o `docker compose up --build` |
| Identificação, contactos, pontuação e pipeline **com empresas reais** | Dependem dos três itens acima. Correm com `npm run validate:real` no seu computador |
| Docker Desktop em Windows | Testei o Compose em Linux. Os comandos são os mesmos; no Windows os ficheiros de dados ficam no volume do Docker Desktop (WSL 2) |
