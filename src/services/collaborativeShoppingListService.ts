import { normalizeKey } from "../utils/normalize";
import type {
  CollaborativeShoppingList,
  CollaborativeShoppingListItem,
  CollaborativeShoppingListMember,
  ShoppingListMemberRole,
} from "../types/domain";
import { getUserOrThrow, requireSupabase } from "./authService";

type MemberRow = {
  list_id: string;
  role: ShoppingListMemberRole;
};

export async function getCollaborativeListsFromDB(): Promise<CollaborativeShoppingList[]> {
  const client = requireSupabase();
  const user = await getUserOrThrow();

  const { data: memberRows, error: memberError } = await client
    .from("shopping_list_members")
    .select("list_id, role")
    .eq("user_id", user.id);

  if (memberError) throw memberError;
  const memberships = (memberRows || []) as MemberRow[];
  const ids = memberships.map((entry) => entry.list_id);
  if (!ids.length) return [];

  const { data: lists, error: listError } = await client
    .from("shopping_lists")
    .select("id, owner_user_id, name, share_code, created_at, updated_at")
    .in("id", ids)
    .order("updated_at", { ascending: false });

  if (listError) throw listError;
  const roleById = new Map(memberships.map((entry) => [entry.list_id, entry.role]));

  return (lists || []).map((row) => ({
    ...(row as CollaborativeShoppingList),
    role: roleById.get(String((row as { id: string }).id)),
  }));
}

export async function createCollaborativeListInDB(
  name: string,
): Promise<CollaborativeShoppingList> {
  const client = requireSupabase();
  const user = await getUserOrThrow();
  const trimmed = name.trim();
  if (!trimmed) throw new Error("Nome da lista e obrigatorio.");

  const { data, error } = await client
    .from("shopping_lists")
    .insert({
      owner_user_id: user.id,
      name: trimmed,
    })
    .select("id, owner_user_id, name, share_code, created_at, updated_at")
    .single();

  if (error) throw error;
  return { ...(data as CollaborativeShoppingList), role: "owner" };
}

export async function joinCollaborativeListByCodeInDB(
  code: string,
): Promise<CollaborativeShoppingList> {
  const client = requireSupabase();
  const trimmed = code.trim();
  if (!trimmed) throw new Error("Codigo de compartilhamento invalido.");

  const { data: listId, error: rpcError } = await client.rpc("join_shopping_list_by_code", {
    p_code: trimmed,
  });
  if (rpcError) throw rpcError;

  const { data, error } = await client
    .from("shopping_lists")
    .select("id, owner_user_id, name, share_code, created_at, updated_at")
    .eq("id", listId)
    .single();
  if (error) throw error;

  const user = await getUserOrThrow();
  const { data: membership, error: memberError } = await client
    .from("shopping_list_members")
    .select("role")
    .eq("list_id", listId)
    .eq("user_id", user.id)
    .single();
  if (memberError) throw memberError;

  return {
    ...(data as CollaborativeShoppingList),
    role: (membership as { role: ShoppingListMemberRole }).role,
  };
}

export async function getCollaborativeListItemsFromDB(
  listId: string,
): Promise<CollaborativeShoppingListItem[]> {
  const client = requireSupabase();
  const { data, error } = await client
    .from("shopping_list_items")
    .select(
      "id, list_id, name, normalized_key, quantity, checked, checked_at, checked_by_user_id, created_at, updated_at",
    )
    .eq("list_id", listId)
    .order("created_at", { ascending: false });

  if (error) throw error;
  return (data || []) as CollaborativeShoppingListItem[];
}

export async function addCollaborativeListItemToDB(
  listId: string,
  name: string,
  quantity?: string,
): Promise<CollaborativeShoppingListItem> {
  const client = requireSupabase();
  const trimmedName = name.trim();
  if (!trimmedName) throw new Error("Nome do item e obrigatorio.");

  const { data, error } = await client
    .from("shopping_list_items")
    .insert({
      list_id: listId,
      name: trimmedName,
      normalized_key: normalizeKey(trimmedName),
      quantity: quantity?.trim() || null,
    })
    .select(
      "id, list_id, name, normalized_key, quantity, checked, checked_at, checked_by_user_id, created_at, updated_at",
    )
    .single();
  if (error) throw error;
  return data as CollaborativeShoppingListItem;
}

