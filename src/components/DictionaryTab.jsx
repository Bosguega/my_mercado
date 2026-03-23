import { useState, useEffect } from "react";
import { 
  Book, 
  Trash2, 
  Edit3, 
  Search, 
  Save, 
  X, 
  RotateCcw
} from "lucide-react";
import { 
  getFullDictionaryFromDB, 
  updateDictionaryEntryInDB, 
  deleteDictionaryEntryFromDB,
  clearDictionaryInDB,
  applyDictionaryEntryToSavedItems,
} from "../services/dbMethods";
import { toast } from "react-hot-toast";
import PropTypes from "prop-types";

const CATEGORIES = [
  "Açougue", "Hortifruti", "Laticínios", "Padaria", 
  "Limpeza", "Higiene", "Bebidas", "Mercearia", "Petshop", "Outros"
];

function DictionaryTab({ setSavedReceipts, loadReceipts }) {
  const [dictionary, setDictionary] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [editingKey, setEditingKey] = useState(null);
  const [editForm, setEditForm] = useState({ normalized_name: "", category: "" });

  const applyChangesToSavedReceipts = async (key, normalizedName, category) => {
    const toastId = toast.loading("Atualizando notas salvas...");
    try {
      const { updatedCount } = await applyDictionaryEntryToSavedItems(
        key,
        normalizedName,
        category,
      );

      if (typeof setSavedReceipts === "function") {
        setSavedReceipts((prev) => {
          const updated = (prev || []).map((receipt) => ({
            ...receipt,
            items: Array.isArray(receipt.items)
              ? receipt.items.map((item) => {
                  const itemKey = item.normalized_key ?? item.normalizedKey;
                  if (itemKey !== key) return item;

                  return {
                    ...item,
                    normalized_name: normalizedName,
                    category,
                  };
                })
              : receipt.items,
          }));

          localStorage.setItem("@MyMercado:receipts", JSON.stringify(updated));
          return updated;
        });
      } else if (typeof loadReceipts === "function") {
        await loadReceipts();
      }

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

  const handleStartEdit = (item) => {
    setEditingKey(item.key);
    setEditForm({ 
      normalized_name: item.normalized_name || "", 
      category: item.category || "Outros" 
    });
  };

  const handleSaveEdit = async (key) => {
    try {
      const previous = dictionary.find((item) => item.key === key);
      const previousNormalizedName = (previous?.normalized_name ?? "").trim();
      const previousCategory = (previous?.category ?? "Outros").trim();

      const nextNormalizedName = (editForm.normalized_name ?? "").trim();
      const nextCategory = (editForm.category ?? "Outros").trim();

      const shouldOfferApplyToSaved =
        previousNormalizedName !== nextNormalizedName ||
        previousCategory !== nextCategory;

      await updateDictionaryEntryInDB(key, nextNormalizedName, nextCategory);
      setDictionary(prev => prev.map(item => 
        item.key === key ? { ...item, normalized_name: nextNormalizedName, category: nextCategory } : item
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

  const handleDeleteEntry = async (key) => {
    if (!window.confirm("Remover este item do dicionário?")) return;
    try {
      await deleteDictionaryEntryFromDB(key);
      setDictionary(prev => prev.filter(item => item.key !== key));
      toast.success("Item removido!");
    } catch (err) {
      console.error("Erro ao remover item:", err);
      toast.error("Erro ao remover item.");
    }
  };

  const handleClearDictionary = async () => {
    if (!window.confirm("⚠️ ATENÇÃO: Isso apagará TODO o dicionário de produtos. A IA terá que reaprender tudo. Deseja continuar?")) return;
    
    try {
      await clearDictionaryInDB();
      setDictionary([]);
      toast.success("Dicionário limpo com sucesso!");
    } catch (err) {
      console.error("Erro ao limpar dicionário:", err);
      toast.error("Erro ao limpar dicionário.");
    }
  };

  const filteredDictionary = dictionary.filter(item => 
    item.key.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (item.normalized_name && item.normalized_name.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  return (
    <div className="dictionary-tab">
      <div className="glass-card" style={{ marginBottom: "1rem", padding: "1.25rem" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
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
              borderRadius: "8px"
            }}
            title="Limpar Dicionário"
          >
            <RotateCcw size={20} />
          </button>
        </div>
        
        <p style={{ color: "#94a3b8", fontSize: "0.85rem", marginBottom: "1.25rem", lineHeight: "1.5" }}>
          Gerencie como a IA normaliza os nomes dos produtos.
        </p>

        <div style={{ position: "relative" }}>
          <Search size={18} style={{ position: "absolute", left: "1rem", top: "50%", transform: "translateY(-50%)", color: "#64748b" }} />
          <input
            type="text"
            placeholder="Pesquisar..."
            className="search-input"
            style={{ paddingLeft: "3rem", height: "48px" }}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      <div className="items-list">
        {loading ? (
          <div style={{ textAlign: "center", padding: "3rem" }}>
            <div className="skeleton-line" style={{ width: "100%", height: "80px", marginBottom: "1rem" }} />
            <div className="skeleton-line" style={{ width: "100%", height: "80px" }} />
          </div>
        ) : filteredDictionary.length === 0 ? (
          <div className="glass-card" style={{ textAlign: "center", padding: "3rem" }}>
            <Search size={48} style={{ opacity: 0.1, marginBottom: "1rem" }} />
            <p style={{ color: "#64748b" }}>Nenhum item encontrado no dicionário.</p>
          </div>
        ) : (
          filteredDictionary.map((item) => (
            <div key={item.key} className="glass-card" style={{ marginBottom: "0.75rem", padding: "1rem" }}>
              {editingKey === item.key ? (
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
                  <div style={{ display: "flex", gap: "0.5rem" }}>
                    <button className="btn btn-success" style={{ flex: 1 }} onClick={() => handleSaveEdit(item.key)}>
                      <Save size={18} /> Salvar
                    </button>
                    <button className="btn" style={{ flex: 1 }} onClick={() => setEditingKey(null)}>
                      <X size={18} /> Cancelar
                    </button>
                  </div>
                </div>
              ) : (
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "4px" }}>
                      <span style={{ color: "#fff", fontWeight: 600 }}>{item.normalized_name || "Sem nome"}</span>
                      <span style={{ fontSize: "0.65rem", background: "rgba(59, 130, 246, 0.1)", padding: "1px 6px", borderRadius: "4px", color: "var(--primary)" }}>
                        {item.category || "Outros"}
                      </span>
                    </div>
                    <div style={{ fontSize: "0.75rem", color: "#64748b", fontStyle: "italic" }}>
                      ID: {item.key}
                    </div>
                  </div>
                  <div style={{ display: "flex", gap: "8px" }}>
                    <button 
                      onClick={() => handleStartEdit(item)}
                      style={{ background: "rgba(59, 130, 246, 0.1)", border: "none", borderRadius: "8px", width: "36px", height: "36px", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--primary)" }}
                    >
                      <Edit3 size={16} />
                    </button>
                    <button 
                      onClick={() => handleDeleteEntry(item.key)}
                      style={{ background: "rgba(239, 68, 68, 0.1)", border: "none", borderRadius: "8px", width: "36px", height: "36px", display: "flex", alignItems: "center", justifyContent: "center", color: "#ef4444" }}
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}

export default DictionaryTab;

DictionaryTab.propTypes = {
  setSavedReceipts: PropTypes.func,
  loadReceipts: PropTypes.func,
};
