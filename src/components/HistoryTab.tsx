import { useState, /* useCallback, */ /* useEffect, */ useMemo, /* useRef, */ type ChangeEvent } from "react";
import {
  History,
  Download,
  Upload,
  Save,
} from "lucide-react";
import { exportToCSV, backupToJSON } from "../utils/backupRegistry";
import { toast } from "react-hot-toast";
// react-window removido temporariamente - paginação infinita já otimiza performance
import UniversalSearchBar from "./UniversalSearchBar";
import ConfirmDialog from "./ConfirmDialog";
// import { restoreReceiptsToDB } from "../services/dbMethods";
import { parseBRL, formatBRL } from "../utils/currency";
import { parseToDate } from "../utils/date";
import { startOfMonth, endOfMonth, subMonths, isWithinInterval } from "date-fns";
import { calculateReceiptTotal, calculateTotalSpent } from "../utils/analytics";

import { ReceiptCard } from "./ReceiptCard";
import type { HistoryFilters } from "../types/ui";
import type { ConfirmDialogConfig } from "../types/ui";
import type { Receipt /*, ReceiptItem */ } from "../types/domain";
import { useUiStore } from "../stores/useUiStore";
import {
  useAllReceiptsQuery,
  useDeleteReceipt,
  useRestoreReceipts
} from "../hooks/queries/useReceiptsQuery";

// Moved to module scope: utiliza utilitário centralizado
const parseDate = (d: string | Date) => parseToDate(d);

import { ReceiptSkeleton } from "./Skeleton";

