import React, { useMemo, useCallback } from "react";
import { Trash2, ChevronDown, ChevronUp } from "lucide-react";
import { parseBRL } from "../utils/currency";
import { calculateReceiptTotal } from "../utils/analytics";
import { formatToBR } from "../utils/date";
import type { Receipt, ReceiptItem } from "../types/domain";

interface ReceiptCardProps {
    receipt: Receipt;
    isExpanded: boolean;
    onToggle: (id: string) => void;
    onDelete: (id: string) => void;
}

export const ReceiptCard = React.memo(function ReceiptCard({
    receipt,
    isExpanded,
    onToggle,
    onDelete,
}: ReceiptCardProps) {
    // Memoizar o cálculo do total
    const total = useMemo(() => {
        return calculateReceiptTotal(receipt, parseBRL);
    }, [receipt]);
    const displayDate = useMemo(() => formatToBR(receipt.date) || receipt.date, [receipt.date]);

    // Memoizar o callback de toggle
    const handleToggle = useCallback(() => {
        onToggle(receipt.id);
    }, [receipt.id, onToggle]);

    // Memoizar o callback de delete
    const handleDelete = useCallback(
        (e: React.MouseEvent) => {
            e.stopPropagation();
            onDelete(receipt.id);
        },
        [receipt.id, onDelete],
    );

    return (
        <div
            className="glass-card animated-item"
            style={{
                padding: "0",
                overflow: "hidden",
                marginBottom: 0,
            }}
        >
            {/* Header */}
            <div
                onClick={handleToggle}
                style={{
                    padding: "1.25rem",
                    cursor: "pointer",
                    position: "relative",
                }}
            >
                <div
                    style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "flex-start",
                        marginBottom: "0.5rem",
                    }}
                >
                    <div>
                        <h3
                            style={{
                                color: "#f8fafc",
                                fontSize: "1.1rem",
                                marginBottom: "0.25rem",
                            }}
                        >
                            {receipt.establishment}
                        </h3>
                        <div
                            style={{
                                display: "flex",
                                gap: "1rem",
                                alignItems: "center",
                            }}
                        >
                            <span style={{ color: "#94a3b8", fontSize: "0.8rem" }}>
                                {displayDate}
                            </span>
                            <span
                                style={{
                                    background: "rgba(59, 130, 246, 0.2)",
                                    color: "var(--primary)",
                                    padding: "0.1rem 0.5rem",
                                    borderRadius: "1rem",
                                    fontSize: "0.75rem",
                                }}
                            >
                                {receipt.items.length} itens
                            </span>
                        </div>
                    </div>
                    <div
                        style={{
                            display: "flex",
                            alignItems: "center",
                            gap: "0.75rem",
                        }}
                    >
                        <span
                            style={{
                                color: "var(--success)",
                                fontWeight: 700,
                                fontSize: "1.1rem",
                                whiteSpace: "nowrap",
                            }}
                        >
                            R$ {total.toFixed(2).replace(".", ",")}
                        </span>
                        <button
                            onClick={handleDelete}
                            style={{
                                background: "rgba(239, 68, 68, 0.1)",
                                border: "none",
                                borderRadius: "0.5rem",
                                width: "32px",
                                height: "32px",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                color: "#ef4444",
                            }}
                        >
                            <Trash2 size={16} />
                        </button>
                    </div>
                </div>

                <div
                    style={{
                        display: "flex",
                        justifyContent: "center",
                        marginTop: "0.5rem",
                        color: "#64748b",
                    }}
                >
                    {isExpanded ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                </div>
            </div>

            {/* Expanded Details */}
            {isExpanded && (
                <div
                    className="animated-expand"
                    style={{
                        background: "rgba(15, 23, 42, 0.3)",
                        borderTop: "1px solid var(--card-border)",
                        padding: "1rem",
                        overflow: "hidden",
                    }}
                >
                    {receipt.items.map((item: ReceiptItem, idx: number) => (
                        <div
                            key={idx}
                            style={{
                                display: "flex",
                                justifyContent: "space-between",
                                padding: "0.6rem 0",
                                borderBottom:
                                    idx === receipt.items.length - 1
                                        ? "none"
                                        : "1px solid rgba(255,255,255,0.05)",
                            }}
                        >
                            <div style={{ flex: 1 }}>
                                <div
                                    style={{
                                        fontSize: "0.9rem",
                                        color: "#e2e8f0",
                                        fontWeight: 500,
                                        display: "flex",
                                        alignItems: "center",
                                        gap: "8px",
                                    }}
                                >
                                    {item.normalized_name || item.name}
                                    {item.category && (
                                        <span
                                            style={{
                                                fontSize: "0.65rem",
                                                background: "rgba(255,255,255,0.1)",
                                                padding: "1px 6px",
                                                borderRadius: "4px",
                                                color: "#94a3b8",
                                                fontWeight: "normal",
                                            }}
                                        >
                                            {item.category}
                                        </span>
                                    )}
                                </div>
                                <div
                                    style={{
                                        fontSize: "0.75rem",
                                        color: "#64748b",
                                        fontStyle: item.normalized_name ? "italic" : "normal",
                                    }}
                                >
                                    {item.normalized_name
                                        ? item.name
                                        : `${item.qty} x R$ ${item.unitPrice}`}
                                </div>
                                {item.normalized_name && (
                                    <div
                                        style={{
                                            fontSize: "0.75rem",
                                            color: "#94a3b8",
                                        }}
                                    >
                                        {item.qty} x R$ {item.unitPrice}
                                    </div>
                                )}
                            </div>
                            <div
                                style={{
                                    color: "#cbd5e1",
                                    fontWeight: 600,
                                    fontSize: "0.9rem",
                                }}
                            >
                                R$ {item.total}
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
});
