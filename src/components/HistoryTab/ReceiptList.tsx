import { ReceiptCard } from "../ReceiptCard";
import { ReceiptSkeleton } from "../Skeleton";
import type { ReceiptListProps } from "./HistoryTab.types";

export function ReceiptList({
  receipts,
  expandedReceipts,
  isLoading,
  onToggleExpand,
  onDelete,
  isEmpty,
  hasNoResults,
}: ReceiptListProps) {
  if (isLoading) {
    return (
      <div className="items-list" style={{ gap: "1.25rem" }}>
        {[...Array(3)].map((_, i) => (
          <ReceiptSkeleton key={i} />
        ))}
      </div>
    );
  }

  if (isEmpty) {
    return null; // EmptyState é renderizado separadamente
  }

  if (hasNoResults) {
    return (
      <div
        className="glass-card"
        style={{ textAlign: "center", padding: "3rem 1rem" }}
      >
        <h3 style={{ color: "#e2e8f0", marginTop: "1rem" }}>
          Nenhuma nota encontrada
        </h3>
        <p style={{ color: "#94a3b8", marginTop: "0.5rem" }}>
          Tente buscar por outro termo ou mercado.
        </p>
      </div>
    );
  }

  return (
    <div className="items-list" style={{ gap: "1rem" }}>
      {receipts.map((receipt) => (
        <ReceiptCard
          key={receipt.id}
          receipt={receipt}
          isExpanded={expandedReceipts.includes(receipt.id)}
          onToggle={onToggleExpand}
          onDelete={onDelete}
        />
      ))}
    </div>
  );
}
