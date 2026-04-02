-- ==========================================
-- Collaborative Shopping Lists
-- ==========================================

create table if not exists public.shopping_lists (
  id uuid primary key default gen_random_uuid(),
  owner_user_id uuid references auth.users(id) not null,
  name text not null,
  share_code text not null unique default upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 10)),
  created_at timestamp with time zone default now() not null,
  updated_at timestamp with time zone default now() not null
);

create table if not exists public.shopping_list_members (
  list_id uuid references public.shopping_lists(id) on delete cascade not null,
  user_id uuid references auth.users(id) not null,
  role text not null default 'editor' check (role in ('owner', 'editor', 'viewer')),
  created_at timestamp with time zone default now() not null,
  primary key (list_id, user_id)
);

create table if not exists public.shopping_list_items (
  id uuid primary key default gen_random_uuid(),
  list_id uuid references public.shopping_lists(id) on delete cascade not null,
  name text not null,
  normalized_key text not null,
  quantity text,
  checked boolean not null default false,
  checked_at timestamp with time zone,
  checked_by_user_id uuid references auth.users(id),
  created_at timestamp with time zone default now() not null,
  updated_at timestamp with time zone default now() not null
);

create index if not exists idx_shopping_lists_owner on public.shopping_lists(owner_user_id);
create index if not exists idx_shopping_lists_share_code on public.shopping_lists(share_code);
create index if not exists idx_shopping_list_members_user on public.shopping_list_members(user_id);
create index if not exists idx_shopping_list_items_list on public.shopping_list_items(list_id);
create index if not exists idx_shopping_list_items_list_checked on public.shopping_list_items(list_id, checked);
create index if not exists idx_shopping_list_items_normalized_key on public.shopping_list_items(normalized_key);

create or replace function public.touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_touch_shopping_lists_updated_at on public.shopping_lists;
create trigger trg_touch_shopping_lists_updated_at
before update on public.shopping_lists
for each row
execute procedure public.touch_updated_at();

drop trigger if exists trg_touch_shopping_list_items_updated_at on public.shopping_list_items;
create trigger trg_touch_shopping_list_items_updated_at
before update on public.shopping_list_items
for each row
execute procedure public.touch_updated_at();

create or replace function public.add_owner_as_member()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.shopping_list_members (list_id, user_id, role)
  values (new.id, new.owner_user_id, 'owner')
  on conflict (list_id, user_id) do update set role = 'owner';

  return new;
end;
$$;

create or replace function public.shopping_list_role(
  p_list_id uuid,
  p_user_id uuid default auth.uid()
)
returns text
language sql
stable
security definer
set search_path = public
as $$
  select case
    when exists (
      select 1
      from public.shopping_lists l
      where l.id = p_list_id
        and l.owner_user_id = p_user_id
    ) then 'owner'
    else coalesce(
      (
        select m.role
        from public.shopping_list_members m
        where m.list_id = p_list_id
          and m.user_id = p_user_id
        limit 1
      ),
      ''
    )
  end;
$$;

create or replace function public.is_shopping_list_member(
  p_list_id uuid,
  p_user_id uuid default auth.uid()
)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.shopping_list_role(p_list_id, p_user_id) <> '';
$$;

revoke all on function public.shopping_list_role(uuid, uuid) from public;
grant execute on function public.shopping_list_role(uuid, uuid) to authenticated;

revoke all on function public.is_shopping_list_member(uuid, uuid) from public;
grant execute on function public.is_shopping_list_member(uuid, uuid) to authenticated;

drop trigger if exists trg_add_owner_member on public.shopping_lists;
create trigger trg_add_owner_member
after insert on public.shopping_lists
for each row
execute procedure public.add_owner_as_member();

alter table public.shopping_lists enable row level security;
alter table public.shopping_list_members enable row level security;
alter table public.shopping_list_items enable row level security;

drop policy if exists "shopping_lists_select_member" on public.shopping_lists;
create policy "shopping_lists_select_member"
on public.shopping_lists
for select
using (public.is_shopping_list_member(id));

drop policy if exists "shopping_lists_insert_owner" on public.shopping_lists;
create policy "shopping_lists_insert_owner"
on public.shopping_lists
for insert
with check (owner_user_id = auth.uid());

