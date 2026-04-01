import { Edit3, Save, Plus, X } from "lucide-react";
import { toast } from "react-hot-toast";
import { parseBRL, formatBRL } from "../../utils/currency";
import type { ReceiptItem } from "../../types/domain";
import type { ScannerManualData, ScannerManualItem } from "../../types/ui";

interface ManualEntryFormProps {
    data: ScannerManualData;
    item: ScannerManualItem;
    onDataChange: (data: ScannerManualData | ((prev: ScannerManualData) => ScannerManualData)) => void;
    onItemChange: (item: ScannerManualItem | ((prev: ScannerManualItem) => ScannerManualItem)) => void;
    onSave: () => void;
    onCancel: () => void;
}

export function ManualEntryForm({
    data,
    item,
    onDataChange,
    onItemChange,
    onSave,
    onCancel,
}: ManualEntryFormProps) {
    const handleAddItem = () => {
        if (!item.name?.trim() || !item.unitPrice) {
            toast.error("Preencha nome e preço do item");
            return;
        }

        // Validar preço
        const priceNum = parseBRL(item.unitPrice);
        if (isNaN(priceNum) || priceNum < 0) {
            toast.error("Preço inválido! Use apenas números");
            return;
        }

        const qtyNum = parseBRL(item.qty) || 1;
        const totalNum = priceNum * qtyNum;

        const newItem = {
            name: item.name.trim(),
            quantity: qtyNum,
            price: priceNum,
            total: totalNum,
        };

        onDataChange((prev) => ({ ...prev, items: [newItem, ...prev.items] }));
        onItemChange({ name: "", qty: "1", unitPrice: "" });
        toast.success("Item adicionado!");
    };

    return (
        <div className="glass-card">
            <div
                style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    marginBottom: "1.5rem",
                    borderBottom: "1px solid var(--card-border)",
                    paddingBottom: "1rem",
                }}
            >
                <h2
                    style={{
                        color: "#fff",
                        display: "flex",
                        alignItems: "center",
                        gap: "0.6rem",
                        fontSize: "1.4rem",
                    }}
                >
                    <Edit3 color="var(--primary)" size={24} />
                    Cadastro Manual
                </h2>
                <button
                    onClick={onCancel}
                    style={{
                        background: "rgba(255,255,255,0.05)",
                        border: "none",
                        color: "#94a3b8",
                        cursor: "pointer",
                        borderRadius: "50%",
                        width: "36px",
                        height: "36px",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                    }}
                >
                    <X size={20} />
                </button>
            </div>

            <div
                style={{
                    display: "flex",
                    flexDirection: "column",
                    gap: "0.75rem",
                    marginBottom: "1.5rem",
                }}
            >
                <input
                    type="text"
                    className="search-input"
                    placeholder="Nome do Mercado"
                    value={data.establishment}
                    onChange={(e) =>
                        onDataChange({ ...data, establishment: e.target.value })
                    }
                />
                <input
                    type="text"
                    className="search-input"
                    placeholder="Data (DD/MM/AAAA)"
                    value={data.date}
                    onChange={(e) =>
                        onDataChange({ ...data, date: e.target.value })
                    }
                />
            </div>

            <div
                style={{
                    background: "rgba(15,23,42,0.4)",
                    padding: "1.25rem",
                    borderRadius: "1rem",
                    marginBottom: "1.5rem",
                    border: "1px solid var(--card-border)",
                }}
            >
                <h3
                    style={{
                        color: "#e2e8f0",
                        marginBottom: "1rem",
                        fontSize: "0.9rem",
                        fontWeight: 600,
                    }}
                >
                    ADICIONAR ITEM
                </h3>
                <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
                    <input
                        type="text"
                        className="search-input"
                        style={{ background: "var(--bg-color)" }}
                        placeholder="Nome do Produto"
                        value={item.name}
                        onChange={(e) =>
                            onItemChange({ ...item, name: e.target.value })
                        }
                    />
                    <div style={{ display: "flex", gap: "0.75rem" }}>
                        <input
                            type="number"
                            className="search-input"
                            style={{ width: "85px", background: "var(--bg-color)" }}
                            placeholder="Qtd"
                            value={item.qty}
                            onChange={(e) =>
                                onItemChange({ ...item, qty: e.target.value })
                            }
                        />
                        <input
                            type="text"
                            className="search-input"
                            style={{ flex: 1, background: "var(--bg-color)" }}
                            placeholder="Valor (ex: 5,90)"
                            value={item.unitPrice}
                            onChange={(e) =>
                                onItemChange({ ...item, unitPrice: e.target.value })
                            }
                        />
                        <button
                            className="btn"
                            style={{ padding: "0 1.25rem" }}
                            onClick={handleAddItem}
                        >
                            <Plus size={20} />
                        </button>
                    </div>
                </div>
            </div>

            {data.items.length > 0 && (
                <div
                    className="items-list"
                    style={{
                        marginBottom: "1.5rem",
                        maxHeight: "300px",
                        overflowY: "auto",
                    }}
                >
                    {data.items.map((it: ReceiptItem, idx: number) => (
                        <div
                            key={idx}
                            className="item-row"
                            style={{
                                padding: "0.8rem",
                                background: "rgba(255,255,255,0.03)",
                            }}
                        >
                            <div className="item-details">
                                <span className="item-name" style={{ fontSize: "0.95rem" }}>
                                    {it.name}
                                </span>
                                <span className="item-meta">
                                    {it.quantity} x R$ {formatBRL(it.price)}
                                </span>
                            </div>
                            <div className="item-total" style={{ fontSize: "1.1rem" }}>
                                R$ {it.total}
                            </div>
                        </div>
                    ))}
                </div>
            )}

            <button
                className="btn btn-success"
                style={{ width: "100%", padding: "1.1rem", fontSize: "1.1rem" }}
                onClick={onSave}
                disabled={data.items.length === 0}
            >
                <Save size={20} />
                Finalizar e Salvar
            </button>

            {data.items.length > 0 && (
                <div style={{ marginTop: "1rem", textAlign: "center" }}>
                    <p style={{ color: "#94a3b8", fontSize: "0.85rem" }}>
                        Total: R${" "}
                        {formatBRL(
                            data.items.reduce(
                                (acc: number, curr: ReceiptItem) => acc + parseBRL(curr.total),
                                0,
                            ),
                        )}
                    </p>
                </div>
            )}
        </div>
    );
}