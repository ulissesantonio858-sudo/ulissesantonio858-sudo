# Instalar e abrir o UDEV Prospect no Windows

## Programas necessários

| Programa | Para quê | Onde |
|---|---|---|
| **Docker Desktop para Windows** (com WSL 2) | Corre a base de dados, a aplicação e o worker | https://docs.docker.com/desktop/setup/install/windows-install/ |
| Um browser (Edge, Chrome, Firefox) | Abrir a interface | já instalado |

Não precisa de instalar Node.js, Postgres nem Git. Requisitos do Docker Desktop: Windows 10/11 de 64 bits com virtualização ativa
(o instalador avisa se faltar algo). Depois de instalar, abra o Docker Desktop uma vez e espere até indicar *Engine running*.

## Primeira instalação

Abra o **PowerShell** (menu Iniciar → escreva "PowerShell") e execute um comando de cada vez.

1. Extrair o ZIP para `C:\udev-prospect`:

```powershell
Expand-Archive -Path "$HOME\Downloads\udev-prospect.zip" -DestinationPath "C:\"
```

2. Entrar na pasta:

```powershell
cd C:\udev-prospect
```

3. Criar o ficheiro de configuração:

```powershell
Copy-Item .env.example .env
```

4. Editar a configuração (defina pelo menos `APP_LOGIN_EMAIL` e `APP_PASSWORD`, com 10 ou mais caracteres; as chaves das APIs podem ficar para depois):

```powershell
notepad .env
```

5. Construir e arrancar tudo (a primeira vez demora 5–15 minutos, porque descarrega imagens e o Chromium):

```powershell
docker compose up -d --build
```

6. Confirmar que os serviços estão saudáveis (`db`, `app` e `worker` devem mostrar `healthy`; `migrate` termina com `Exited (0)`):

```powershell
docker compose ps -a
```

7. Abrir a aplicação no browser:

```powershell
Start-Process "http://localhost:3000"
```

Entre com o email e a palavra-passe que definiu no `.env`. A interface só está acessível neste computador (porta ligada a 127.0.0.1).

## Confirmar as integrações

Na aplicação: **Configurações → Diagnóstico das integrações → Testar agora**. Ou no PowerShell:

```powershell
docker compose run --rm worker npm run check:integrations
```

Detalhes de cada chave em [INTEGRACOES.md](INTEGRACOES.md).

## Primeira pesquisa real (validação, até 5 candidatos em Vila Real)

```powershell
docker compose run --rm worker npm run validate:real
```

O relatório fica em `C:\udev-prospect\relatorios\` e a pesquisa aparece em **Pesquisas** na interface. Ver [VALIDACAO.md](VALIDACAO.md).

## Uso diário

Parar (os dados ficam guardados):

```powershell
docker compose stop
```

Voltar a arrancar:

```powershell
docker compose start
```

Depois de alterar o `.env` (por exemplo, para acrescentar uma chave):

```powershell
docker compose up -d
```

Ver o que o worker está a fazer:

```powershell
docker compose logs -f worker
```

Cópia de segurança da base de dados (dois comandos: criar a cópia dentro do contentor e trazê-la para a pasta atual):

```powershell
docker compose exec db pg_dump -U udev -f /tmp/backup-udev.sql udev
```

```powershell
docker compose cp db:/tmp/backup-udev.sql .\backup-udev.sql
```

Atualizar para uma nova versão do código (depois de substituir os ficheiros, mantendo o seu `.env`):

```powershell
docker compose up -d --build
```

## Onde ficam os dados

No volume Docker `udev-prospect_udev-db`. Sobrevive a `stop`, `start`, `down`, reinícios do Windows e reconstruções.
**Só é apagado com `docker compose down -v`** — não use `-v` a não ser que queira começar do zero.

## Problemas comuns

| Sintoma | Causa provável | Solução |
|---|---|---|
| `env file ... .env not found` | Falta o passo 3 | `Copy-Item .env.example .env` |
| Login diz «não configurado» | `APP_PASSWORD` com menos de 10 caracteres ou vazio | Edite o `.env` e execute `docker compose up -d` |
| Página não abre em localhost:3000 | Serviços ainda a arrancar ou porta ocupada | `docker compose ps -a`; para mudar a porta defina `APP_PORT=3001` no `.env` |
| Aviso «o worker não está ativo» | Worker parado ou com erro | `docker compose logs worker` e `docker compose up -d worker` |
| Pesquisa «não configurada» ou «falhou» | Falta a chave ou não há acesso à rede | Configurações → Testar agora |
| `docker: command not found` / erro de motor | Docker Desktop fechado | Abra o Docker Desktop e espere por *Engine running* |
