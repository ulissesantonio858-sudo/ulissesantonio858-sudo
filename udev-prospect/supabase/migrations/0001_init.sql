-- UDEV Prospect — esquema inicial
-- Compatível com Supabase (usa auth.uid() e o papel "authenticated").
-- Para Postgres local sem Supabase, aplicar antes scripts/local-auth-shim.sql.

create extension if not exists pgcrypto;

-- ---------------------------------------------------------------------------
-- Configurações e rubrica versionada
-- ---------------------------------------------------------------------------
create table if not exists public.settings (
  owner_id uuid primary key default auth.uid(),
  active_rubric_version int not null default 1,
  limits jsonb not null default '{}'::jsonb,        -- limites diários por fornecedor / orçamento
  outreach jsonb not null default '{}'::jsonb,      -- nº de follow-ups, intervalo, assinatura
  places_retention_days int not null default 30 check (places_retention_days between 1 and 30),
  updated_at timestamptz not null default now()
);

create table if not exists public.scoring_rubrics (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid(),
  version int not null check (version >= 1),
  config jsonb not null,
  notes text,
  created_at timestamptz not null default now(),
  unique (owner_id, version)
);

-- ---------------------------------------------------------------------------
-- Pesquisas e candidatos
-- ---------------------------------------------------------------------------
create table if not exists public.searches (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid(),
  params jsonb not null,  -- localidade, centro, raio, nichos, tipos de oportunidade, modo, máximo
  status text not null default 'queued'
    check (status in ('queued','running','cancel_requested','cancelled','completed','failed')),
  stage text not null default 'discovery' check (stage in ('discovery','processing','done')),
  sources_consulted jsonb not null default '[]'::jsonb,
  stats jsonb not null default '{}'::jsonb,
  error text,
  created_at timestamptz not null default now(),
  started_at timestamptz,
  finished_at timestamptz
);
create index if not exists searches_owner_idx on public.searches(owner_id, created_at desc);