drop policy if exists "shopping_lists_update_owner" on public.shopping_lists;
create policy "shopping_lists_update_owner"
on public.shopping_lists
for update
using (owner_user_id = auth.uid())
with check (owner_user_id = auth.uid());

drop policy if exists "shopping_lists_delete_owner" on public.shopping_lists;
create policy "shopping_lists_delete_owner"
on public.shopping_lists
for delete
using (owner_user_id = auth.uid());

drop policy if exists "shopping_list_members_select_member" on public.shopping_list_members;
create policy "shopping_list_members_select_member"
on public.shopping_list_members
for select
using (public.is_shopping_list_member(list_id));

drop policy if exists "shopping_list_members_insert_owner" on public.shopping_list_members;
create policy "shopping_list_members_insert_owner"
on public.shopping_list_members
for insert
with check (
  exists (
    select 1
    from public.shopping_lists l
    where l.id = shopping_list_members.list_id
      and l.owner_user_id = auth.uid()
  )
);

drop policy if exists "shopping_list_members_update_owner" on public.shopping_list_members;
create policy "shopping_list_members_update_owner"
on public.shopping_list_members
for update
using (
  exists (
    select 1
    from public.shopping_lists l
    where l.id = shopping_list_members.list_id
      and l.owner_user_id = auth.uid()
  )
)
with check (
  exists (
    select 1
    from public.shopping_lists l
    where l.id = shopping_list_members.list_id
      and l.owner_user_id = auth.uid()
  )
);

drop policy if exists "shopping_list_members_delete_owner_or_self" on public.shopping_list_members;
create policy "shopping_list_members_delete_owner_or_self"
on public.shopping_list_members
for delete
using (
  shopping_list_members.user_id = auth.uid()
  or exists (
    select 1
    from public.shopping_lists l
    where l.id = shopping_list_members.list_id
      and l.owner_user_id = auth.uid()
  )
);

drop policy if exists "shopping_list_items_select_member" on public.shopping_list_items;
create policy "shopping_list_items_select_member"
on public.shopping_list_items
for select
using (public.is_shopping_list_member(list_id));

drop policy if exists "shopping_list_items_insert_editor_or_owner" on public.shopping_list_items;
create policy "shopping_list_items_insert_editor_or_owner"
on public.shopping_list_items
for insert
with check (public.shopping_list_role(list_id) in ('owner', 'editor'));

drop policy if exists "shopping_list_items_update_editor_or_owner" on public.shopping_list_items;
create policy "shopping_list_items_update_editor_or_owner"
on public.shopping_list_items
for update
using (public.shopping_list_role(list_id) in ('owner', 'editor'))
with check (public.shopping_list_role(list_id) in ('owner', 'editor'));

drop policy if exists "shopping_list_items_delete_editor_or_owner" on public.shopping_list_items;
create policy "shopping_list_items_delete_editor_or_owner"
on public.shopping_list_items
for delete
using (public.shopping_list_role(list_id) in ('owner', 'editor'));

create or replace function public.join_shopping_list_by_code(p_code text)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  target_list_id uuid;
begin
  if auth.uid() is null then
    raise exception 'not_authenticated';
  end if;

  select id
    into target_list_id
    from public.shopping_lists
   where share_code = upper(trim(p_code))
   limit 1;

  if target_list_id is null then
    raise exception 'invalid_code';
  end if;

  insert into public.shopping_list_members (list_id, user_id, role)
  values (target_list_id, auth.uid(), 'editor')
  on conflict (list_id, user_id) do nothing;

  return target_list_id;
end;
$$;

revoke all on function public.join_shopping_list_by_code(text) from public;
grant execute on function public.join_shopping_list_by_code(text) to authenticated;

do $$
begin
  if not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'shopping_list_items'
  ) then
    alter publication supabase_realtime add table public.shopping_list_items;
  end if;
end;
$$;

grant usage on schema public to authenticated;

grant select, insert, update, delete
on public.shopping_lists
to authenticated;

grant select, insert, update, delete
on public.shopping_list_members
to authenticated;

grant select, insert, update, delete
on public.shopping_list_items
to authenticated;
