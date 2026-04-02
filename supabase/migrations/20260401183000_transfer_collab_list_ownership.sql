-- Transfer ownership for collaborative shopping lists

create or replace function public.transfer_shopping_list_ownership(
  p_list_id uuid,
  p_new_owner_id uuid
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  current_owner_id uuid;
  target_exists boolean;
begin
  if auth.uid() is null then
    raise exception 'not_authenticated';
  end if;

  select owner_user_id
    into current_owner_id
    from public.shopping_lists
   where id = p_list_id
   limit 1;

  if current_owner_id is null then
    raise exception 'list_not_found';
  end if;

  if current_owner_id <> auth.uid() then
    raise exception 'only_owner_can_transfer';
  end if;

  if p_new_owner_id = auth.uid() then
    raise exception 'new_owner_must_be_different';
  end if;

  select exists (
    select 1
      from public.shopping_list_members m
     where m.list_id = p_list_id
       and m.user_id = p_new_owner_id
  )
  into target_exists;

  if not target_exists then
    raise exception 'target_member_not_found';
  end if;

  update public.shopping_lists
     set owner_user_id = p_new_owner_id
   where id = p_list_id;

  update public.shopping_list_members
     set role = 'editor'
   where list_id = p_list_id
     and user_id = auth.uid()
     and role = 'owner';

  update public.shopping_list_members
     set role = 'owner'
   where list_id = p_list_id
     and user_id = p_new_owner_id;
end;
$$;

revoke all on function public.transfer_shopping_list_ownership(uuid, uuid) from public;
grant execute on function public.transfer_shopping_list_ownership(uuid, uuid) to authenticated;
