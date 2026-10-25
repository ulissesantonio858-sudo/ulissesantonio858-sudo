-- UDEV Prospect — suporte a execução local (Docker) e estados de pesquisa.

-- Configuração interna (ex.: segredo de sessão gerado automaticamente). Só o dono das tabelas (servidor/worker) acede.
create table if not exists public.app_config (
  key text primary key,
  value text not null,
  created_at timestamptz not null default now()
);
alter table public.app_config enable row level security;
revoke all on public.app_config from authenticated, anon;

-- Sinal de vida do worker, para a interface avisar quando as pesquisas não estão a ser processadas.
create table if not exists public.worker_heartbeats (
  worker_id text primary key,
  last_seen timestamptz not null default now(),
  info jsonb not null default '{}'::jsonb
);
alter table public.worker_heartbeats enable row level security;
drop policy if exists read_all on public.worker_heartbeats;
create policy read_all on public.worker_heartbeats for select to authenticated using (true);
grant select on public.worker_heartbeats to authenticated;
revoke all on public.worker_heartbeats from anon;

-- Resultado da pesquisa, distinto do estado de execução:
-- not_configured | failed | partial | no_results | ok
alter table public.searches add column if not exists outcome text
  check (outcome in ('not_configured','failed','partial','no_results','ok'));
alter table public.searches add column if not exists warnings jsonb not null default '[]'::jsonb;

-- Último diagnóstico de integrações (por utilizador).
alter table public.settings add column if not exists last_checks jsonb;
