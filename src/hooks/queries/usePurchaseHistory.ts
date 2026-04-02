import { useMemo } from "react";
import { parseToDate } from "../../utils/date";
import { toText } from "../../utils/shoppingList";
import { normalizeKey } from "../../utils/normalize";
import type { Receipt, ReceiptItem } from "../../types/domain";

export type PurchaseHistoryEntry = {
  key: string;
  name: string;
  store: string;
  date: string;
  timestamp: number;
  unitPrice: number;
  quantity: number;
  total: number;
};

export type PurchaseSuggestion = {
  key: string;
  label: string;
  count: number;
};

interface UsePurchaseHistoryReturn {
  /** Mapa de histórico por chave normalizada */
  historyByKey: Map<string, PurchaseHistoryEntry[]>;
  /** Sugestões de items mais comprados */
  suggestions: PurchaseSuggestion[];
}

/**
 * Hook que monta histórico de compras a partir dos receipts.
 *
 * Responsabilidade:
 * - Extrair items de todos os receipts
 * - Agrupar por chave normalizada
 * - Ordenar por data (mais recente primeiro)
 * - Gerar sugestões baseadas na frequência
 *
 * @param savedReceipts - Lista de receipts
 *
 * @example
 * ```tsx
 * const { historyByKey, suggestions } = usePurchaseHistory(savedReceipts);
 *
 * // Buscar histórico de um item
 * const history = historyByKey.get(normalizedKey);
 *
 * // Sugestões para autocomplete
 * <datalist>
 *   {suggestions.map(s => <option key={s.key} value={s.label} />)}
 * </datalist>
 * ```
 */
export function usePurchaseHistory(savedReceipts: Receipt[]): UsePurchaseHistoryReturn {
  return useMemo(() => {
    const map = new Map<string, PurchaseHistoryEntry[]>();
    const labels = new Map<string, { label: string; count: number; lastTimestamp: number }>();

    try {
      const safeReceipts = Array.isArray(savedReceipts) ? savedReceipts : [];

      for (const receipt of safeReceipts) {
        const date = toText(receipt?.date);
        const timestamp = parseToDate(date)?.getTime() ?? 0;
        const store = toText(receipt?.establishment).trim() || "Mercado";
        const receiptItems = Array.isArray(receipt?.items) ? receipt.items : [];

        for (const item of receiptItems) {
          const current = item as ReceiptItem;
          const name = toText(current.normalized_name || current.name).trim();
          const key = normalizeKey(
            toText(current.normalized_key).trim() || name || toText(current.name),
          );

          if (!key) continue;

          const quantity = current.quantity || 1;
          const unitPrice = current.price || 0;
          const total = current.total ?? unitPrice * quantity;

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
              if (timestamp > prev.lastTimestamp) {
                prev.lastTimestamp = timestamp;
                prev.label = name;
              }
            } else {
              labels.set(key, { label: name, count: 1, lastTimestamp: timestamp });
            }
          }
        }
      }

      // Ordenar histórico por data (mais recente primeiro)
      for (const [, entries] of map) {
        entries.sort((a, b) => b.timestamp - a.timestamp);
      }

      // Gerar sugestões ordenadas por frequência
      const suggestionItems = Array.from(labels.entries())
        .map(([key, value]) => ({
          key,
          label: value.label,
          count: value.count,
          lastTimestamp: value.lastTimestamp,
        }))
        .sort(
          (a, b) =>
            b.count - a.count ||
            b.lastTimestamp - a.lastTimestamp ||
            a.label.localeCompare(b.label),
        )
        .slice(0, 100)
        .map(({ key, label, count }) => ({ key, label, count }));

      return { historyByKey: map, suggestions: suggestionItems };
    } catch (err) {
      console.error("Falha ao montar historico de compras para a lista:", err);
      return { historyByKey: new Map<string, PurchaseHistoryEntry[]>(), suggestions: [] };
    }
  }, [savedReceipts]);
}
