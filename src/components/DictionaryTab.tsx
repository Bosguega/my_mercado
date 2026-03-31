import { useState, useEffect, useMemo } from "react";
import {
  Book,
  Save,
  X,
  RotateCcw,
} from "lucide-react";
import { CATEGORIES } from "../constants/domain";
import { DictionaryRow } from "./DictionaryRow";
import UniversalSearchBar from "./UniversalSearchBar";
import ConfirmDialog from "./ConfirmDialog";
import {
  getFullDictionaryFromDB,
  updateDictionaryEntryInDB,
  deleteDictionaryEntryFromDB,
  clearDictionaryInDB,
  applyDictionaryEntryToSavedItems,
} from "../services";
import { Skeleton } from "./Skeleton";
import { toast } from "react-hot-toast";
import { filterBySearch, sortItems } from "../utils/analytics";
import type { SortDirection, ConfirmDialogConfig } from "../types/ui";
import type { DictionaryEntry /*, Receipt, ReceiptItem */ } from "../types/domain";
import { useAllReceiptsQuery } from "../hooks/queries/useReceiptsQuery";
import { useCanonicalProductsQuery } from "../hooks/queries/useCanonicalProductsQuery";



function DictionaryTab() {
  // React Query para dados de receipts
  const { data: _savedReceipts = [], refetch: refetchReceipts } = useAllReceiptsQuery();
  const { data: products = [] } = useCanonicalProductsQuery();
  const [dictionary, setDictionary] = useState<DictionaryEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [sortBy, setSortBy] = useState("recent");
  const [sortDirection, setSortDirection] = useState<SortDirection>("desc");
  const [editingKey, setEditingKey] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({ normalized_name: "", category: "", canonical_product_id: "" });
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

  const applyChangesToSavedReceipts = async (
    key: string,
    normalizedName: string,
    category: string,
  ) => {
    const toastId = toast.loading("Atualizando notas salvas...");
    try {
      const { updatedCount } = await applyDictionaryEntryToSavedItems(
        key,
        normalizedName,
        category,
      );

      // Atualizar cache do React Query
      refetchReceipts();

      if (!updatedCount) {
        toast.success("Nenhum item salvo precisou ser atualizado.", { id: toastId });
      } else {
        toast.success(`Atualizado em ${updatedCount} item(ns) nas notas salvas.`, { id: toastId });
      }
    } catch (err) {
      console.error("Erro ao aplicar correção nas notas:", err);
      toast.error("Erro ao atualizar notas salvas.", { id: toastId });
    }
  };

  const loadDictionary = async () => {
    setLoading(true);
    try {
      const data = await getFullDictionaryFromDB();
      setDictionary(data);
    } catch (err) {
      console.error("Erro ao carregar dicionário:", err);
      toast.error("Erro ao carregar dicionário.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDictionary();
  }, []);

  const handleStartEdit = (item: DictionaryEntry) => {
    setEditingKey(item.key);
    setEditForm({
      normalized_name: item.normalized_name || "",
      category: item.category || "Outros",
      canonical_product_id: item.canonical_product_id || ""
    });
  };

  const handleSaveEdit = async (key: string) => {
    try {
      const previous = dictionary.find((item) => item.key === key);
      const previousNormalizedName = (previous?.normalized_name ?? "").trim();
      const previousCategory = (previous?.category ?? "Outros").trim();

      const nextNormalizedName = (editForm.normalized_name ?? "").trim();
      const nextCategory = (editForm.category ?? "Outros").trim();
      const nextCanonicalId = editForm.canonical_product_id || null;

      const shouldOfferApplyToSaved =
        previousNormalizedName !== nextNormalizedName ||
        previousCategory !== nextCategory ||
        (previous?.canonical_product_id ?? null) !== nextCanonicalId;

      await updateDictionaryEntryInDB(key, nextNormalizedName, nextCategory, nextCanonicalId);
      setDictionary(prev => prev.map(item =>
        item.key === key ? { 
          ...item, 
          normalized_name: nextNormalizedName, 
          category: nextCategory,
          canonical_product_id: nextCanonicalId ?? undefined
        } : item
      ));
      setEditingKey(null);
      toast.success("Item atualizado!");

      if (shouldOfferApplyToSaved) {
        toast((t) => (
          <div
            className="glass-card"
            style={{
              margin: 0,
              padding: "1rem",
              width: "100%",
              maxWidth: "520px",
              display: "flex",
              gap: "0.75rem",
              alignItems: "center",
            }}
          >
            <div style={{ flex: 1 }}>
              <div style={{ color: "#fff", fontWeight: 700, marginBottom: "0.25rem" }}>
                Corrigir notas já salvas?
              </div>
              <div style={{ color: "#94a3b8", fontSize: "0.85rem", lineHeight: 1.35 }}>
                Aplica este nome/categoria em todos os itens salvos com a chave <strong style={{ color: "#e2e8f0" }}>{key}</strong>.
              </div>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
              <button
                className="btn btn-success"
                style={{ padding: "0.5rem 0.9rem", borderRadius: "0.9rem", fontSize: "0.9rem" }}
                onClick={async () => {
                  toast.dismiss(t.id);
                  await applyChangesToSavedReceipts(key, nextNormalizedName, nextCategory);
                }}
              >
                Corrigir
              </button>
              <button
                className="btn"
                style={{
                  padding: "0.5rem 0.9rem",
                  borderRadius: "0.9rem",
                  fontSize: "0.9rem",
                  background: "rgba(255,255,255,0.06)",
                  boxShadow: "none",
                }}
                onClick={() => toast.dismiss(t.id)}
              >
                Agora não
              </button>
            </div>
          </div>
        ), { duration: 10000 });
      }
    } catch (err) {
      console.error("Erro ao atualizar item:", err);
      toast.error("Erro ao salvar alterações.");
    }
  };

  const handleDeleteEntry = async (key: string) => {
    setConfirmDialog({
      title: "Remover item?",
      message: "Essa ação remove o item do dicionário.",
      confirmText: "Remover",
      danger: true,
      onConfirm: async () => {
        try {
          await deleteDictionaryEntryFromDB(key);
          setDictionary(prev => prev.filter(item => item.key !== key));
          toast.success("Item removido!");
        } catch (err) {
          console.error("Erro ao remover item:", err);
          toast.error("Erro ao remover item.");
        }
      },
    });
  };

  const handleClearDictionary = async () => {
    setConfirmDialog({
      title: "Limpar dicionário?",
      message: "Isso apagará todo o dicionário de produtos e a IA precisará reaprender.",
      confirmText: "Limpar tudo",
      danger: true,
      onConfirm: async () => {
        try {
          await clearDictionaryInDB();
          setDictionary([]);
          toast.success("Dicionário limpo com sucesso!");
        } catch (err) {
          console.error("Erro ao limpar dicionário:", err);
          toast.error("Erro ao limpar dicionário.");
        }
      },
    });
  };

  const filteredDictionary = useMemo(() => {
    const baseItems = filterBySearch(dictionary, searchQuery, ["key", "normalized_name"]);
    return baseItems.filter((item) => selectedCategory === "all" || item.category === selectedCategory);
  }, [dictionary, searchQuery, selectedCategory]);

  const sortedDictionary = useMemo(() => {
    const customSorters = {
      recent: (a: DictionaryEntry, b: DictionaryEntry) => {
        const dateA = new Date(a.created_at || 0);
        const dateB = new Date(b.created_at || 0);
        return dateA.getTime() - dateB.getTime();
      },
      alpha: (a: DictionaryEntry, b: DictionaryEntry) => {
        const nameA = (a.normalized_name || a.key).toLowerCase();
        const nameB = (b.normalized_name || b.key).toLowerCase();
        return nameA.localeCompare(nameB);
      }
    };

    const sorted = sortItems(filteredDictionary, sortBy, sortDirection, customSorters);

    return {
      items: sorted.slice(0, 100),
      totalCount: sorted.length
    };
  }, [filteredDictionary, sortBy, sortDirection]);

  return (
    <>
      <div className="dictionary-tab">
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: "1.25rem",
          }}
        >
          <h2 className="section-title" style={{ marginBottom: "0" }}>
            <Book color="var(--primary)" size={20} />
            Dicionário
          </h2>
          <button
            className="btn"
            onClick={handleClearDictionary}
            style={{
              background: "rgba(239, 68, 68, 0.1)",
              border: "none",
              color: "#f87171",
              padding: "0.5rem",
              borderRadius: "8px",
            }}
            title="Limpar Dicionário"
          >
            <RotateCcw size={20} />
          </button>
        </div>

        <UniversalSearchBar
          placeholder="Pesquisar no dicionário..."
          value={searchQuery}
          onChange={setSearchQuery}
          sortValue={sortBy}
          onSortChange={setSortBy}
          sortOrder={sortDirection}
          onSortOrderChange={setSortDirection}
          sortOptions={[
            { value: "recent", label: "RECENTE" },
            { value: "alpha", label: "A-Z" }
          ]}
          extraActions={
            <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                <span style={{ fontSize: "0.8rem", color: "#64748b", fontWeight: 500 }}>
                  CATEGORIA:
                </span>
                <select
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value)}
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
                  <option value="all">TODAS</option>
                  {CATEGORIES.map(cat => (
                    <option key={cat} value={cat}>{cat.toUpperCase()}</option>
                  ))}
                </select>
              </div>
              <div style={{ fontSize: "0.75rem", color: "#64748b" }}>
                {sortedDictionary.totalCount > 100 ? "Exibindo 100+" : `${sortedDictionary.totalCount} itens`}
              </div>
            </div>
          }
        />

        <div className="items-list" style={{ gap: "1rem" }}>
          {loading ? (
            <div style={{ textAlign: "center", padding: "3rem" }}>
              <Skeleton width="100%" height="80px" style={{ marginBottom: "1rem" }} />
              <Skeleton width="100%" height="80px" />
            </div>
          ) : sortedDictionary.items.length === 0 ? (
            <div className="glass-card" style={{ textAlign: "center", padding: "3rem" }}>
              <p style={{ color: "#64748b" }}>Nenhum item encontrado no dicionário.</p>
            </div>
          ) : (
            <>
              {sortedDictionary.items.map((item) => (
                <div key={item.key}>
                  {editingKey === item.key ? (
                    <div className="glass-card animated-item" style={{ marginBottom: 0, padding: "1rem" }}>
                      <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
                        <div style={{ fontSize: "0.75rem", color: "#64748b", fontWeight: "bold" }}>CHAVE: {item.key}</div>
                        <input
                          type="text"
                          className="search-input"
                          style={{ background: "var(--bg-color)" }}
                          value={editForm.normalized_name}
                          onChange={(e) => setEditForm({ ...editForm, normalized_name: e.target.value })}
                          placeholder="Nome normalizado"
                        />
                        <select
                          className="search-input"
                          style={{ background: "var(--bg-color)" }}
                          value={editForm.category}
                          onChange={(e) => setEditForm({ ...editForm, category: e.target.value })}
                        >
                          {CATEGORIES.map(cat => (
                            <option key={cat} value={cat}>{cat}</option>
                          ))}
                        </select>
                        <select
                          className="search-input"
                          style={{ background: "var(--bg-color)" }}
                          value={editForm.canonical_product_id}
                          onChange={(e) => setEditForm({ ...editForm, canonical_product_id: e.target.value })}
                        >
                          <option value="">Não vinculado a Produto Canônico</option>
                          {products.map(p => (
                            <option key={p.id} value={p.id}>{p.name} ({p.brand || "Sem marca"})</option>
                          ))}
                        </select>
                        <div style={{ display: "flex", gap: "0.5rem" }}>
                          <button className="btn btn-success" style={{ flex: 1 }} onClick={() => handleSaveEdit(item.key)}>
                            <Save size={18} /> Salvar
                          </button>
                          <button className="btn" style={{ flex: 1 }} onClick={() => setEditingKey(null)}>
                            <X size={18} /> Cancelar
                          </button>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <DictionaryRow
                      item={item}
                      onEdit={handleStartEdit}
                      onDelete={handleDeleteEntry}
                      products={products}
                    />
                  )}
                </div>
              ))}
            </>
          )}
        </div>
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
    </>
  );
}

export default DictionaryTab;

