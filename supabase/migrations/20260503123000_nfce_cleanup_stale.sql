-- Limpeza amovida: cache expirado, janelas antigas de rate limit, logs antigos.
-- Executada via RPC a partir da Edge fetch-nfce; no máximo a cada ~10 minutos (throttle na linha).

create table public.nfce_cleanup_state (
  id int primary key constraint nfce_cleanup_state_singleton check (id = 1),
  last_run_at timestamptz not null default '-infinity'::timestamptz
);

insert into public.nfce_cleanup_state (id, last_run_at) values (1, '-infinity'::timestamptz);

comment on table public.nfce_cleanup_state is 'Throttle da limpeza nfce_cleanup_stale (fetch-nfce).';

alter table public.nfce_cleanup_state enable row level security;

revoke all on public.nfce_cleanup_state from anon, authenticated;

create or replace function public.nfce_cleanup_stale()
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.nfce_cleanup_state
  set last_run_at = now()
  where id = 1 and last_run_at < now() - interval '10 minutes';

  if not found then
    return;
  end if;

  delete from public.nfce_fetch_cache where expires_at < now();

  delete from public.nfce_fetch_rate
  where window_id < floor(extract(epoch from now()) / 60)::bigint - 1488;

  delete from public.nfce_fetch_log where created_at < now() - interval '30 days';
end;
$$;

revoke all on function public.nfce_cleanup_stale() from public;
grant execute on function public.nfce_cleanup_stale() to service_role;
