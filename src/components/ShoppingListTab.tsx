import { useEffect, useId, useMemo, useState, type FormEvent } from "react";
import {
  Eraser,
  KeyRound,
  ListChecks,
  Pencil,
  Plus,
  RefreshCcw,
  Trash2,
  Users,
} from "lucide-react";
import { toast } from "react-hot-toast";
import { useAllReceiptsQuery } from "../hooks/queries/useReceiptsQuery";
import { useReceiptsSessionStore } from "../stores/useReceiptsSessionStore";
import { useShoppingListStore } from "../stores/useShoppingListStore";
import {
  usePurchaseHistory,
  type PurchaseHistoryEntry,
} from "../hooks/queries/usePurchaseHistory";
import { useSortedShoppingItems } from "../hooks/queries/useSortedShoppingItems";
import { sanitizeShoppingList, toText } from "../utils/shoppingList";
import { normalizeKey } from "../utils/normalize";
import { scoreHistoryKeyMatch } from "../utils/shoppingHistoryMatch";
import type { CollaborativeShoppingListItem } from "../types/domain";
import {
  useAddCollaborativeListItem,
  useClearCollaborativeListItems,
  useCollaborativeListItemsQuery,
  useCollaborativeListMembersQuery,
  useCollaborativeListRealtime,
  useCollaborativeListsQuery,
  useCreateCollaborativeList,
  useDeleteCollaborativeList,
  useJoinCollaborativeListByCode,
  useRegenerateCollaborativeListCode,
  useRenameCollaborativeList,
  useRemoveCollaborativeListItem,
  useToggleCollaborativeListItem,
  useUpdateCollaborativeListMemberRole,
  useRemoveCollaborativeListMember,
  useTransferCollaborativeListOwnership,
} from "../hooks/queries/useCollaborativeShoppingListsQuery";
import { ShoppingListItem } from "./ShoppingListItem";
import ConfirmDialog from "./ConfirmDialog";
import type {
  ConfirmDialogConfig,
  ShoppingListItem as ShoppingListItemType,
} from "../types/ui";

const EMPTY_SHOPPING_ITEMS: ShoppingListItemType[] = [];
type HistoryMatchType = "exact" | "approx" | "none";
type ShoppingMode = "local" | "collab";

function toUiItem(item: CollaborativeShoppingListItem): ShoppingListItemType {
  return {
    id: item.id,
    name: item.name,
    normalized_key: item.normalized_key,
    quantity: item.quantity || undefined,
    checked: item.checked,
    created_at: item.created_at,
    checked_at: item.checked_at || undefined,
    checked_by_user_id: item.checked_by_user_id || undefined,
  };
}