function HistoryTab() {
  // React Query para dados de receipts
  const { data: savedReceipts = [], isLoading: loading, refetch: refetchReceipts } = useAllReceiptsQuery();
  const deleteReceiptMutation = useDeleteReceipt();
  const restoreReceiptsMutation = useRestoreReceipts();

  const historyFilter = useUiStore((state) => state.historyFilter);
  const setHistoryFilter = useUiStore((state) => state.setHistoryFilter);
  const historyFilters = useUiStore((state) => state.historyFilters);
  const setHistoryFilters = useUiStore((state) => state.setHistoryFilters);
  const expandedReceipts = useUiStore((state) => state.expandedReceipts);
  const setExpandedReceipts = useUiStore((state) => state.setExpandedReceipts);
  const showSkeleton = loading && savedReceipts.length === 0;
  const [confirmDialog, setConfirmDialog] = useState<ConfirmDialogConfig | null>(null);
  const [confirmBusy, setConfirmBusy] = useState(false);

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

  const filteredReceipts = useMemo(() => {
    return historyFilter.trim()
      ? savedReceipts.filter((receipt: Receipt) =>
        receipt.establishment
          ?.toLowerCase()
          .includes(historyFilter.toLowerCase()),
      )
      : savedReceipts;
  }, [savedReceipts, historyFilter]);

  // Apply advanced filters - memoized
  const finalFilteredReceipts = useMemo(() => {
    let filtered = [...filteredReceipts];

    // Filter by period
    if (historyFilters.period !== "all") {
      const now = new Date();
      const thisMonth = { start: startOfMonth(now), end: endOfMonth(now) };
      const last3Months = startOfMonth(subMonths(now, 3));

      filtered = filtered.filter((receipt: Receipt) => {
        const receiptDate = parseToDate(receipt.date);
        if (!receiptDate) return false;

        if (historyFilters.period === "this-month") {
          return isWithinInterval(receiptDate, thisMonth);
        } else if (historyFilters.period === "last-3-months") {
          return receiptDate >= last3Months;
        } else if (
          historyFilters.period === "custom" &&
          historyFilters.startDate &&
          historyFilters.endDate
        ) {
          const start = new Date(historyFilters.startDate + "T00:00:00");
          const end = new Date(historyFilters.endDate + "T23:59:59");
          return isWithinInterval(receiptDate, { start, end });
        }

        return true;
      });
    }

    // Sort
    filtered.sort((a, b) => {
      if (historyFilters.sortBy === "date") {
        const dateA = parseDate(a.date);
        const dateB = parseDate(b.date);
        const timeA = dateA ? dateA.getTime() : -Infinity;
        const timeB = dateB ? dateB.getTime() : -Infinity;
        return historyFilters.sortOrder === "asc"
          ? timeA - timeB
          : timeB - timeA;
      }

      if (historyFilters.sortBy === "value") {
        const totalA = calculateReceiptTotal(a, parseBRL);
        const totalB = calculateReceiptTotal(b, parseBRL);
        return historyFilters.sortOrder === "asc"
          ? totalA - totalB
          : totalB - totalA;
      }

      if (historyFilters.sortBy === "store") {
        const storeA = (a.establishment || "").toLowerCase();
        const storeB = (b.establishment || "").toLowerCase();
        return historyFilters.sortOrder === "asc"
          ? storeA.localeCompare(storeB)
          : storeB.localeCompare(storeA);
      }

      return 0;
    });

    return {
      items: filtered.slice(0, 50),
      totalCount: filtered.length
    };
  }, [filteredReceipts, historyFilters]);

  const toggleExpand = (id: string) => {
    setExpandedReceipts((prev) =>
      prev.includes(id) ? prev.filter((x: string) => x !== id) : [...prev, id],
    );
  };

  // Export actions using centralized utility
  const handleExportCSV = () => exportToCSV(finalFilteredReceipts.items);
  const handleBackupJSON = () => backupToJSON(savedReceipts);

  // Restore from JSON function
  const handleRestoreJSON = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];

    if (!file) return;

    // Validate file type
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

        const input = event.target;
        const restoredReceipts = backupData.receipts as Receipt[];

        setConfirmDialog({
          title: "Restaurar backup?",
          message: `Isso vai substituir suas ${savedReceipts.length} notas atuais por ${restoredReceipts.length} notas do backup.`,
          confirmText: "Restaurar",
          danger: true,
          onCancel: () => {
            input.value = "";
          },
          onConfirm: async () => {
            try {
              await restoreReceiptsMutation.mutateAsync(restoredReceipts);
              input.value = "";
            } catch (syncErr) {
              console.warn(
                "Não foi possível sincronizar backup com o Supabase:",
                syncErr,
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

  const requestDeleteReceipt = (id: string) => {
    setConfirmDialog({
      title: "Remover nota?",
      message: "Essa ação remove a nota do histórico e não pode ser desfeita.",
      confirmText: "Remover",
      danger: true,
      onConfirm: async () => {
        await deleteReceiptMutation.mutateAsync(id);
      },
    });
  };

  return (
    <>
      {/* Header with Actions */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
          marginBottom: "1.25rem",
          gap: "1rem",
        }}
      >
        <div style={{ flex: 1 }}>
          <h2 className="section-title" style={{ marginBottom: "0.25rem" }}>
            <History size={20} color="var(--primary)" />
            Histórico
          </h2>
          <div
            style={{ fontSize: "0.75rem", color: "#64748b", marginLeft: "2rem" }}
          >
            {finalFilteredReceipts.totalCount} de {savedReceipts.length} notas
          </div>
        </div>
        <div style={{ display: "flex", gap: "0.5rem" }}>
          <button
            onClick={() => refetchReceipts()}
            className="btn"
            style={{
              padding: "0.5rem",
              background: "rgba(148, 163, 184, 0.1)",
              border: "none",
              color: "#94a3b8",
              borderRadius: "8px",
            }}
            title="Sincronizar"
            disabled={loading}
          >
            <History size={20} className={loading ? "spin" : ""} />
          </button>

          <input
            type="file"
            id="restore-input"
            accept=".json"
            onChange={handleRestoreJSON}
            style={{ display: "none" }}
          />
          <button
            onClick={() => {
              const restoreInput = document.getElementById("restore-input") as HTMLInputElement | null;
              restoreInput?.click();
            }}
            className="btn"
            style={{
              padding: "0.5rem",
              background: "rgba(16, 185, 129, 0.1)",
              border: "none",
              color: "#10b981",
              borderRadius: "8px",
            }}
            title="Restaurar Backup"
          >
            <Upload size={20} />
          </button>

          <button
            onClick={handleBackupJSON}
            className="btn"
            style={{
              padding: "0.5rem",
              background: "rgba(59, 130, 246, 0.1)",
              border: "none",
              color: "var(--primary)",
              borderRadius: "8px",
            }}
            title="Backup"
          >
            <Save size={20} />
          </button>
          <button
            onClick={handleExportCSV}
            className="btn"
            style={{
              padding: "0.5rem",
              background: "rgba(245, 158, 11, 0.1)",
              border: "none",
              color: "#f59e0b",
              borderRadius: "8px",
            }}
            title="CSV"
          >
            <Download size={20} />
          </button>
        </div>
      </div>

      {showSkeleton ? (
        <div className="items-list" style={{ gap: "1.25rem" }}>
          {[...Array(3)].map((_, i) => (
            <ReceiptSkeleton key={i} />
          ))}
        </div>
      ) : savedReceipts.length === 0 ? (
        <div
          className="glass-card"
          style={{ textAlign: "center", padding: "4rem 1rem" }}
        >
          <div style={{ position: "relative", display: "inline-block" }}>
            <History
              size={64}
              color="var(--primary)"
              style={{ opacity: 0.2 }}
            />
            <div
              style={{
                position: "absolute",
                top: "50%",
                left: "50%",
                transform: "translate(-50%, -50%)",
              }}
            >
              <History size={32} color="var(--primary)" />
            </div>
          </div>
          <h2 style={{ marginTop: "1.5rem", color: "#e2e8f0" }}>
            Histórico vazio
          </h2>
          <p
            style={{
              color: "#94a3b8",
              marginTop: "0.5rem",
              maxWidth: "300px",
              margin: "0.5rem auto",
            }}
          >
            Suas notas fiscais escaneadas aparecerão aqui para você acompanhar
            preços e economizar.
          </p>
          <p
            style={{
              color: "var(--primary)",
              fontSize: "0.85rem",
              marginTop: "1.5rem",
              fontWeight: 500,
            }}
          >
            Você também pode restaurar um backup JSON acima.
          </p>
        </div>
      ) : (
        <>
          {/* Summary Card */}
          <div
            className="glass-card"
            style={{
              padding: "1.25rem",
              marginBottom: "1rem",
              background:
                "linear-gradient(135deg, rgba(59, 130, 246, 0.1) 0%, rgba(16, 185, 129, 0.1) 100%)",
              border: "1px solid rgba(59, 130, 246, 0.2)",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <div>
              <p
                style={{
                  color: "#94a3b8",
                  fontSize: "0.85rem",
                  marginBottom: "4px",
                }}
              >
                Total gasto no período
              </p>
              <h3 style={{ color: "#fff", fontSize: "1.8rem", fontWeight: 800 }}>
                R$ {formatBRL(calculateTotalSpent(finalFilteredReceipts.items, parseBRL))}
              </h3>
            </div>
            <div style={{ textAlign: "right" }}>
              <p
                style={{
                  color: "#94a3b8",
                  fontSize: "0.85rem",
                  marginBottom: "4px",
                }}
              >
                Notas Filtradas
              </p>
              <h4
                style={{
                  color: "var(--primary)",
                  fontSize: "1.2rem",
                  fontWeight: 700,
                }}
              >
                {finalFilteredReceipts.totalCount}
              </h4>
            </div>
          </div>

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
            sortOptions={[
              { value: "date", label: "Data" },
              { value: "value", label: "Valor" },
              { value: "store", label: "Mercado" },
            ]}
            extraActions={
              <>
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
                    <option value="all">Todo período</option>
                    <option value="this-month">Este mês</option>
                    <option value="last-3-months">Últimos 3 meses</option>
                    <option value="custom">Personalizado</option>
                  </select>
                </div>
              </>
            }
          >
            {/* Custom period date pickers, se necessário injetar dentro do card */}
          </UniversalSearchBar>

          {/* Date pickers fora do UniversalSearchBar para manter layout limpo */}
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

          <div className="items-list" style={{ gap: "1rem" }}>
            {finalFilteredReceipts.items.length === 0 ? (
              // Mensagem quando filtro não retorna nada
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
            ) : (
              <>
                {finalFilteredReceipts.items.map((receipt: Receipt) => (
                  <ReceiptCard
                    key={receipt.id}
                    receipt={receipt}
                    isExpanded={expandedReceipts.includes(receipt.id)}
                    onToggle={toggleExpand}
                    onDelete={requestDeleteReceipt}
                  />
                ))}
              </>
            )}
          </div>
        </>
      )}
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
    </>
  );
}

export default HistoryTab;

