import { useId, useMemo, useState, type FormEvent } from "react";
import {
  CheckCircle2,
  Circle,
  Eraser,
  ListChecks,
  Plus,
  ReceiptText,
  Trash2,
} from "lucide-react";
import { toast } from "react-hot-toast";
import { useAllReceiptsQuery } from "../hooks/queries/useReceiptsQuery";
import { useReceiptsStore } from "../stores/useReceiptsStore";
import { useShoppingListStore } from "../stores/useShoppingListStore";
import { formatBRL, parseBRL } from "../utils/currency";
import { formatToBR, parseToDate } from "../utils/date";
import { normalizeKey } from "../utils/normalize";
import type { Receipt, ReceiptItem } from "../types/domain";
import type { ShoppingListItem } from "../types/ui";

type PurchaseHistoryEntry = {
  key: string;
  name: string;
  store: string;
  date: string;
  timestamp: number;
  unitPrice: number;
  quantity: number;
  total: number;
};

const EMPTY_SHOPPING_ITEMS: ShoppingListItem[] = [];

function toNumber(value: string | number | null | undefined, fallback = 0): number {
  const parsed = parseBRL(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function toText(value: unknown): string {
  if (typeof value === "string") return value;
  if (value === null || value === undefined) return "";
  return String(value);
}

function sanitizeListItem(item: unknown): ShoppingListItem | null {
  if (!item || typeof item !== "object") return null;
  const raw = item as Partial<ShoppingListItem>;

  const name = toText(raw.name).trim();
  if (!name) return null;

  const normalizedKey =
    toText(raw.normalized_key).trim() || normalizeKey(name);

  return {
    ...(raw as ShoppingListItem),
    id: toText(raw.id) || `${Date.now()}_${Math.random().toString(16).slice(2)}`,
    name,
    normalized_key: normalizedKey,
    quantity: raw.quantity ? toText(raw.quantity).trim() : undefined,
    checked: Boolean(raw.checked),
    created_at: toText(raw.created_at) || new Date().toISOString(),
    checked_at: raw.checked_at ? toText(raw.checked_at) : undefined,
  };
}

function ShoppingListTab() {
  const sessionUserId = useReceiptsStore((state) => state.sessionUserId);
  const ownerKey =
    (typeof sessionUserId === "string" ? sessionUserId.trim() : "") || "__local__";

  const rawShoppingItems = useShoppingListStore(
    (state) => {
      const byUser = state.itemsByUser as unknown;
      if (!byUser || typeof byUser !== "object") return EMPTY_SHOPPING_ITEMS;
      const userItems = (byUser as Record<string, unknown>)[ownerKey];
      return Array.isArray(userItems)
        ? (userItems as ShoppingListItem[])
        : EMPTY_SHOPPING_ITEMS;
    },
  );
  const shoppingItems = useMemo(
    () =>
      rawShoppingItems
        .map((entry) => sanitizeListItem(entry))
        .filter((entry): entry is ShoppingListItem => Boolean(entry)),
    [rawShoppingItems],
  );
  const addItem = useShoppingListStore((state) => state.addItem);
  const toggleChecked = useShoppingListStore((state) => state.toggleChecked);
  const removeItem = useShoppingListStore((state) => state.removeItem);
  const clearChecked = useShoppingListStore((state) => state.clearChecked);
  const clearAll = useShoppingListStore((state) => state.clearAll);

  const { data: savedReceipts = [] } = useAllReceiptsQuery();

  const [itemName, setItemName] = useState("");
  const [itemQty, setItemQty] = useState("");
  const suggestionListId = useId();

  const { historyByKey, suggestions } = useMemo(() => {
    const map = new Map<string, PurchaseHistoryEntry[]>();
    const labels = new Map<string, { label: string; count: number }>();
    try {
      const safeReceipts = Array.isArray(savedReceipts)
        ? (savedReceipts as Receipt[])
        : [];

      for (const receipt of safeReceipts) {
        const date = toText(receipt?.date);
        const timestamp = parseToDate(date)?.getTime() ?? 0;
        const store = toText(receipt?.establishment).trim() || "Mercado";
        const receiptItems = Array.isArray(receipt?.items)
          ? receipt.items
          : [];

        for (const item of receiptItems) {
          const current = item as ReceiptItem;
          const name = toText(current.normalized_name || current.name).trim();
          const key = toText(
            current.normalized_key || normalizeKey(name || toText(current.name)),
          ).trim();
          if (!key) continue;

          const quantity = toNumber(current.qty ?? current.quantity, 1);
          const unitPrice = toNumber(current.unitPrice ?? current.price, 0);
          const total = toNumber(current.total, unitPrice * (quantity || 1));

          const list = map.get(key) || [];
          list.push({
            key,
            name: name || toText(current.name) || "Item",
            store,
            date,
            timestamp,
            unitPrice,
            quantity: quantity || 1,
            total,
          });
          map.set(key, list);

          if (name) {
            const prev = labels.get(key);
            if (prev) {
              prev.count += 1;
            } else {
              labels.set(key, { label: name, count: 1 });
            }
          }
        }
      }

      for (const [, entries] of map) {
        entries.sort((a, b) => b.timestamp - a.timestamp);
      }

      const suggestionItems = Array.from(labels.entries())
        .map(([key, value]) => ({
          key,
          label: value.label,
          count: value.count,
        }))
        .sort((a, b) => b.count - a.count || a.label.localeCompare(b.label))
        .slice(0, 40);

      return { historyByKey: map, suggestions: suggestionItems };
    } catch (err) {
      console.error("Falha ao montar historico de compras para a lista:", err);
      return { historyByKey: new Map<string, PurchaseHistoryEntry[]>(), suggestions: [] };
    }
  }, [savedReceipts]);

  const historyEntries = useMemo(() => Array.from(historyByKey.entries()), [historyByKey]);

  const orderedItems = useMemo(() => {
    return [...shoppingItems].sort((a, b) => {
      if (a.checked !== b.checked) return a.checked ? 1 : -1;
      const timeA = parseToDate(a.created_at)?.getTime() ?? 0;
      const timeB = parseToDate(b.created_at)?.getTime() ?? 0;
      return timeB - timeA;
    });
  }, [shoppingItems]);

  const checkedCount = shoppingItems.filter((item) => item.checked).length;
  const pendingCount = shoppingItems.length - checkedCount;

  const getRecentHistory = (item: ShoppingListItem): PurchaseHistoryEntry[] => {
    const safeKey = toText(item.normalized_key).trim();
    if (!safeKey) return [];

    const exact = historyByKey.get(safeKey);
    if (exact && exact.length > 0) return exact.slice(0, 3);

    const fallback: PurchaseHistoryEntry[] = [];
    for (const [key, entries] of historyEntries) {
      if (key.includes(safeKey) || safeKey.includes(key)) {
        fallback.push(...entries.slice(0, 2));
      }
    }
    fallback.sort((a, b) => b.timestamp - a.timestamp);
    return fallback.slice(0, 3);
  };

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
            const recentHistory = getRecentHistory(item);
            const latest = recentHistory[0];
            const avgPrice =
              recentHistory.length > 0
                ? recentHistory.reduce((acc, entry) => acc + entry.unitPrice, 0) /
                  recentHistory.length
                : 0;

            return (
              <div
                key={item.id}
                className="glass-card animated-item"
                style={{
                  padding: "1rem",
                  marginBottom: 0,
                  border: item.checked
                    ? "1px solid rgba(16, 185, 129, 0.3)"
                    : "1px solid var(--card-border)",
                  opacity: item.checked ? 0.75 : 1,
                }}
              >
                <div style={{ display: "flex", gap: "0.8rem", alignItems: "flex-start" }}>
                  <button
                    onClick={() => toggleChecked(sessionUserId, item.id)}
                    style={{
                      background: "transparent",
                      border: "none",
                      padding: 0,
                      color: item.checked ? "var(--success)" : "#64748b",
                      cursor: "pointer",
                      marginTop: "0.2rem",
                    }}
                    aria-label={item.checked ? "Desmarcar item" : "Marcar item"}
                  >
                    {item.checked ? <CheckCircle2 size={22} /> : <Circle size={22} />}
                  </button>

                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        gap: "0.5rem",
                      }}
                    >
                      <h3
                        style={{
                          color: "#f8fafc",
                          fontSize: "1rem",
                          textDecoration: item.checked ? "line-through" : "none",
                          wordBreak: "break-word",
                        }}
                      >
                        {item.name}
                      </h3>
                      <button
                        onClick={() => removeItem(sessionUserId, item.id)}
                        style={{
                          background: "rgba(239, 68, 68, 0.12)",
                          border: "none",
                          width: "30px",
                          height: "30px",
                          borderRadius: "8px",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          color: "#ef4444",
                          cursor: "pointer",
                          flexShrink: 0,
                        }}
                        title="Remover item"
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>

                    {item.quantity && (
                      <p style={{ color: "#94a3b8", fontSize: "0.8rem", marginTop: "0.15rem" }}>
                        Quantidade: {item.quantity}
                      </p>
                    )}

                    <div
                      style={{
                        marginTop: "0.65rem",
                        padding: "0.7rem",
                        borderRadius: "0.8rem",
                        background: "rgba(15, 23, 42, 0.45)",
                        border: "1px solid rgba(255,255,255,0.06)",
                      }}
                    >
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: "0.4rem",
                          marginBottom: "0.35rem",
                          color: "#94a3b8",
                          fontSize: "0.76rem",
                          fontWeight: 600,
                          textTransform: "uppercase",
                        }}
                      >
                        <ReceiptText size={14} />
                        Ultimas Compras
                      </div>

                      {latest ? (
                        <>
                          <p style={{ color: "#e2e8f0", fontSize: "0.85rem" }}>
                            {formatToBR(latest.date, false)} em {latest.store} por R${" "}
                            {formatBRL(latest.unitPrice)}
                            /un
                          </p>
                          <p style={{ color: "#64748b", fontSize: "0.78rem", marginTop: "0.2rem" }}>
                            Media recente: R$ {formatBRL(avgPrice)} / un
                          </p>

                          <div
                            style={{
                              display: "flex",
                              flexWrap: "wrap",
                              gap: "0.4rem",
                              marginTop: "0.45rem",
                            }}
                          >
                            {recentHistory.map((entry, idx) => (
                              <span
                                key={`${entry.key}_${entry.timestamp}_${idx}`}
                                style={{
                                  fontSize: "0.72rem",
                                  color: "#93c5fd",
                                  border: "1px solid rgba(59,130,246,0.28)",
                                  background: "rgba(59,130,246,0.12)",
                                  borderRadius: "999px",
                                  padding: "0.15rem 0.5rem",
                                }}
                              >
                                {formatToBR(entry.date, false)}: R$ {formatBRL(entry.unitPrice)}
                              </span>
                            ))}
                          </div>
                        </>
                      ) : (
                        <p style={{ color: "#64748b", fontSize: "0.82rem" }}>
                          Ainda sem historico de compra para este item.
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

export default ShoppingListTab;