function ShoppingListTab() {
  const sessionUserId = useReceiptsSessionStore((state) => state.sessionUserId);
  const { data: savedReceipts = [] } = useAllReceiptsQuery();
  const isAuthenticated = Boolean(sessionUserId);

  const [mode, setMode] = useState<ShoppingMode>("local");

  const lists = useShoppingListStore((state) => state.getLists(sessionUserId));
  const activeListId = useShoppingListStore((state) => state.getActiveListId(sessionUserId));
  const rawShoppingItems = useShoppingListStore((state) =>
    state.getItems(sessionUserId, activeListId),
  );

  const shoppingItems = useMemo(
    () => sanitizeShoppingList(rawShoppingItems || EMPTY_SHOPPING_ITEMS),
    [rawShoppingItems],
  );

  const setActiveList = useShoppingListStore((state) => state.setActiveList);
  const createList = useShoppingListStore((state) => state.createList);
  const renameList = useShoppingListStore((state) => state.renameList);
  const deleteList = useShoppingListStore((state) => state.deleteList);
  const addItem = useShoppingListStore((state) => state.addItem);
  const toggleChecked = useShoppingListStore((state) => state.toggleChecked);
  const removeItem = useShoppingListStore((state) => state.removeItem);
  const clearChecked = useShoppingListStore((state) => state.clearChecked);
  const clearAll = useShoppingListStore((state) => state.clearAll);
  const moveItemToList = useShoppingListStore((state) => state.moveItemToList);
  const copyItemToList = useShoppingListStore((state) => state.copyItemToList);

  const collaborativeMode = mode === "collab" && isAuthenticated;
  const collaborativeListsQuery = useCollaborativeListsQuery(collaborativeMode);
  const collaborativeLists = useMemo(
    () => collaborativeListsQuery.data || [],
    [collaborativeListsQuery.data]
  );
  const [activeCollaborativeListId, setActiveCollaborativeListId] = useState<string | null>(null);
  const activeCollaborativeList = useMemo(
    () =>
      collaborativeLists.find((entry) => entry.id === activeCollaborativeListId) ||
      collaborativeLists[0] ||
      null,
    [activeCollaborativeListId, collaborativeLists],
  );
  const collaborativeItemsQuery = useCollaborativeListItemsQuery(
    activeCollaborativeList?.id || null,
    collaborativeMode,
  );
  const collaborativeMembersQuery = useCollaborativeListMembersQuery(
    activeCollaborativeList?.id || null,
    collaborativeMode,
  );
  useCollaborativeListRealtime(activeCollaborativeList?.id || null, collaborativeMode);

  const createCollaborativeList = useCreateCollaborativeList();
  const joinCollaborativeList = useJoinCollaborativeListByCode();
  const renameCollaborativeList = useRenameCollaborativeList();
  const deleteCollaborativeList = useDeleteCollaborativeList();
  const regenerateCollaborativeCode = useRegenerateCollaborativeListCode();
  const addCollaborativeItem = useAddCollaborativeListItem();
  const toggleCollaborativeItem = useToggleCollaborativeListItem();
  const removeCollaborativeItem = useRemoveCollaborativeListItem();
  const clearCollaborativeItems = useClearCollaborativeListItems();
  const updateCollaborativeMemberRole = useUpdateCollaborativeListMemberRole();
  const removeCollaborativeMember = useRemoveCollaborativeListMember();
  const transferCollaborativeOwnership = useTransferCollaborativeListOwnership();

  useEffect(() => {
    if (!collaborativeMode) return;
    if (!activeCollaborativeListId && collaborativeLists.length > 0) {
      setActiveCollaborativeListId(collaborativeLists[0].id);
    }
    if (
      activeCollaborativeListId &&
      !collaborativeLists.some((entry) => entry.id === activeCollaborativeListId)
    ) {
      setActiveCollaborativeListId(collaborativeLists[0]?.id || null);
    }
  }, [activeCollaborativeListId, collaborativeLists, collaborativeMode]);

  const collaborativeItems = useMemo(
    () => (collaborativeItemsQuery.data || []).map(toUiItem),
    [collaborativeItemsQuery.data],
  );
  const collaborativeMembers = collaborativeMembersQuery.data || [];
  const effectiveItems = mode === "local" ? shoppingItems : collaborativeItems;
  const orderedItems = useSortedShoppingItems(effectiveItems);

  const { historyByKey, suggestions } = usePurchaseHistory(savedReceipts);

  const [itemName, setItemName] = useState("");
  const [itemQty, setItemQty] = useState("");
  const [transferTargetByItem, setTransferTargetByItem] = useState<Record<string, string>>({});
  const suggestionListId = useId();
  const [confirmDialog, setConfirmDialog] = useState<ConfirmDialogConfig | null>(null);
  const [confirmBusy, setConfirmBusy] = useState(false);

  const activeLocalList = lists.find((list) => list.id === activeListId) || lists[0];
  const checkedCount = effectiveItems.filter((item) => item.checked).length;
  const pendingCount = effectiveItems.length - checkedCount;
  const listTransferOptions = mode === "local" ? lists.filter((list) => list.id !== activeListId) : [];

  const getTransferTargetId = (itemId: string): string => {
    const selected = transferTargetByItem[itemId];
    if (selected && listTransferOptions.some((list) => list.id === selected)) {
      return selected;
    }
    return listTransferOptions[0]?.id || "";
  };

  const handleAddItem = async (event: FormEvent) => {
    event.preventDefault();

    if (mode === "collab") {
      if (!activeCollaborativeList?.id) {
        toast.error("Crie ou entre em uma lista colaborativa primeiro.");
        return;
      }
      try {
        await addCollaborativeItem.mutateAsync({
          listId: activeCollaborativeList.id,
          name: itemName,
          quantity: itemQty,
        });
        setItemName("");
        setItemQty("");
        toast.success("Item adicionado na lista colaborativa.");
      } catch {
        toast.error("Nao foi possivel adicionar item na lista colaborativa.");
      }
      return;
    }

    const result = addItem(sessionUserId, itemName, itemQty, activeListId);
    if (!result.ok) {
      if (result.reason === "duplicate") {
        toast.error("Esse item ja esta pendente na lista.");
      } else {
        toast.error("Digite o nome do item para adicionar.");
      }
      return;
    }

    setItemName("");
    setItemQty("");
    toast.success("Item adicionado na lista.");
  };

  const handleCreateList = async () => {
    const rawName = window.prompt(
      mode === "collab" ? "Nome da nova lista colaborativa:" : "Nome da nova lista:",
    );
    if (rawName === null) return;

    if (mode === "collab") {
      try {
        const created = await createCollaborativeList.mutateAsync(rawName);
        setActiveCollaborativeListId(created.id);
        toast.success("Lista colaborativa criada!");
      } catch {
        toast.error("Nao foi possivel criar a lista colaborativa.");
      }
      return;
    }

    const result = createList(sessionUserId, rawName);
    if (!result.ok) {
      if (result.reason === "duplicate") toast.error("Ja existe uma lista com esse nome.");
      else toast.error("Informe um nome valido para a lista.");
      return;
    }
    toast.success("Lista criada!");
  };

  const handleRenameList = async () => {
    if (mode === "collab") {
      if (!activeCollaborativeList) return;
      const rawName = window.prompt("Novo nome da lista:", activeCollaborativeList.name);
      if (rawName === null) return;
      try {
        await renameCollaborativeList.mutateAsync({
          listId: activeCollaborativeList.id,
          name: rawName,
        });
        toast.success("Lista renomeada!");
      } catch {
        toast.error("Nao foi possivel renomear a lista colaborativa.");
      }
      return;
    }

    if (!activeLocalList) return;
    const rawName = window.prompt("Novo nome da lista:", activeLocalList.name);
    if (rawName === null) return;
    const result = renameList(sessionUserId, activeLocalList.id, rawName);
    if (!result.ok) {
      if (result.reason === "duplicate") toast.error("Ja existe uma lista com esse nome.");
      else toast.error("Nao foi possivel renomear a lista.");
      return;
    }
    toast.success("Lista renomeada!");
  };

  const handleJoinByCode = async () => {
    const rawCode = window.prompt("Codigo da lista compartilhada:");
    if (rawCode === null) return;
    try {
      const joined = await joinCollaborativeList.mutateAsync(rawCode);
      setMode("collab");
      setActiveCollaborativeListId(joined.id);
      toast.success("Lista colaborativa conectada!");
    } catch {
      toast.error("Codigo invalido ou sem permissao para entrar na lista.");
    }
  };

  const handleCopyShareCode = async () => {
    if (!activeCollaborativeList?.share_code) return;
    try {
      await navigator.clipboard.writeText(activeCollaborativeList.share_code);
      toast.success("Codigo copiado!");
    } catch {
      toast.error("Nao foi possivel copiar o codigo.");
    }
  };

  const handleRegenerateCode = async () => {
    if (!activeCollaborativeList?.id) return;
    try {
      const newCode = await regenerateCollaborativeCode.mutateAsync(activeCollaborativeList.id);
      await navigator.clipboard.writeText(newCode);
      toast.success("Novo codigo gerado e copiado!");
    } catch {
      toast.error("Nao foi possivel gerar novo codigo.");
    }
  };

  const handleChangeMemberRole = async (
    userId: string,
    nextRole: "editor" | "viewer",
  ) => {
    if (!activeCollaborativeList?.id) return;
    try {
      await updateCollaborativeMemberRole.mutateAsync({
        listId: activeCollaborativeList.id,
        userId,
        role: nextRole,
      });
      toast.success("Permissao atualizada.");
    } catch {
      toast.error("Nao foi possivel atualizar permissao.");
    }
  };

  const handleRemoveMember = async (userId: string) => {
    if (!activeCollaborativeList?.id) return;
    try {
      await removeCollaborativeMember.mutateAsync({
        listId: activeCollaborativeList.id,
        userId,
      });
      toast.success("Membro removido da lista.");
    } catch {
      toast.error("Nao foi possivel remover membro.");
    }
  };

  const handleLeaveCollaborativeList = async () => {
    if (!activeCollaborativeList?.id || !sessionUserId) return;
    if (activeCollaborativeList.role === "owner") {
      toast.error("Owner nao pode sair da propria lista. Exclua a lista ou transfira ownership em uma proxima etapa.");
      return;
    }
    try {
      await removeCollaborativeMember.mutateAsync({
        listId: activeCollaborativeList.id,
        userId: sessionUserId,
      });
      toast.success("Voce saiu da lista colaborativa.");
      setActiveCollaborativeListId(null);
    } catch {
      toast.error("Nao foi possivel sair da lista.");
    }
  };

  const handleTransferOwnership = async (newOwnerUserId: string) => {
    if (!activeCollaborativeList?.id) return;
    try {
      await transferCollaborativeOwnership.mutateAsync({
        listId: activeCollaborativeList.id,
        newOwnerUserId,
      });
      toast.success("Ownership transferido com sucesso.");
    } catch {
      toast.error("Nao foi possivel transferir ownership.");
    }
  };

  const handleMoveItem = (item: ShoppingListItemType) => {
    const targetListId = getTransferTargetId(item.id);
    if (!targetListId) {
      toast.error("Crie outra lista para mover itens.");
      return;
    }

    const result = moveItemToList(sessionUserId, item.id, targetListId, activeListId);
    if (!result.ok) {
      if (result.reason === "duplicate") {
        toast.error("Ja existe item pendente equivalente na lista destino.");
      } else if (result.reason === "same_list") {
        toast.error("Selecione uma lista de destino diferente.");
      } else {
        toast.error("Nao foi possivel mover o item.");
      }
      return;
    }

    const destinationName = lists.find((list) => list.id === targetListId)?.name || "outra lista";
    toast.success(`Item movido para "${destinationName}".`);
  };

  const handleCopyItem = (item: ShoppingListItemType) => {
    const targetListId = getTransferTargetId(item.id);
    if (!targetListId) {
      toast.error("Crie outra lista para copiar itens.");
      return;
    }

    const result = copyItemToList(sessionUserId, item.id, targetListId, activeListId);
    if (!result.ok) {
      if (result.reason === "duplicate") {
        toast.error("Ja existe item pendente equivalente na lista destino.");
      } else if (result.reason === "same_list") {
        toast.error("Selecione uma lista de destino diferente.");
      } else {
        toast.error("Nao foi possivel copiar o item.");
      }
      return;
    }

    const destinationName = lists.find((list) => list.id === targetListId)?.name || "outra lista";
    toast.success(`Item copiado para "${destinationName}".`);
  };

  const closeConfirm = () => {
    confirmDialog?.onCancel?.();
    setConfirmDialog(null);
    setConfirmBusy(false);
  };

  const runConfirm = async () => {
    if (!confirmDialog) return;
    setConfirmBusy(true);
    try {
      await confirmDialog.onConfirm();
      setConfirmDialog(null);
    } finally {
      setConfirmBusy(false);
    }
  };

  const getRecentHistory = (
    item: ShoppingListItemType,
  ): { entries: PurchaseHistoryEntry[]; matchType: HistoryMatchType } => {
    const safeKey = normalizeKey(toText(item.normalized_key).trim() || item.name);
    if (!safeKey) return { entries: [], matchType: "none" };

    const exact = historyByKey.get(safeKey);
    if (exact && exact.length > 0) return { entries: exact.slice(0, 3), matchType: "exact" };

    const fallback: Array<{ entry: PurchaseHistoryEntry; score: number }> = [];
    for (const [key, entries] of historyByKey.entries()) {
      const match = scoreHistoryKeyMatch(safeKey, key);
      if (match.score > 0) {
        for (const entry of entries.slice(0, 2)) {
          fallback.push({ entry, score: match.score });
        }
      }
    }

    fallback.sort((a, b) => b.score - a.score || b.entry.timestamp - a.entry.timestamp);
    const entries = fallback.slice(0, 3).map((candidate) => candidate.entry);
    return {
      entries,
      matchType: entries.length > 0 ? "approx" : "none",
    };
  };

  return (
    <div>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
          marginBottom: "1rem",
          gap: "1rem",
        }}
      >
        <div>
          <h2 className="section-title" style={{ marginBottom: "0.2rem" }}>
            <ListChecks size={20} color="var(--primary)" />
            Lista de Compras
          </h2>
          <p style={{ color: "#64748b", fontSize: "0.8rem", marginLeft: "1.8rem" }}>
            {pendingCount} pendente(s) de {effectiveItems.length}
          </p>
        </div>

        <div style={{ display: "flex", gap: "0.5rem" }}>
          <button
            className="btn"
            style={{
              padding: "0.45rem 0.6rem",
              background: "rgba(245, 158, 11, 0.15)",
              boxShadow: "none",
              color: "#f59e0b",
            }}
            title="Limpar marcados"
            onClick={() =>
              setConfirmDialog({
                title: "Limpar itens marcados?",
                message: "Todos os itens ja marcados como comprados serao removidos da lista.",
                confirmText: "Limpar marcados",
                danger: true,
                onConfirm: async () => {
                  if (mode === "collab" && activeCollaborativeList?.id) {
                    await clearCollaborativeItems.mutateAsync({
                      listId: activeCollaborativeList.id,
                      onlyChecked: true,
                    });
                    return;
                  }
                  clearChecked(sessionUserId, activeListId);
                },
              })
            }
            disabled={checkedCount === 0}
          >
            <Eraser size={16} />
          </button>
          <button
            className="btn"
            style={{
              padding: "0.45rem 0.6rem",
              background: "rgba(239, 68, 68, 0.15)",
              boxShadow: "none",
              color: "#ef4444",
            }}
            title="Limpar lista"
            onClick={() =>
              setConfirmDialog({
                title: "Limpar lista completa?",
                message: "Essa acao remove todos os itens da lista atual e nao pode ser desfeita.",
                confirmText: "Limpar lista",
                danger: true,
                onConfirm: async () => {
                  if (mode === "collab" && activeCollaborativeList?.id) {
                    await clearCollaborativeItems.mutateAsync({
                      listId: activeCollaborativeList.id,
                      onlyChecked: false,
                    });
                    return;
                  }
                  clearAll(sessionUserId, activeListId);
                },
              })
            }
            disabled={effectiveItems.length === 0}
          >
            <Trash2 size={16} />
          </button>
        </div>
      </div>

      <div className="glass-card" style={{ marginBottom: "1rem", padding: "0.75rem" }}>
        <div style={{ display: "flex", gap: "0.5rem", marginBottom: "0.7rem" }}>
          <button
            className="btn"
            style={{
              background: mode === "local" ? "var(--primary-gradient)" : "rgba(255,255,255,0.08)",
              boxShadow: mode === "local" ? undefined : "none",
            }}
            onClick={() => setMode("local")}
          >
            Lista Local
          </button>
          <button
            className="btn"
            style={{
              background:
                mode === "collab" ? "linear-gradient(135deg,#0ea5e9,#2563eb)" : "rgba(255,255,255,0.08)",
              boxShadow: mode === "collab" ? undefined : "none",
              opacity: isAuthenticated ? 1 : 0.7,
            }}
            onClick={() => {
              if (!isAuthenticated) {
                toast.error("Faca login para usar listas colaborativas.");
                return;
              }
              setMode("collab");
            }}
          >
            <Users size={15} /> Colaborativa
          </button>
          {isAuthenticated && (
            <button
              className="btn"
              style={{ background: "rgba(255,255,255,0.08)", boxShadow: "none" }}
              onClick={handleJoinByCode}
            >
              <KeyRound size={15} /> Entrar por codigo
            </button>
          )}
        </div>

        {mode === "collab" && !isAuthenticated && (
          <p style={{ color: "#94a3b8", fontSize: "0.85rem" }}>
            Login necessario para criar ou participar de listas colaborativas.
          </p>
        )}

        {mode === "collab" && isAuthenticated && (
          <div
            style={{
              marginBottom: "0.7rem",
              display: "grid",
              gridTemplateColumns: "1fr auto auto auto",
              gap: "0.5rem",
              alignItems: "center",
            }}
          >
            <select
              className="search-input"
              value={activeCollaborativeList?.id || ""}
              onChange={(event) => setActiveCollaborativeListId(event.target.value || null)}
              aria-label="Selecionar lista colaborativa"
            >
              {collaborativeLists.map((list) => (
                <option key={list.id} value={list.id}>
                  {list.name} ({list.role || "membro"})
                </option>
              ))}
            </select>
            <button className="btn" style={{ padding: "0.5rem 0.7rem" }} onClick={handleCreateList}>
              <Plus size={15} /> Nova
            </button>
            <button
              className="btn"
              style={{ padding: "0.5rem 0.7rem", background: "rgba(255,255,255,0.08)", boxShadow: "none" }}
              onClick={handleRenameList}
              disabled={!activeCollaborativeList}
            >
              <Pencil size={15} /> Renomear
            </button>
            <button
              className="btn"
              style={{
                padding: "0.5rem 0.7rem",
                background: "rgba(239, 68, 68, 0.12)",
                boxShadow: "none",
                color: "#f87171",
              }}
              onClick={() =>
                setConfirmDialog({
                  title: "Excluir lista colaborativa?",
                  message: `A lista "${activeCollaborativeList?.name || "atual"}" e seus itens serao removidos.`,
                  confirmText: "Excluir lista",
                  danger: true,
                  onConfirm: async () => {
                    if (!activeCollaborativeList?.id) return;
                    await deleteCollaborativeList.mutateAsync(activeCollaborativeList.id);
                    toast.success("Lista colaborativa excluida!");
                    setActiveCollaborativeListId(null);
                  },
                })
              }
              disabled={!activeCollaborativeList || activeCollaborativeList.role !== "owner"}
            >
              <Trash2 size={15} /> Excluir
            </button>
          </div>
        )}

        {mode === "local" && (
          <div
            style={{
              marginBottom: "0.7rem",
              display: "grid",
              gridTemplateColumns: "1fr auto auto auto",
              gap: "0.5rem",
              alignItems: "center",
            }}
          >
            <select
              className="search-input"
              value={activeListId}
              onChange={(e) => setActiveList(sessionUserId, e.target.value)}
              aria-label="Selecionar lista ativa"
            >
              {lists.map((list) => (
                <option key={list.id} value={list.id}>
                  {list.name}
                </option>
              ))}
            </select>
            <button className="btn" style={{ padding: "0.5rem 0.7rem" }} onClick={handleCreateList}>
              <Plus size={15} /> Nova
            </button>
            <button
              className="btn"
              style={{ padding: "0.5rem 0.7rem", background: "rgba(255,255,255,0.08)", boxShadow: "none" }}
              onClick={handleRenameList}
              disabled={!activeLocalList}
            >
              <Pencil size={15} /> Renomear
            </button>
            <button
              className="btn"
              style={{
                padding: "0.5rem 0.7rem",
                background: "rgba(239, 68, 68, 0.12)",
                boxShadow: "none",
                color: "#f87171",
              }}
              onClick={() =>
                setConfirmDialog({
                  title: "Excluir lista?",
                  message:
                    lists.length <= 1
                      ? "Voce precisa ter pelo menos uma lista."
                      : `A lista "${activeLocalList?.name || "atual"}" e seus itens serao removidos.`,
                  confirmText: "Excluir lista",
                  danger: true,
                  onConfirm: async () => {
                    if (!activeLocalList) return;
                    const result = deleteList(sessionUserId, activeLocalList.id);
                    if (!result.ok) {
                      if (result.reason === "last_list") {
                        toast.error("Nao e possivel excluir a ultima lista.");
                      } else {
                        toast.error("Nao foi possivel excluir a lista.");
                      }
                      return;
                    }
                    toast.success("Lista excluida!");
                  },
                })
              }
              disabled={!activeLocalList || lists.length <= 1}
            >
              <Trash2 size={15} /> Excluir
            </button>
          </div>
        )}

        {mode === "collab" && isAuthenticated && activeCollaborativeList && (
          <>
            <div
              style={{
                marginTop: "0.1rem",
                padding: "0.65rem",
                borderRadius: "0.7rem",
                background: "rgba(14,165,233,0.10)",
                border: "1px solid rgba(14,165,233,0.22)",
                display: "flex",
                flexWrap: "wrap",
                gap: "0.45rem",
                alignItems: "center",
              }}
            >
              <span style={{ color: "#7dd3fc", fontSize: "0.82rem" }}>
                Codigo: <strong>{activeCollaborativeList.share_code}</strong>
              </span>
              <button
                className="btn"
                style={{ padding: "0.35rem 0.55rem", background: "rgba(255,255,255,0.1)", boxShadow: "none" }}
                onClick={handleCopyShareCode}
              >
                Copiar codigo
              </button>
              <button
                className="btn"
                style={{ padding: "0.35rem 0.55rem", background: "rgba(255,255,255,0.1)", boxShadow: "none" }}
                onClick={handleRegenerateCode}
                disabled={activeCollaborativeList.role !== "owner"}
              >
                <RefreshCcw size={13} /> Novo codigo
              </button>
              <span style={{ color: "#bae6fd", fontSize: "0.74rem" }}>
                Modo colaborativo em tempo real
              </span>
            </div>

            <div
              style={{
                marginTop: "0.55rem",
                padding: "0.65rem",
                borderRadius: "0.7rem",
                background: "rgba(2,132,199,0.08)",
                border: "1px solid rgba(2,132,199,0.18)",
              }}
            >
              <div
                style={{
                  color: "#bae6fd",
                  fontSize: "0.78rem",
                  textTransform: "uppercase",
                  marginBottom: "0.4rem",
                  fontWeight: 700,
                }}
              >
                Membros ({collaborativeMembers.length})
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: "0.35rem" }}>
                {collaborativeMembers.map((member) => (
                  <div
                    key={member.user_id}
                    style={{
                      display: "grid",
                      gridTemplateColumns: "1fr auto auto auto",
                      gap: "0.4rem",
                      alignItems: "center",
                    }}
                  >
                    <span style={{ color: "#e2e8f0", fontSize: "0.8rem" }}>
                      {member.user_id === sessionUserId ? "Voce" : `${member.user_id.slice(0, 8)}...`}
                    </span>
                    <select
                      className="search-input"
                      value={member.role === "owner" ? "owner" : member.role}
                      disabled={
                        activeCollaborativeList.role !== "owner" ||
                        member.role === "owner"
                      }
                      onChange={(event) =>
                        handleChangeMemberRole(
                          member.user_id,
                          event.target.value as "editor" | "viewer",
                        )
                      }
                      style={{ minHeight: "32px", padding: "0.3rem 0.45rem" }}
                    >
                      {member.role === "owner" && <option value="owner">owner</option>}
                      <option value="editor">editor</option>
                      <option value="viewer">viewer</option>
                    </select>
                    <button
                      className="btn"
                      style={{
                        padding: "0.35rem 0.55rem",
                        background: "rgba(239,68,68,0.16)",
                        boxShadow: "none",
                        color: "#fca5a5",
                      }}
                      disabled={
                        activeCollaborativeList.role !== "owner" ||
                        member.role === "owner"
                      }
                      onClick={() => handleRemoveMember(member.user_id)}
                    >
                      Remover
                    </button>
                    <button
                      className="btn"
                      style={{
                        padding: "0.35rem 0.55rem",
                        background: "rgba(16,185,129,0.16)",
                        boxShadow: "none",
                        color: "#86efac",
                      }}
                      disabled={
                        activeCollaborativeList.role !== "owner" ||
                        member.role === "owner"
                      }
                      onClick={() =>
                        setConfirmDialog({
                          title: "Transferir ownership?",
                          message:
                            "Voce deixara de ser owner e passara a ser editor nesta lista.",
                          confirmText: "Transferir",
                          danger: false,
                          onConfirm: async () => {
                            await handleTransferOwnership(member.user_id);
                          },
                        })
                      }
                    >
                      Tornar owner
                    </button>
                  </div>
                ))}
              </div>
              {activeCollaborativeList.role !== "owner" && (
                <div style={{ marginTop: "0.55rem", display: "flex", justifyContent: "flex-end" }}>
                  <button
                    className="btn"
                    style={{
                      padding: "0.35rem 0.6rem",
                      background: "rgba(239,68,68,0.16)",
                      boxShadow: "none",
                      color: "#fca5a5",
                    }}
                    onClick={handleLeaveCollaborativeList}
                  >
                    Sair da lista
                  </button>
                </div>
              )}
            </div>
          </>
        )}
      </div>

      <form className="glass-card" onSubmit={handleAddItem} style={{ marginBottom: "1rem" }}>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 110px",
            gap: "0.5rem",
            marginBottom: "0.75rem",
          }}
        >
          <input
            list={suggestionListId}
            className="search-input"
            placeholder="Ex: Arroz, Leite, Cafe..."
            value={itemName}
            onChange={(e) => setItemName(e.target.value)}
          />
          <input
            className="search-input"
            placeholder="Qtd"
            value={itemQty}
            onChange={(e) => setItemQty(e.target.value)}
          />
        </div>

        <datalist id={suggestionListId}>
          {suggestions.map((suggestion) => (
            <option key={suggestion.key} value={suggestion.label} />
          ))}
        </datalist>

        <button
          className="btn"
          style={{ width: "100%" }}
          type="submit"
          disabled={mode === "collab" && !activeCollaborativeList?.id}
        >
          <Plus size={18} />
          Adicionar Item
        </button>
      </form>

      <div className="items-list" style={{ gap: "0.85rem" }}>
        {orderedItems.length === 0 ? (
          <div className="glass-card" style={{ textAlign: "center", padding: "3rem 1rem" }}>
            <ListChecks size={44} color="#334155" />
            <h3 style={{ color: "#e2e8f0", marginTop: "0.8rem" }}>Sua lista esta vazia</h3>
            <p style={{ color: "#94a3b8", fontSize: "0.9rem", marginTop: "0.3rem" }}>
              Adicione itens para acompanhar o que falta pegar no mercado.
            </p>
          </div>
        ) : (
          orderedItems.map((item) => {
            const historyContext = getRecentHistory(item);
            return (
              <ShoppingListItem
                key={item.id}
                item={item}
                history={historyContext.entries}
                historyMatchType={historyContext.matchType}
                onToggle={() => {
                  if (mode === "collab" && activeCollaborativeList?.id) {
                    void toggleCollaborativeItem.mutateAsync({
                      listId: activeCollaborativeList.id,
                      itemId: item.id,
                      nextChecked: !item.checked,
                    });
                    return;
                  }
                  toggleChecked(sessionUserId, item.id, activeListId);
                }}
                onRemove={() => {
                  if (mode === "collab" && activeCollaborativeList?.id) {
                    void removeCollaborativeItem.mutateAsync({
                      listId: activeCollaborativeList.id,
                      itemId: item.id,
                    });
                    return;
                  }
                  removeItem(sessionUserId, item.id, activeListId);
                }}
                transferOptions={listTransferOptions}
                transferTargetId={getTransferTargetId(item.id)}
                onTransferTargetChange={(targetListId) =>
                  setTransferTargetByItem((prev) => ({ ...prev, [item.id]: targetListId }))
                }
                onMoveToList={mode === "local" ? () => handleMoveItem(item) : undefined}
                onCopyToList={mode === "local" ? () => handleCopyItem(item) : undefined}
                currentUserId={sessionUserId}
              />
            );
          })
        )}
      </div>

      <ConfirmDialog
        isOpen={Boolean(confirmDialog)}
        title={confirmDialog?.title || ""}
        message={confirmDialog?.message || ""}
        confirmText={confirmDialog?.confirmText}
        cancelText={confirmDialog?.cancelText}
        danger={confirmDialog?.danger}
        busy={confirmBusy}
        onCancel={closeConfirm}
        onConfirm={runConfirm}
      />
    </div>
  );
}

export default ShoppingListTab;
