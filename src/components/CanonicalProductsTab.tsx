import { useState, useMemo } from "react";
import {
    Package,
    Plus,
    Edit3,
    Trash2,
    Merge,
    Link,
    Search,
    X,
    Save,
} from "lucide-react";
import { toast } from "react-hot-toast";
import UniversalSearchBar from "./UniversalSearchBar";
import ConfirmDialog from "./ConfirmDialog";
import { motion, AnimatePresence } from "framer-motion";
import {
    useCanonicalProductsQuery,
    useCreateCanonicalProduct,
    useUpdateCanonicalProduct,
    useDeleteCanonicalProduct,
    useMergeCanonicalProducts,
} from "../hooks/queries/useCanonicalProductsQuery";
import type { CanonicalProduct } from "../types/domain";
import type { ConfirmDialogConfig } from "../types/ui";

// Skeleton para loading
const SkeletonProduct = () => (
    <div
        className="glass-card"
        style={{ padding: "1.5rem", marginBottom: "1rem" }}
    >
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "1rem" }}>
            <div>
                <div className="skeleton-line" style={{ width: "180px", height: "20px", marginBottom: "8px" }} />
                <div className="skeleton-line" style={{ width: "120px", height: "16px" }} />
            </div>
            <div className="skeleton-line" style={{ width: "80px", height: "32px", borderRadius: "8px" }} />
        </div>
    </div>
);