export async function toggleCollaborativeListItemInDB(
  listId: string,
  itemId: string,
  nextChecked: boolean,
): Promise<void> {
  const client = requireSupabase();
  const user = await getUserOrThrow();
  const { error } = await client
    .from("shopping_list_items")
    .update({
      checked: nextChecked,
      checked_at: nextChecked ? new Date().toISOString() : null,
      checked_by_user_id: nextChecked ? user.id : null,
    })
    .eq("list_id", listId)
    .eq("id", itemId);
  if (error) throw error;
}

export async function removeCollaborativeListItemFromDB(
  listId: string,
  itemId: string,
): Promise<void> {
  const client = requireSupabase();
  const { error } = await client
    .from("shopping_list_items")
    .delete()
    .eq("list_id", listId)
    .eq("id", itemId);
  if (error) throw error;
}

export async function clearCollaborativeListItemsInDB(
  listId: string,
  onlyChecked: boolean,
): Promise<void> {
  const client = requireSupabase();
  const query = client.from("shopping_list_items").delete().eq("list_id", listId);
  const { error } = onlyChecked ? await query.eq("checked", true) : await query;
  if (error) throw error;
}

export async function renameCollaborativeListInDB(
  listId: string,
  name: string,
): Promise<void> {
  const client = requireSupabase();
  const trimmed = name.trim();
  if (!trimmed) throw new Error("Nome da lista e obrigatorio.");
  const { error } = await client
    .from("shopping_lists")
    .update({ name: trimmed })
    .eq("id", listId);
  if (error) throw error;
}

export async function deleteCollaborativeListInDB(listId: string): Promise<void> {
  const client = requireSupabase();
  const { error } = await client.from("shopping_lists").delete().eq("id", listId);
  if (error) throw error;
}

export async function regenerateCollaborativeListCodeInDB(
  listId: string,
): Promise<string> {
  const client = requireSupabase();
  const nextCode = crypto.randomUUID().replace(/-/g, "").slice(0, 10).toUpperCase();
  const { data, error } = await client
    .from("shopping_lists")
    .update({ share_code: nextCode })
    .eq("id", listId)
    .select("share_code")
    .single();
  if (error) throw error;
  return String((data as { share_code: string }).share_code || nextCode);
}

export async function getCollaborativeListMembersFromDB(
  listId: string,
): Promise<CollaborativeShoppingListMember[]> {
  const client = requireSupabase();
  const { data, error } = await client
    .from("shopping_list_members")
    .select("list_id, user_id, role, created_at")
    .eq("list_id", listId)
    .order("created_at", { ascending: true });
  if (error) throw error;
  return (data || []) as CollaborativeShoppingListMember[];
}

export async function updateCollaborativeListMemberRoleInDB(
  listId: string,
  userId: string,
  role: Exclude<ShoppingListMemberRole, "owner">,
): Promise<void> {
  const client = requireSupabase();
  const { error } = await client
    .from("shopping_list_members")
    .update({ role })
    .eq("list_id", listId)
    .eq("user_id", userId);
  if (error) throw error;
}

export async function removeCollaborativeListMemberFromDB(
  listId: string,
  userId: string,
): Promise<void> {
  const client = requireSupabase();
  const { error } = await client
    .from("shopping_list_members")
    .delete()
    .eq("list_id", listId)
    .eq("user_id", userId);
  if (error) throw error;
}

export async function transferCollaborativeListOwnershipInDB(
  listId: string,
  newOwnerUserId: string,
): Promise<void> {
  const client = requireSupabase();
  const { error } = await client.rpc("transfer_shopping_list_ownership", {
    p_list_id: listId,
    p_new_owner_id: newOwnerUserId,
  });
  if (error) throw error;
}
