-- Hotfix: remove RLS recursion from collaborative shopping lists

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

drop policy if exists "shopping_lists_select_member" on public.shopping_lists;
create policy "shopping_lists_select_member"
on public.shopping_lists
for select
using (public.is_shopping_list_member(id));

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