function CanonicalProductsTab() {
    const { data: products = [], isLoading: loading } = useCanonicalProductsQuery();
    const createProduct = useCreateCanonicalProduct();
    const updateProduct = useUpdateCanonicalProduct();
    const deleteProduct = useDeleteCanonicalProduct();
    const mergeProducts = useMergeCanonicalProducts();

    const [searchQuery, setSearchQuery] = useState("");
    const [editingId, setEditingId] = useState<string | null>(null);
    const [editForm, setEditForm] = useState({ name: "", category: "", brand: "" });
    const [showCreateForm, setShowCreateForm] = useState(false);
    const [createForm, setCreateForm] = useState({ slug: "", name: "", category: "", brand: "" });
    const [confirmDialog, setConfirmDialog] = useState<ConfirmDialogConfig | null>(null);
    const [confirmBusy, setConfirmBusy] = useState(false);
    const [mergeMode, setMergeMode] = useState<{ primaryId: string; primaryName: string } | null>(null);

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

    // Filtrar produtos
    const filteredProducts = useMemo(() => {
        if (!searchQuery.trim()) return products;
        const query = searchQuery.toLowerCase();
        return products.filter(
            (product) =>
                product.name.toLowerCase().includes(query) ||
                product.slug.toLowerCase().includes(query) ||
                product.category?.toLowerCase().includes(query) ||
                product.brand?.toLowerCase().includes(query)
        );
    }, [products, searchQuery]);

    const handleStartEdit = (product: CanonicalProduct) => {
        setEditingId(product.id);
        setEditForm({
            name: product.name,
            category: product.category || "",
            brand: product.brand || "",
        });
    };

    const handleSaveEdit = async (id: string) => {
        if (!editForm.name.trim()) {
            toast.error("Nome é obrigatório");
            return;
        }

        try {
            await updateProduct.mutateAsync({
                id,
                updates: {
                    name: editForm.name.trim(),
                    category: editForm.category.trim() || undefined,
                    brand: editForm.brand.trim() || undefined,
                },
            });
            setEditingId(null);
        } catch (err) {
            console.error("Erro ao atualizar:", err);
        }
    };

    const handleCreate = async () => {
        if (!createForm.slug.trim() || !createForm.name.trim()) {
            toast.error("Slug e nome são obrigatórios");
            return;
        }

        try {
            await createProduct.mutateAsync({
                slug: createForm.slug.trim().toLowerCase().replace(/\s+/g, "_"),
                name: createForm.name.trim(),
                category: createForm.category.trim() || undefined,
                brand: createForm.brand.trim() || undefined,
            });
            setCreateForm({ slug: "", name: "", category: "", brand: "" });
            setShowCreateForm(false);
        } catch (err) {
            console.error("Erro ao criar:", err);
        }
    };

    const handleDelete = (id: string, name: string) => {
        setConfirmDialog({
            title: "Remover produto canônico?",
            message: `Tem certeza que deseja remover "${name}"? Esta ação não pode ser desfeita.`,
            confirmText: "Remover",
            danger: true,
            onConfirm: async () => {
                await deleteProduct.mutateAsync(id);
            },
        });
    };

    const handleStartMerge = (id: string, name: string) => {
        setMergeMode({ primaryId: id, primaryName: name });
    };

    const handleMerge = async (secondaryId: string) => {
        if (!mergeMode) return;

        setConfirmDialog({
            title: "Mesclar produtos?",
            message: `Mover todas as associações de "${products.find(p => p.id === secondaryId)?.name}" para "${mergeMode.primaryName}"? O produto secundário será removido.`,
            confirmText: "Mesclar",
            danger: true,
            onConfirm: async () => {
                await mergeProducts.mutateAsync({
                    primaryId: mergeMode.primaryId,
                    secondaryId,
                });
                setMergeMode(null);
            },
        });
    };

    return (
        <>
            {/* Header */}
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
                        <Package size={20} color="var(--primary)" />
                        Produtos Canônicos
                    </h2>
                    <div style={{ fontSize: "0.75rem", color: "#64748b", marginLeft: "2rem" }}>
                        {filteredProducts.length} de {products.length} produtos
                    </div>
                </div>
                <button
                    className="btn btn-success"
                    onClick={() => setShowCreateForm(true)}
                    style={{ padding: "0.5rem 1rem" }}
                >
                    <Plus size={18} />
                    Novo
                </button>
            </div>

            {/* Formulário de criação */}
            {showCreateForm && (
                <div className="glass-card" style={{ padding: "1.25rem", marginBottom: "1rem" }}>
                    <h3 style={{ color: "#fff", marginBottom: "1rem", fontSize: "1rem" }}>
                        Criar Produto Canônico
                    </h3>
                    <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
                        <input
                            type="text"
                            className="search-input"
                            placeholder="Slug (ex: coca_cola_2l)"
                            value={createForm.slug}
                            onChange={(e) => setCreateForm({ ...createForm, slug: e.target.value })}
                        />
                        <input
                            type="text"
                            className="search-input"
                            placeholder="Nome amigável (ex: Coca-Cola 2L)"
                            value={createForm.name}
                            onChange={(e) => setCreateForm({ ...createForm, name: e.target.value })}
                        />
                        <input
                            type="text"
                            className="search-input"
                            placeholder="Categoria (opcional)"
                            value={createForm.category}
                            onChange={(e) => setCreateForm({ ...createForm, category: e.target.value })}
                        />
                        <input
                            type="text"
                            className="search-input"
                            placeholder="Marca (opcional)"
                            value={createForm.brand}
                            onChange={(e) => setCreateForm({ ...createForm, brand: e.target.value })}
                        />
                        <div style={{ display: "flex", gap: "0.5rem" }}>
                            <button className="btn btn-success" style={{ flex: 1 }} onClick={handleCreate}>
                                <Save size={18} /> Criar
                            </button>
                            <button
                                className="btn"
                                style={{ flex: 1 }}
                                onClick={() => setShowCreateForm(false)}
                            >
                                <X size={18} /> Cancelar
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Modo Merge */}
            {mergeMode && (
                <div className="glass-card" style={{ padding: "1.25rem", marginBottom: "1rem", background: "rgba(245, 158, 11, 0.1)", border: "1px solid rgba(245, 158, 11, 0.2)" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                        <div>
                            <h3 style={{ color: "#fbbf24", marginBottom: "0.25rem", fontSize: "1rem" }}>
                                Modo Merge Ativo
                            </h3>
                            <p style={{ color: "#94a3b8", fontSize: "0.85rem" }}>
                                Selecione um produto para mesclar com "{mergeMode.primaryName}"
                            </p>
                        </div>
                        <button
                            className="btn"
                            onClick={() => setMergeMode(null)}
                            style={{ padding: "0.5rem" }}
                        >
                            <X size={18} />
                        </button>
                    </div>
                </div>
            )}

            {/* Barra de busca */}
            <UniversalSearchBar
                placeholder="Buscar produtos canônicos..."
                value={searchQuery}
                onChange={setSearchQuery}
            />

            {/* Lista de produtos */}
            <div className="items-list" style={{ gap: "1rem" }}>
                {loading ? (
                    [...Array(3)].map((_, i) => <SkeletonProduct key={i} />)
                ) : filteredProducts.length === 0 ? (
                    <div className="glass-card" style={{ textAlign: "center", padding: "3rem" }}>
                        <Package size={48} color="var(--primary)" style={{ opacity: 0.3, marginBottom: "1rem" }} />
                        <p style={{ color: "#64748b" }}>
                            {searchQuery ? "Nenhum produto encontrado." : "Nenhum produto canônico cadastrado."}
                        </p>
                    </div>
                ) : (
                    <AnimatePresence mode="popLayout">
                        {filteredProducts.map((product) => (
                            <motion.div
                                key={product.id}
                                layout
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, scale: 0.95 }}
                                transition={{ duration: 0.2 }}
                                className="glass-card"
                                style={{
                                    padding: "1.25rem",
                                    border: mergeMode && mergeMode.primaryId !== product.id
                                        ? "1px solid rgba(245, 158, 11, 0.3)"
                                        : undefined,
                                }}
                            >
                                {editingId === product.id ? (
                                    /* Modo edição */
                                    <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
                                        <div style={{ fontSize: "0.75rem", color: "#64748b", fontWeight: "bold" }}>
                                            SLUG: {product.slug}
                                        </div>
                                        <input
                                            type="text"
                                            className="search-input"
                                            value={editForm.name}
                                            onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                                            placeholder="Nome"
                                        />
                                        <input
                                            type="text"
                                            className="search-input"
                                            value={editForm.category}
                                            onChange={(e) => setEditForm({ ...editForm, category: e.target.value })}
                                            placeholder="Categoria"
                                        />
                                        <input
                                            type="text"
                                            className="search-input"
                                            value={editForm.brand}
                                            onChange={(e) => setEditForm({ ...editForm, brand: e.target.value })}
                                            placeholder="Marca"
                                        />
                                        <div style={{ display: "flex", gap: "0.5rem" }}>
                                            <button className="btn btn-success" style={{ flex: 1 }} onClick={() => handleSaveEdit(product.id)}>
                                                <Save size={18} /> Salvar
                                            </button>
                                            <button className="btn" style={{ flex: 1 }} onClick={() => setEditingId(null)}>
                                                <X size={18} /> Cancelar
                                            </button>
                                        </div>
                                    </div>
                                ) : (
                                    /* Modo visualização */
                                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                                        <div style={{ flex: 1 }}>
                                            <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "4px" }}>
                                                <span style={{ color: "#fff", fontWeight: 600, fontSize: "1rem" }}>
                                                    {product.name}
                                                </span>
                                                {product.category && (
                                                    <span
                                                        style={{
                                                            fontSize: "0.65rem",
                                                            background: "rgba(59, 130, 246, 0.1)",
                                                            padding: "2px 6px",
                                                            borderRadius: "4px",
                                                            color: "var(--primary)",
                                                        }}
                                                    >
                                                        {product.category}
                                                    </span>
                                                )}
                                                {product.brand && (
                                                    <span
                                                        style={{
                                                            fontSize: "0.65rem",
                                                            background: "rgba(16, 185, 129, 0.1)",
                                                            padding: "2px 6px",
                                                            borderRadius: "4px",
                                                            color: "#10b981",
                                                        }}
                                                    >
                                                        {product.brand}
                                                    </span>
                                                )}
                                            </div>
                                            <div style={{ fontSize: "0.75rem", color: "#64748b", fontStyle: "italic" }}>
                                                Slug: {product.slug}
                                                {product.merge_count && product.merge_count > 1 && (
                                                    <span style={{ marginLeft: "8px", color: "#f59e0b" }}>
                                                        ({product.merge_count} merges)
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                        <div style={{ display: "flex", gap: "8px" }}>
                                            {mergeMode && mergeMode.primaryId !== product.id ? (
                                                <button
                                                    onClick={() => handleMerge(product.id)}
                                                    style={{
                                                        background: "rgba(245, 158, 11, 0.2)",
                                                        border: "none",
                                                        borderRadius: "8px",
                                                        width: "36px",
                                                        height: "36px",
                                                        display: "flex",
                                                        alignItems: "center",
                                                        justifyContent: "center",
                                                        color: "#f59e0b",
                                                    }}
                                                    title="Mesclar com este produto"
                                                >
                                                    <Merge size={16} />
                                                </button>
                                            ) : (
                                                <>
                                                    <button
                                                        onClick={() => handleStartMerge(product.id, product.name)}
                                                        style={{
                                                            background: "rgba(245, 158, 11, 0.1)",
                                                            border: "none",
                                                            borderRadius: "8px",
                                                            width: "36px",
                                                            height: "36px",
                                                            display: "flex",
                                                            alignItems: "center",
                                                            justifyContent: "center",
                                                            color: "#f59e0b",
                                                        }}
                                                        title="Iniciar merge"
                                                    >
                                                        <Merge size={16} />
                                                    </button>
                                                    <button
                                                        onClick={() => handleStartEdit(product)}
                                                        style={{
                                                            background: "rgba(59, 130, 246, 0.1)",
                                                            border: "none",
                                                            borderRadius: "8px",
                                                            width: "36px",
                                                            height: "36px",
                                                            display: "flex",
                                                            alignItems: "center",
                                                            justifyContent: "center",
                                                            color: "var(--primary)",
                                                        }}
                                                        title="Editar"
                                                    >
                                                        <Edit3 size={16} />
                                                    </button>
                                                    <button
                                                        onClick={() => handleDelete(product.id, product.name)}
                                                        style={{
                                                            background: "rgba(239, 68, 68, 0.1)",
                                                            border: "none",
                                                            borderRadius: "8px",
                                                            width: "36px",
                                                            height: "36px",
                                                            display: "flex",
                                                            alignItems: "center",
                                                            justifyContent: "center",
                                                            color: "#ef4444",
                                                        }}
                                                        title="Deletar"
                                                    >
                                                        <Trash2 size={16} />
                                                    </button>
                                                </>
                                            )}
                                        </div>
                                    </div>
                                )}
                            </motion.div>
                        ))}
                    </AnimatePresence>
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
        </>
    );
}

export default CanonicalProductsTab;