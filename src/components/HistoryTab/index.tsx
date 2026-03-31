import { useMemo, useState, useCallback, type ChangeEvent } from "react";
import { toast } from "react-hot-toast";
import { formatBRL, parseBRL } from "../../utils/currency";
import { parseToDate } from "../../utils/date";
import { calculateTotalSpent, calculateReceiptTotal } from "../../utils/analytics";
import { backupToJSON, exportToCSV } from "../../utils/backupRegistry";
import { startOfMonth, endOfMonth, subMonths, isWithinInterval } from "date-fns";
import { useAllReceiptsQuery, useDeleteReceipt, useRestoreReceipts } from "../../hooks/queries/useReceiptsQuery";
import { useUiStore } from "../../stores/useUiStore";
import ConfirmDialog from "../ConfirmDialog";
import UniversalSearchBar from "../UniversalSearchBar";
import { HeaderSection } from "./HeaderSection";
import { SummaryCard } from "./SummaryCard";
import { EmptyState } from "./EmptyState";
import { ReceiptList } from "./ReceiptList";
import type { Receipt } from "../../types/domain";
import type { HistoryFilters } from "../../types/ui";

// =========================
// UTILITÁRIOS
// =========================

function filterBySearch(receipts: Receipt[], search: string): Receipt[] {
  if (!search.trim()) return receipts;
  const searchLower = search.toLowerCase();
  return receipts.filter((receipt) =>
    receipt.establishment?.toLowerCase().includes(searchLower)
  );
}

function filterByPeriod(
  receipts: Receipt[],
  period: HistoryFilters["period"],
  startDate?: string,
  endDate?: string
): Receipt[] {
  if (period === "all") return receipts;

  const now = new Date();
  const thisMonth = { start: startOfMonth(now), end: endOfMonth(now) };
  const last3Months = startOfMonth(subMonths(now, 3));

  return receipts.filter((receipt) => {
    const receiptDate = parseToDate(receipt.date);
    if (!receiptDate) return false;

    if (period === "this-month") {
      return isWithinInterval(receiptDate, thisMonth);
    }
    if (period === "last-3-months") {
      return receiptDate >= last3Months;
    }
    if (period === "custom" && startDate && endDate) {
      const start = new Date(startDate + "T00:00:00");
      const end = new Date(endDate + "T23:59:59");
      return isWithinInterval(receiptDate, { start, end });
    }
    return true;
  });
}

function sortReceipts(
  receipts: Receipt[],
  sortBy: HistoryFilters["sortBy"],
  sortOrder: HistoryFilters["sortOrder"]
): Receipt[] {
  return [...receipts].sort((a, b) => {
    if (sortBy === "date") {
      const timeA = parseToDate(a.date)?.getTime() || -Infinity;
      const timeB = parseToDate(b.date)?.getTime() || -Infinity;
      return sortOrder === "asc" ? timeA - timeB : timeB - timeA;
    }
    if (sortBy === "value") {
      const totalA = calculateReceiptTotal(a, parseBRL);
      const totalB = calculateReceiptTotal(b, parseBRL);
      return sortOrder === "asc" ? totalA - totalB : totalB - totalA;
    }
    if (sortBy === "store") {
      const storeA = (a.establishment || "").toLowerCase();
      const storeB = (b.establishment || "").toLowerCase();
      return sortOrder === "asc" ? storeA.localeCompare(storeB) : storeB.localeCompare(storeA);
    }
    return 0;
  });
}

function applyFilters(
  receipts: Receipt[],
  search: string,
  filters: HistoryFilters
) {
  let filtered = filterBySearch(receipts, search);
  filtered = filterByPeriod(filtered, filters.period, filters.startDate, filters.endDate);
  filtered = sortReceipts(filtered, filters.sortBy, filters.sortOrder);
  return {
    items: filtered.slice(0, 50),
    totalCount: filtered.length,
  };
}

// =========================
// HOOK: USE CONFIRM DIALOG
// =========================

function useConfirmDialog() {
  const [dialog, setDialog] = useState<{
    title: string;
    message: string;
    confirmText?: string;
    cancelText?: string;
    danger?: boolean;
    onConfirm: () => Promise<void>;
    onCancel?: () => void;
  } | null>(null);
  const [busy, setBusy] = useState(false);

  const open = useCallback((newDialog: typeof dialog) => {
    setDialog(newDialog);
  }, []);

  const close = useCallback(() => {
    dialog?.onCancel?.();
    setDialog(null);
    setBusy(false);
  }, [dialog]);

  const run = useCallback(async () => {
    if (!dialog) return;
    setBusy(true);
    try {
      await dialog.onConfirm();
      setDialog(null);
    } finally {
      setBusy(false);
    }
  }, [dialog]);

  return { dialog, isOpen: !!dialog, busy, open, close, run };
}

