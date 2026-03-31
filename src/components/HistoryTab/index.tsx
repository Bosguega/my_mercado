import { useMemo, useState, useCallback, type ChangeEvent } from "react";
import { toast } from "react-hot-toast";
import { parseBRL } from "../../utils/currency";
import { calculateTotalSpent } from "../../utils/analytics";
import { backupToJSON, exportToCSV } from "../../utils/backupRegistry";
import { useDeleteReceipt, useRestoreReceipts } from "../../hooks/queries/useReceiptsQuery";
import { useHistoryReceipts } from "../../hooks/queries/useHistoryReceipts";
import { useUiStore } from "../../stores/useUiStore";
import { PeriodSelector, PeriodDatePickers } from "../PeriodSelector";
import ConfirmDialog from "../ConfirmDialog";
import UniversalSearchBar from "../UniversalSearchBar";
import { HeaderSection } from "./HeaderSection";
import { SummaryCard } from "./SummaryCard";
import { EmptyState } from "./EmptyState";
import { ReceiptList } from "./ReceiptList";
import type { Receipt } from "../../types/domain";
import type { HistoryFilters } from "../../types/ui";

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

function HistoryTab() {
  // Hook unificado para filtros e dados de receipts
  const {
    receipts: savedReceipts,
    items: filteredItems,
    totalCount,
    isLoading: loading,
    filters: historyFilters,
    setFilters: setHistoryFilters,
    searchQuery: historyFilter,
    setSearchQuery: setHistoryFilter,
    refetch: refetchReceipts,
  } = useHistoryReceipts();

  const deleteReceiptMutation = useDeleteReceipt();
  const restoreReceiptsMutation = useRestoreReceipts();

  // Estados do diálogo de confirmação
  const { dialog, isOpen, busy, open, close, run } = useConfirmDialog();

  // Store de UI (apenas expandedReceipts)
  const expandedReceipts = useUiStore((state) => state.expandedReceipts);
  const setExpandedReceipts = useUiStore((state) => state.setExpandedReceipts);

  // Calcular total gasto
  const totalSpent = useMemo(
    () => calculateTotalSpent(filteredItems, parseBRL),
    [filteredItems]
  );

  // Handlers de backup
  const handleBackupJSON = () => backupToJSON(savedReceipts);
  const handleExportCSV = () => exportToCSV(filteredItems);

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
  const hasNoResults = filteredItems.length === 0 && !isEmpty && !loading;

  return (
    <>
      <HeaderSection
        totalCount={savedReceipts.length}
        filteredCount={totalCount}
        isLoading={loading}
        onRefresh={refetchReceipts}
        onBackup={handleBackupJSON}
        onRestore={handleRestoreJSON}
        onExportCSV={handleExportCSV}
      />

      {isEmpty && !loading ? (
        <EmptyState />
      ) : (
        <>
          <SummaryCard totalSpent={totalSpent} filteredCount={totalCount} />

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
              <PeriodSelector
                filters={historyFilters}
                onChange={setHistoryFilters}
                label="PERÍODO:"
              />
            }
          />

          {/* Date Pickers para Período Personalizado */}
          <PeriodDatePickers
            filters={historyFilters}
            onChange={setHistoryFilters}
          />

          <ReceiptList
            receipts={filteredItems}
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
