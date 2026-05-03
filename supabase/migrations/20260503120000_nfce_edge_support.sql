-- Suporte à Edge Function fetch-nfce: cache, rate limit, logs (acesso via service_role).

-- =========================
-- CACHE HTML NFC-e
-- =========================
create table public.nfce_fetch_cache (
  url_hash text primary key,
  url_normalized text not null,
  html text not null,
  upstream_status integer not null default 200,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null
);

create index idx_nfce_fetch_cache_expires on public.nfce_fetch_cache (expires_at);

comment on table public.nfce_fetch_cache is 'Cache server-side do HTML da consulta NFC-e (Edge Function fetch-nfce).';

-- =========================
-- RATE LIMIT (janela 1 minuto)
-- =========================
create table public.nfce_fetch_rate (
  rate_key text not null,
  window_id bigint not null,
  count integer not null default 0,
  primary key (rate_key, window_id)
);

comment on table public.nfce_fetch_rate is 'Contadores por chave e minuto para rate limit da fetch-nfce.';

-- Incremento atômico; retorna true se ainda dentro do limite após incrementar.
create or replace function public.nfce_check_and_increment_rate(
  p_rate_key text,
  p_window_id bigint,
  p_limit int
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_count int;
begin
  insert into public.nfce_fetch_rate (rate_key, window_id, count)
  values (p_rate_key, p_window_id, 1)
  on conflict (rate_key, window_id)
  do update set count = public.nfce_fetch_rate.count + 1
  returning count into v_count;

  return v_count <= p_limit;
end;
$$;

revoke all on function public.nfce_check_and_increment_rate(text, bigint, integer) from public;
grant execute on function public.nfce_check_and_increment_rate(text, bigint, integer) to service_role;

-- =========================
-- LOGS
-- =========================
create table public.nfce_fetch_log (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  url_hash text not null,
  user_id text,
  client_ip text,
  cache_hit boolean not null default false,
  success boolean not null,
  error_code text,
  upstream_status integer,
  duration_ms integer not null default 0
);

create index idx_nfce_fetch_log_created on public.nfce_fetch_log (created_at desc);

comment on table public.nfce_fetch_log is 'Auditoria da Edge Function fetch-nfce.';

-- RLS: sem policies — apenas service_role (bypass) acessa via Edge Function.
alter table public.nfce_fetch_cache enable row level security;
alter table public.nfce_fetch_rate enable row level security;
alter table public.nfce_fetch_log enable row level security;

revoke all on public.nfce_fetch_cache from anon, authenticated;
revoke all on public.nfce_fetch_rate from anon, authenticated;
revoke all on public.nfce_fetch_log from anon, authenticated;

grant select, insert, update, delete on public.nfce_fetch_cache to service_role;
grant select, insert, update, delete on public.nfce_fetch_rate to service_role;
grant select, insert on public.nfce_fetch_log to service_role;
