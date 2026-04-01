import { ShoppingCart, Plus } from "lucide-react";
import { parseBRL, formatBRL } from "../../utils/currency";
import { formatToBR } from "../../utils/date";
import type { Receipt, ReceiptItem } from "../../types/domain";

interface ReceiptResultProps {
    receipt: Receipt;
    onNewScan: () => void;
}

export function ReceiptResult({ receipt, onNewScan }: ReceiptResultProps) {
    const displayDate = formatToBR(receipt.date) || receipt.date;

    return (
        <div className="glass-card">
            <div style={{ textAlign: "center", marginBottom: "2rem" }}>
                <div
                    style={{
                        width: "60px",
                        height: "60px",
                        borderRadius: "50%",
                        background: "var(--success)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        margin: "0 auto 1rem",
                    }}
                >
                    <ShoppingCart color="white" size={30} />
                </div>
                <h2 style={{ color: "#fff" }}>Nota Salva!</h2>
                <p
                    style={{
                        color: "var(--success)",
                        fontWeight: 600,
                        fontSize: "1.1rem",
                    }}
                >
                    {receipt.establishment}
                </p>
                <p style={{ color: "#94a3b8", fontSize: "0.85rem" }}>
                    {displayDate}
                </p>
            </div>

            <div
                className="items-list"
                style={{
                    maxHeight: "250px",
                    overflowY: "auto",
                    marginBottom: "1.5rem",
                }}
            >
                {receipt.items.map((item: ReceiptItem, idx: number) => (
                    <div
                        key={idx}
                        className="item-row"
                        style={{ background: "rgba(255,255,255,0.02)" }}
                    >
                        <div className="item-details">
                            <span className="item-name" style={{ fontSize: "0.9rem" }}>
                                {item.normalized_name || item.name}
                            </span>
                            <div
                                style={{
                                    display: "flex",
                                    gap: "8px",
                                    alignItems: "center",
                                    marginTop: "2px",
                                }}
                            >
                                <span className="item-meta">
                                    R$ {formatBRL(item.price)} un x {item.quantity}
                                </span>
                                {item.category && (
                                    <span
                                        style={{
                                            fontSize: "0.6rem",
                                            background: "rgba(59, 130, 246, 0.1)",
                                            padding: "1px 5px",
                                            borderRadius: "4px",
                                            color: "var(--primary)",
                                        }}
                                    >
                                        {item.category}
                                    </span>
                                )}
                            </div>
                        </div>
                        <div className="item-total" style={{ fontSize: "1rem" }}>
                            R$ {item.total ?? formatBRL(parseBRL(item.price) * parseBRL(item.quantity || 1))}
                        </div>
                    </div>
                ))}
            </div>

            <div
                className="total-summary"
                style={{ fontSize: "1.25rem", marginBottom: "2rem" }}
            >
                <span style={{ color: "#94a3b8", fontWeight: 500 }}>Total</span>
                <span style={{ color: "var(--success)" }}>
                    R${" "}
                    {formatBRL(
                        receipt.items.reduce(
                            (acc: number, curr: ReceiptItem) => {
                                if (curr.total != null) return acc + parseBRL(curr.total);
                                return acc + parseBRL(curr.price) * parseBRL(curr.quantity || 1);
                            },
                            0,
                        ),
                    )}
                </span>
            </div>

            <button
                className="btn btn-success"
                style={{ width: "100%", padding: "1rem" }}
                onClick={onNewScan}
            >
                <Plus size={20} />
                Registrar Nova Nota
            </button>
        </div>
    );
}
