-- Enforce unique pending item per list on collaborative shopping lists

-- Keep the oldest pending row per (list_id, normalized_key) and remove duplicates.
with ranked_pending as (
  select
    id,
    row_number() over (
      partition by list_id, normalized_key
      order by created_at asc, id asc
    ) as rn
  from public.shopping_list_items
  where checked = false
),
to_delete as (
  select id
  from ranked_pending
  where rn > 1
)
delete from public.shopping_list_items
where id in (select id from to_delete);

create unique index if not exists ux_shopping_list_items_pending_normalized_key
on public.shopping_list_items (list_id, normalized_key)
where checked = false;
