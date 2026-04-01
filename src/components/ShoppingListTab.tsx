import { useId, useState, useMemo, type FormEvent } from "react";
import { Eraser, ListChecks, Plus, Trash2 } from "lucide-react";
import { toast } from "react-hot-toast";
import { useAllReceiptsQuery } from "../hooks/queries/useReceiptsQuery";
import { useReceiptsSessionStore } from "../stores/useReceiptsSessionStore";
import { useShoppingListStore } from "../stores/useShoppingListStore";
import { usePurchaseHistory, type PurchaseHistoryEntry } from "../hooks/queries/usePurchaseHistory";
import { useSortedShoppingItems } from "../hooks/queries/useSortedShoppingItems";
import { sanitizeShoppingList, toText } from "../utils/shoppingList";
import { ShoppingListItem } from "./ShoppingListItem";
import type { ShoppingListItem as ShoppingListItemType } from "../types/ui";

const EMPTY_SHOPPING_ITEMS: ShoppingListItemType[] = [];

function ShoppingListTab() {
  // =========================
  // 1. DADOS (React Query + Zustand)
  // =========================
  const sessionUserId = useReceiptsSessionStore((state) => state.sessionUserId);
  const ownerKey =
    (typeof sessionUserId === "string" ? sessionUserId.trim() : "") || "__local__";

  const { data: savedReceipts = [] } = useAllReceiptsQuery();

  // =========================
  // 2. ESTADO DA LISTA (Zustand)
  // =========================
  const rawShoppingItems = useShoppingListStore(
    (state) => {
      const byUser = state.itemsByUser as unknown;
      if (!byUser || typeof byUser !== "object") return EMPTY_SHOPPING_ITEMS;
      const userItems = (byUser as Record<string, unknown>)[ownerKey];
      return Array.isArray(userItems)
        ? (userItems as ShoppingListItemType[])
        : EMPTY_SHOPPING_ITEMS;
    },
  );

  const shoppingItems = useMemo(
    () => sanitizeShoppingList(rawShoppingItems),
    [rawShoppingItems]
  );

  const addItem = useShoppingListStore((state) => state.addItem);
  const toggleChecked = useShoppingListStore((state) => state.toggleChecked);
  const removeItem = useShoppingListStore((state) => state.removeItem);
  const clearChecked = useShoppingListStore((state) => state.clearChecked);
  const clearAll = useShoppingListStore((state) => state.clearAll);

  // =========================
  // 3. HOOKS DE DOMÍNIO
  // =========================
  
  // Histórico de compras
  const { historyByKey, suggestions } = usePurchaseHistory(savedReceipts);

  // Items ordenados
  const orderedItems = useSortedShoppingItems(shoppingItems);

  // Estado local do formulário
  const [itemName, setItemName] = useState("");
  const [itemQty, setItemQty] = useState("");
  const suggestionListId = useId();

  // =========================
  // 4. CÁLCULOS DERIVADOS
  // =========================
  const checkedCount = shoppingItems.filter((item) => item.checked).length;
  const pendingCount = shoppingItems.length - checkedCount;

  // =========================
  // 5. HANDLERS
  // =========================
  const handleAddItem = (event: FormEvent) => {
    event.preventDefault();
    const result = addItem(sessionUserId, itemName, itemQty);

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

  // Helper para buscar histórico recente
  const getRecentHistory = (item: ShoppingListItemType): PurchaseHistoryEntry[] => {
    const safeKey = toText(item.normalized_key).trim();
    if (!safeKey) return [];

    const exact = historyByKey.get(safeKey);
    if (exact && exact.length > 0) return exact.slice(0, 3);

    const fallback: PurchaseHistoryEntry[] = [];
    for (const [key, entries] of historyByKey.entries()) {
      if (key.includes(safeKey) || safeKey.includes(key)) {
        fallback.push(...entries.slice(0, 2));
      }
    }
    fallback.sort((a, b) => b.timestamp - a.timestamp);
    return fallback.slice(0, 3);
  };

  // =========================
  // 6. RENDER
  // =========================
  return (
    <div>
      {/* Header */}
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
            onClick={() => clearChecked(sessionUserId)}
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
            onClick={() => clearAll(sessionUserId)}
            disabled={shoppingItems.length === 0}
          >
            <Trash2 size={16} />
          </button>
        </div>
      </div>

      {/* Formulário de Adição */}
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

      {/* Lista de Items */}
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
          orderedItems.map((item) => (
            <ShoppingListItem
              key={item.id}
              item={item}
              history={getRecentHistory(item)}
              onToggle={() => toggleChecked(sessionUserId, item.id)}
              onRemove={() => removeItem(sessionUserId, item.id)}
            />
          ))
        )}
      </div>
    </div>
  );
}

export default ShoppingListTab;