// =========================
// CONSTANTES
// =========================

const SORT_OPTIONS = [
  { value: "date", label: "Data" },
  { value: "value", label: "Valor" },
  { value: "store", label: "Mercado" },
];

const PERIOD_OPTIONS = [
  { value: "all", label: "Todo período" },
  { value: "this-month", label: "Este mês" },
  { value: "last-3-months", label: "Últimos 3 meses" },
  { value: "custom", label: "Personalizado" },
];

function HistoryTab() {
  // React Query para dados de receipts
  const { data: savedReceipts = [], isLoading: loading, refetch: refetchReceipts } = useAllReceiptsQuery();
  const deleteReceiptMutation = useDeleteReceipt();
  const restoreReceiptsMutation = useRestoreReceipts();

  // Estados do diálogo de confirmação
  const { dialog, isOpen, busy, open, close, run } = useConfirmDialog();

  // Store de UI
  const historyFilter = useUiStore((state) => state.historyFilter);
  const setHistoryFilter = useUiStore((state) => state.setHistoryFilter);
  const historyFilters = useUiStore((state) => state.historyFilters);
  const setHistoryFilters = useUiStore((state) => state.setHistoryFilters);
  const expandedReceipts = useUiStore((state) => state.expandedReceipts);
  const setExpandedReceipts = useUiStore((state) => state.setExpandedReceipts);

  // Aplicar filtros
  const filteredReceipts = useMemo(
    () => applyFilters(savedReceipts, historyFilter, historyFilters),
    [savedReceipts, historyFilter, historyFilters]
  );

  // Calcular total gasto
  const totalSpent = useMemo(
    () => calculateTotalSpent(filteredReceipts.items, parseBRL),
    [filteredReceipts.items]
  );

  // Handlers de backup
  const handleBackupJSON = () => backupToJSON(savedReceipts);
  const handleExportCSV = () => exportToCSV(filteredReceipts.items);

  const handleRestoreJSON = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];

    if (!file) return;

    if (!file.name.endsWith(".json")) {
      toast.error("Arquivo inválido! Selecione um arquivo .json");
      return;
    }

    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const resultText = e.target?.result;
        if (typeof resultText !== "string") {
          throw new Error("Conteúdo de backup inválido");
        }

        const backupData = JSON.parse(resultText);

        if (!backupData.receipts || !Array.isArray(backupData.receipts)) {
          toast.error("Arquivo de backup inválido ou corrompido");
          return;
        }

        const restoredReceipts = backupData.receipts as Receipt[];

        open({
          title: "Restaurar backup?",
          message: `Isso vai substituir suas ${savedReceipts.length} notas atuais por ${restoredReceipts.length} notas do backup.`,
          confirmText: "Restaurar",
          danger: true,
          onCancel: () => {
            event.target.value = "";
          },
          onConfirm: async () => {
            try {
              await restoreReceiptsMutation.mutateAsync(restoredReceipts);
              event.target.value = "";
            } catch (syncErr) {
              console.warn(
                "Não foi possível sincronizar backup com o Supabase:",
                syncErr
              );
            }
          },
        });
      } catch (error) {
        console.error("Error restoring backup:", error);
        toast.error("Erro ao ler arquivo de backup");
      }
    };
    reader.onerror = () => {
      toast.error("Erro ao ler arquivo");
    };

    reader.readAsText(file);
  };

  const handleDeleteReceipt = (id: string) => {
    open({
      title: "Remover nota?",
      message: "Essa ação remove a nota do histórico e não pode ser desfeita.",
      confirmText: "Remover",
      danger: true,
      onConfirm: async () => {
        await deleteReceiptMutation.mutateAsync(id);
      },
    });
  };

  const handleToggleExpand = (id: string) => {
    setExpandedReceipts((prev) =>
      prev.includes(id) ? prev.filter((x: string) => x !== id) : [...prev, id]
    );
  };

  const isEmpty = savedReceipts.length === 0;
  const hasNoResults = filteredReceipts.items.length === 0 && !isEmpty && !loading;

  return (
    <>
      <HeaderSection
        totalCount={savedReceipts.length}
        filteredCount={filteredReceipts.totalCount}
        isLoading={loading}
        onRefresh={refetchReceipts}
        onBackup={handleBackupJSON}
        onRestore={handleRestoreJSON}
        onExportCSV={handleExportCSV}
      />

      {isEmpty && !loading ? (
        <EmptyState onRestore={() => document.getElementById("restore-input")?.click()} />
      ) : (
        <>
          <SummaryCard totalSpent={totalSpent} filteredCount={filteredReceipts.totalCount} />

          <UniversalSearchBar
            placeholder="Buscar por mercado..."
            value={historyFilter}
            onChange={setHistoryFilter}
            sortValue={historyFilters.sortBy}
            onSortChange={(val) =>
              setHistoryFilters({
                ...historyFilters,
                sortBy: val as HistoryFilters["sortBy"],
              })
            }
            sortOrder={historyFilters.sortOrder}
            onSortOrderChange={(val) =>
              setHistoryFilters({ ...historyFilters, sortOrder: val })
            }
            sortOptions={SORT_OPTIONS}
            extraActions={
              <div
                style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}
              >
                <span
                  style={{
                    fontSize: "0.8rem",
                    color: "#64748b",
                    fontWeight: 500,
                  }}
                >
                  PERÍODO:
                </span>
                <select
                  value={historyFilters.period}
                  onChange={(e) =>
                    setHistoryFilters({
                      ...historyFilters,
                      period: e.target.value as HistoryFilters["period"],
                    })
                  }
                  style={{
                    background: "rgba(59, 130, 246, 0.1)",
                    border: "none",
                    borderRadius: "6px",
                    color: "var(--primary)",
                    fontSize: "0.8rem",
                    fontWeight: 600,
                    padding: "0.25rem 0.5rem",
                    cursor: "pointer",
                    outline: "none",
                  }}
                >
                  {PERIOD_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>
            }
          >
            {/* Custom period date pickers */}
          </UniversalSearchBar>

          {historyFilters.period === "custom" && (
            <div
              className="glass-card"
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: "0.75rem",
                marginBottom: "1rem",
                padding: "1rem",
              }}
            >
              <div>
                <label
                  style={{
                    display: "block",
                    fontSize: "0.7rem",
                    color: "#64748b",
                    marginBottom: "0.5rem",
                    fontWeight: 600,
                    textTransform: "uppercase",
                  }}
                >
                  Início
                </label>
                <input
                  type="date"
                  className="search-input"
                  value={historyFilters.startDate || ""}
                  onChange={(e) =>
                    setHistoryFilters({
                      ...historyFilters,
                      startDate: e.target.value,
                    })
                  }
                  style={{
                    background: "rgba(255,255,255,0.05)",
                    fontSize: "0.85rem",
                    height: "40px",
                  }}
                />
              </div>
              <div>
                <label
                  style={{
                    display: "block",
                    fontSize: "0.7rem",
                    color: "#64748b",
                    marginBottom: "0.5rem",
                    fontWeight: 600,
                    textTransform: "uppercase",
                  }}
                >
                  Fim
                </label>
                <input
                  type="date"
                  className="search-input"
                  value={historyFilters.endDate || ""}
                  onChange={(e) =>
                    setHistoryFilters({
                      ...historyFilters,
                      endDate: e.target.value,
                    })
                  }
                  style={{
                    background: "rgba(255,255,255,0.05)",
                    fontSize: "0.85rem",
                    height: "40px",
                  }}
                />
              </div>
            </div>
          )}

          <ReceiptList
            receipts={filteredReceipts.items}
            expandedReceipts={expandedReceipts}
            isLoading={loading && savedReceipts.length === 0}
            onToggleExpand={handleToggleExpand}
            onDelete={handleDeleteReceipt}
            isEmpty={isEmpty}
            hasNoResults={hasNoResults}
          />
        </>
      )}

      <ConfirmDialog
        isOpen={isOpen}
        title={dialog?.title || ""}
        message={dialog?.message || ""}
        confirmText={dialog?.confirmText}
        cancelText={dialog?.cancelText}
        danger={dialog?.danger}
        busy={busy}
        onCancel={close}
        onConfirm={run}
      />
    </>
  );
}

export default HistoryTab;
