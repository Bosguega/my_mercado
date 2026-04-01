import { useId, useMemo, useState, type FormEvent } from "react";
import { Eraser, ListChecks, Plus, Trash2, Pencil } from "lucide-react";
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
import { ShoppingListItem } from "./ShoppingListItem";
import ConfirmDialog from "./ConfirmDialog";
import type {
  ConfirmDialogConfig,
  ShoppingListItem as ShoppingListItemType,
} from "../types/ui";

const EMPTY_SHOPPING_ITEMS: ShoppingListItemType[] = [];
type HistoryMatchType = "exact" | "approx" | "none";

function ShoppingListTab() {
  const sessionUserId = useReceiptsSessionStore((state) => state.sessionUserId);
  const { data: savedReceipts = [] } = useAllReceiptsQuery();

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

  const { historyByKey, suggestions } = usePurchaseHistory(savedReceipts);
  const orderedItems = useSortedShoppingItems(shoppingItems);

  const [itemName, setItemName] = useState("");
  const [itemQty, setItemQty] = useState("");
  const [transferTargetByItem, setTransferTargetByItem] = useState<Record<string, string>>({});
  const suggestionListId = useId();
  const [confirmDialog, setConfirmDialog] = useState<ConfirmDialogConfig | null>(null);
  const [confirmBusy, setConfirmBusy] = useState(false);

  const activeList = lists.find((list) => list.id === activeListId) || lists[0];
  const checkedCount = shoppingItems.filter((item) => item.checked).length;
  const pendingCount = shoppingItems.length - checkedCount;
  const listTransferOptions = lists.filter((list) => list.id !== activeListId);

  const getTransferTargetId = (itemId: string): string => {
    const selected = transferTargetByItem[itemId];
    if (selected && listTransferOptions.some((list) => list.id === selected)) {
      return selected;
    }
    return listTransferOptions[0]?.id || "";
  };

  const handleAddItem = (event: FormEvent) => {
    event.preventDefault();
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

  const handleCreateList = () => {
    const rawName = window.prompt("Nome da nova lista:");
    if (rawName === null) return;
    const result = createList(sessionUserId, rawName);

    if (!result.ok) {
      if (result.reason === "duplicate") toast.error("Ja existe uma lista com esse nome.");
      else toast.error("Informe um nome valido para a lista.");
      return;
    }

    toast.success("Lista criada!");
  };

  const handleRenameList = () => {
    if (!activeList) return;
    const rawName = window.prompt("Novo nome da lista:", activeList.name);
    if (rawName === null) return;

    const result = renameList(sessionUserId, activeList.id, rawName);
    if (!result.ok) {
      if (result.reason === "duplicate") toast.error("Ja existe uma lista com esse nome.");
      else toast.error("Nao foi possivel renomear a lista.");
      return;
    }
    toast.success("Lista renomeada!");
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
    const entries = fallback.slice(0, 3).map((item) => item.entry);
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
            {pendingCount} pendente(s) de {shoppingItems.length}
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
                  clearAll(sessionUserId, activeListId);
                },
              })
            }
            disabled={shoppingItems.length === 0}
          >
            <Trash2 size={16} />
          </button>
        </div>
      </div>

      <div
        className="glass-card"
        style={{
          marginBottom: "1rem",
          padding: "0.75rem",
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
          disabled={!activeList}
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
                  : `A lista "${activeList?.name || "atual"}" e seus itens serao removidos.`,
              confirmText: "Excluir lista",
              danger: true,
              onConfirm: async () => {
                if (!activeList) return;
                const result = deleteList(sessionUserId, activeList.id);
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
          disabled={!activeList || lists.length <= 1}
        >
          <Trash2 size={15} /> Excluir
        </button>
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

        <button className="btn" style={{ width: "100%" }} type="submit">
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
                onToggle={() => toggleChecked(sessionUserId, item.id, activeListId)}
                onRemove={() => removeItem(sessionUserId, item.id, activeListId)}
                transferOptions={listTransferOptions}
                transferTargetId={getTransferTargetId(item.id)}
                onTransferTargetChange={(targetListId) =>
                  setTransferTargetByItem((prev) => ({ ...prev, [item.id]: targetListId }))
                }
                onMoveToList={() => handleMoveItem(item)}
                onCopyToList={() => handleCopyItem(item)}
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