create table if not exists public.companies (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid(),
  name text not null,
  name_norm text not null,
  niche text,
  niche_status text not null default 'unknown'
    check (niche_status in ('confirmed','inferred','unknown')),
  is_agency boolean not null default false,
  address text,
  locality text,
  locality_norm text,
  postcode text,
  lat double precision,
  lng double precision,
  coords_expire_at timestamptz,             -- coordenadas vindas do Google têm prazo
  distance_km double precision,
  website_url text,
  domain text,
  website_status text not null default 'not_verified'
    check (website_status in ('confirmed','not_located','not_verified','unreachable','blocked','conflict')),
  phone_e164 text,
  google_place_id text,
  osm_id text,
  identity_status text not null default 'unverified'
    check (identity_status in ('confirmed','inferred','unverified','conflict')),
  location_status text not null default 'unverified'
    check (location_status in ('confirmed','inferred','unverified','outside_region','conflict')),
  business_status text not null default 'unknown'
    check (business_status in ('operational','closed_temporarily','closed_permanently','unknown')),
  qualification_status text not null default 'pending'
    check (qualification_status in ('pending','qualified','review','discarded')),
  qualification_reasons text[] not null default '{}',
  pipeline_stage text not null default 'novo'
    check (pipeline_stage in ('novo','em_verificacao','qualificado','contacto_feito','respondeu',
                              'reuniao_marcada','proposta_enviada','ganho','perdido','nao_contactar')),
  suggested_service text,
  locked_fields text[] not null default '{}',   -- campos editados manualmente: pesquisas não sobrescrevem
  group_key text,                               -- filiais da mesma marca partilham group_key
  first_search_id uuid references public.searches(id) on delete set null,
  last_verified_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create unique index if not exists companies_place_uq on public.companies(owner_id, google_place_id) where google_place_id is not null;
create unique index if not exists companies_osm_uq on public.companies(owner_id, osm_id) where osm_id is not null;
create index if not exists companies_owner_idx on public.companies(owner_id, updated_at desc);
create index if not exists companies_domain_idx on public.companies(owner_id, domain);
create index if not exists companies_phone_idx on public.companies(owner_id, phone_e164);
create index if not exists companies_name_idx on public.companies(owner_id, name_norm);

create table if not exists public.search_candidates (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid(),
  search_id uuid not null references public.searches(id) on delete cascade,
  source text not null,
  external_id text not null,
  name text not null,
  payload jsonb not null default '{}'::jsonb,
  status text not null default 'pending'
    check (status in ('pending','processing','done','failed','skipped','duplicate')),
  outcome text,
  error text,
  attempts int not null default 0,
  company_id uuid references public.companies(id) on delete set null,
  updated_at timestamptz not null default now(),
  unique (search_id, source, external_id)
);
create index if not exists search_candidates_search_idx on public.search_candidates(search_id, status);

-- ---------------------------------------------------------------------------
-- Contactos, evidências, análises, oportunidades, pontuações, conflitos
-- ---------------------------------------------------------------------------
create table if not exists public.evidences (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  field text not null,                 -- ex.: phone, email, website, activity, identity, issue:booking_link_error
  value text,
  source_type text not null
    check (source_type in ('google_places','osm','website','web_search','playwright','pagespeed','manual','csv_import','ai')),
  source_url text,
  method text not null,                -- como foi verificado
  status text not null
    check (status in ('confirmed','inferred','not_found','unavailable','conflict')),
  observed_at timestamptz not null default now(),
  expires_at timestamptz,              -- conteúdo de terceiros com prazo de retenção
  details jsonb not null default '{}'::jsonb,
  search_id uuid references public.searches(id) on delete set null,
  superseded_at timestamptz
);
create index if not exists evidences_company_idx on public.evidences(company_id, field);

create table if not exists public.contacts (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  kind text not null check (kind in ('phone','email','whatsapp','instagram','facebook','linkedin','contact_form','booking','other')),
  value text not null,
  value_norm text not null,
  status text not null check (status in ('confirmed','inferred','not_found','unavailable','conflict')),
  evidence_id uuid references public.evidences(id) on delete set null,
  note text,
  created_at timestamptz not null default now(),
  unique (company_id, kind, value_norm)
);

create table if not exists public.site_analyses (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  url text not null,
  outcome text not null,       -- ok | http_error | dns_not_found | timeout | blocked | captcha | tls_error | connection_error | unsafe_url | too_large
  http_status int,
  final_url text,
  attempts int not null default 1,
  pages jsonb not null default '[]'::jsonb,
  mobile jsonb,
  tools jsonb not null default '[]'::jsonb,   -- ferramenta + data
  created_at timestamptz not null default now()
);
create index if not exists site_analyses_company_idx on public.site_analyses(company_id, created_at desc);

create table if not exists public.opportunities (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  analysis_id uuid references public.site_analyses(id) on delete set null,
  type text not null,
  tier text not null check (tier in ('principal','obstacle','not_located','minor')),
  observed text not null,
  possible_impact text not null,
  suggested_improvement text not null,
  verification text not null check (verification in ('reproduced','single_observation','visual_structural','documented_search')),
  evidence_ids uuid[] not null default '{}',
  status text not null default 'open' check (status in ('open','dismissed','resolved')),
  created_at timestamptz not null default now(),
  unique (company_id, type)
);

create table if not exists public.scores (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  rubric_version int not null,
  total int not null check (total between 0 and 100),
  breakdown jsonb not null,
  confidence text not null check (confidence in ('alto','medio','baixo')),
  confidence_reasons text[] not null default '{}',
  priority text not null check (priority in ('alta','media','baixa')),
  priority_gaps text[] not null default '{}',
  computed_at timestamptz not null default now(),
  is_current boolean not null default true
);
create unique index if not exists scores_current_uq on public.scores(company_id) where is_current;

create table if not exists public.overrides (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  field text not null check (field in ('priority','qualification_status','niche','website_status','identity_status','location_status')),
  old_value text,
  new_value text not null,
  reason text not null check (length(trim(reason)) >= 3),
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.conflicts (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  field text not null,
  candidates jsonb not null,   -- [{value, evidence_id, source_type}]
  status text not null default 'open' check (status in ('open','resolved')),
  resolved_value text,
  resolution_reason text,
  resolved_at timestamptz,
  created_at timestamptz not null default now()
);
create unique index if not exists conflicts_open_uq on public.conflicts(company_id, field) where status = 'open';

-- ---------------------------------------------------------------------------
-- CRM
-- ---------------------------------------------------------------------------
create table if not exists public.activities (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  type text not null check (type in ('note','contact_logged','stage_change','override','import','system','quality_review','conflict_resolved')),
  channel text,
  body text not null,
  occurred_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);
create index if not exists activities_company_idx on public.activities(company_id, occurred_at desc);

create table if not exists public.tasks (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid(),
  company_id uuid references public.companies(id) on delete cascade,
  title text not null check (length(trim(title)) > 0),
  due_date date not null,          -- data civil em Europe/Lisbon
  due_time time,
  timezone text not null default 'Europe/Lisbon',
  done_at timestamptz,
  created_at timestamptz not null default now()
);
create index if not exists tasks_owner_due_idx on public.tasks(owner_id, due_date) where done_at is null;

create table if not exists public.drafts (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  channel text not null check (channel in ('curta','email','followup_1','followup_2')),
  subject text,
  body text not null,
  evidence_ids uuid[] not null default '{}',
  generated_by text not null check (generated_by in ('template','ai','manual')),
  edited boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (company_id, channel)
);

create table if not exists public.quality_reviews (
  company_id uuid primary key references public.companies(id) on delete cascade,
  owner_id uuid not null default auth.uid(),
  adequate boolean not null,
  discard_reason text,
  search_error text,
  reviewed_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Consumo, cache e fila de trabalho
-- ---------------------------------------------------------------------------
create table if not exists public.api_usage (
  owner_id uuid not null default auth.uid(),
  provider text not null,
  day date not null,
  requests int not null default 0,
  last_remaining text,         -- valor reportado pelo fornecedor (ex.: cabeçalho X-RateLimit-Remaining)
  updated_at timestamptz not null default now(),
  primary key (owner_id, provider, day)
);

create table if not exists public.http_cache (
  owner_id uuid not null default auth.uid(),
  key text not null,
  provider text not null,
  body jsonb not null,
  expires_at timestamptz not null,
  primary key (owner_id, key)
);

create table if not exists public.jobs (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid(),
  type text not null check (type in ('search','reverify','purge_expired')),
  ref_id uuid,
  status text not null default 'queued' check (status in ('queued','running','completed','failed','cancelled')),
  attempts int not null default 0,
  max_attempts int not null default 3,
  run_after timestamptz not null default now(),
  locked_at timestamptz,
  locked_by text,
  last_error text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists jobs_queue_idx on public.jobs(status, run_after);
create unique index if not exists jobs_active_ref_uq on public.jobs(type, ref_id) where status in ('queued','running');

-- O worker reclama trabalho de qualquer utilizador; corre com o papel dono das tabelas.
create or replace function public.claim_next_job(p_worker text, p_stale_minutes int default 15)
returns setof public.jobs
language plpgsql
as $$
begin
  -- Recupera trabalhos presos (worker morreu)
  update public.jobs set status = 'queued', locked_at = null, locked_by = null, updated_at = now()
   where status = 'running' and locked_at < now() - make_interval(mins => p_stale_minutes);

  return query
  update public.jobs j set status = 'running', locked_at = now(), locked_by = p_worker,
         attempts = j.attempts + 1, updated_at = now()
   where j.id = (
     select id from public.jobs
      where status = 'queued' and run_after <= now()
      order by created_at
      for update skip locked
      limit 1)
  returning j.*;
end $$;
revoke all on function public.claim_next_job(text, int) from public;

-- ---------------------------------------------------------------------------
-- Row Level Security: cada linha pertence ao utilizador autenticado
-- ---------------------------------------------------------------------------
do $$
declare t text;
begin
  foreach t in array array['settings','scoring_rubrics','searches','companies','search_candidates','evidences',
    'contacts','site_analyses','opportunities','scores','overrides','conflicts','activities','tasks','drafts',
    'quality_reviews','api_usage','http_cache','jobs']
  loop
    execute format('alter table public.%I enable row level security', t);
    execute format('drop policy if exists owner_all on public.%I', t);
    execute format('create policy owner_all on public.%I for all to authenticated using (owner_id = auth.uid()) with check (owner_id = auth.uid())', t);
    execute format('grant select, insert, update, delete on public.%I to authenticated', t);
    execute format('revoke all on public.%I from anon', t);
  end loop;
end $$;

-- Integridade entre tabelas: um registo filho só pode apontar para empresa do mesmo dono.
create or replace function public.enforce_company_owner() returns trigger
language plpgsql as $$
begin
  if new.company_id is not null and not exists (
    select 1 from public.companies c where c.id = new.company_id and c.owner_id = new.owner_id) then
    raise exception 'company_id não pertence ao utilizador';
  end if;
  return new;
end $$;

do $$
declare t text;
begin
  foreach t in array array['evidences','contacts','site_analyses','opportunities','scores','overrides',
    'conflicts','activities','tasks','drafts','quality_reviews','search_candidates']
  loop
    execute format('drop trigger if exists trg_company_owner on public.%I', t);
    execute format('create trigger trg_company_owner before insert or update on public.%I for each row execute function public.enforce_company_owner()', t);
  end loop;
end $$;

create or replace function public.touch_updated_at() returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end $$;
drop trigger if exists trg_companies_touch on public.companies;
create trigger trg_companies_touch before update on public.companies for each row execute function public.touch_updated_at();
