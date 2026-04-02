import { useState } from "react";
import { Activity, /* X, */ ChevronDown, ChevronUp } from "lucide-react";
import { usePerformanceMonitor } from "../hooks/usePerformanceMonitor";

export function PerformancePanel() {
    const [isExpanded, setIsExpanded] = useState(false);
    const { metrics, score, formatMetric } = usePerformanceMonitor();

    // Só mostrar em desenvolvimento
    if (import.meta.env.PROD) {
        return null;
    }

    const scoreColors = {
        good: "#10b981",
        "needs-improvement": "#f59e0b",
        poor: "#ef4444",
    };

    const scoreLabels = {
        good: "Bom",
        "needs-improvement": "Precisa Melhorar",
        poor: "Ruim",
    };

    return (
        <div
            style={{
                position: "fixed",
                bottom: "80px",
                right: "16px",
                zIndex: 9999,
                fontFamily: "monospace",
                fontSize: "12px",
            }}
        >
            {/* Toggle Button */}
            <button
                onClick={() => setIsExpanded(!isExpanded)}
                style={{
                    background: "rgba(15, 23, 42, 0.95)",
                    border: "1px solid rgba(255, 255, 255, 0.1)",
                    borderRadius: isExpanded ? "8px 8px 0 0" : "8px",
                    padding: "8px 12px",
                    color: "#fff",
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    gap: "8px",
                    backdropFilter: "blur(8px)",
                    boxShadow: "0 4px 12px rgba(0, 0, 0, 0.3)",
                }}
            >
                <Activity size={16} color={scoreColors[score]} />
                <span style={{ color: scoreColors[score] }}>
                    {scoreLabels[score]}
                </span>
                {isExpanded ? <ChevronDown size={14} /> : <ChevronUp size={14} />}
            </button>

            {/* Expanded Panel */}
            {isExpanded && (
                <div
                    style={{
                        background: "rgba(15, 23, 42, 0.95)",
                        border: "1px solid rgba(255, 255, 255, 0.1)",
                        borderTop: "none",
                        borderRadius: "0 0 8px 8px",
                        padding: "12px",
                        backdropFilter: "blur(8px)",
                        boxShadow: "0 4px 12px rgba(0, 0, 0, 0.3)",
                        minWidth: "280px",
                    }}
                >
                    <div
                        style={{
                            display: "flex",
                            justifyContent: "space-between",
                            alignItems: "center",
                            marginBottom: "12px",
                            paddingBottom: "8px",
                            borderBottom: "1px solid rgba(255, 255, 255, 0.1)",
                        }}
                    >
                        <span style={{ color: "#fff", fontWeight: "bold" }}>
                            Core Web Vitals
                        </span>
                        <div
                            style={{
                                width: "8px",
                                height: "8px",
                                borderRadius: "50%",
                                background: scoreColors[score],
                            }}
                        />
                    </div>

                    <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                        {/* FCP */}
                        <div style={{ display: "flex", justifyContent: "space-between" }}>
                            <span style={{ color: "#94a3b8" }}>FCP:</span>
                            <span
                                style={{
                                    color:
                                        metrics.fcp && metrics.fcp < 1800
                                            ? "#10b981"
                                            : metrics.fcp && metrics.fcp < 3000
                                                ? "#f59e0b"
                                                : "#ef4444",
                                }}
                            >
                                {formatMetric(metrics.fcp)}
                            </span>
                        </div>

                        {/* LCP */}
                        <div style={{ display: "flex", justifyContent: "space-between" }}>
                            <span style={{ color: "#94a3b8" }}>LCP:</span>
                            <span
                                style={{
                                    color:
                                        metrics.lcp && metrics.lcp < 2500
                                            ? "#10b981"
                                            : metrics.lcp && metrics.lcp < 4000
                                                ? "#f59e0b"
                                                : "#ef4444",
                                }}
                            >
                                {formatMetric(metrics.lcp)}
                            </span>
                        </div>

                        {/* FID */}
                        <div style={{ display: "flex", justifyContent: "space-between" }}>
                            <span style={{ color: "#94a3b8" }}>FID:</span>
                            <span
                                style={{
                                    color:
                                        metrics.fid && metrics.fid < 100
                                            ? "#10b981"
                                            : metrics.fid && metrics.fid < 300
                                                ? "#f59e0b"
                                                : "#ef4444",
                                }}
                            >
                                {formatMetric(metrics.fid)}
                            </span>
                        </div>

                        {/* CLS */}
                        <div style={{ display: "flex", justifyContent: "space-between" }}>
                            <span style={{ color: "#94a3b8" }}>CLS:</span>
                            <span
                                style={{
                                    color:
                                        metrics.cls && metrics.cls < 0.1
                                            ? "#10b981"
                                            : metrics.cls && metrics.cls < 0.25
                                                ? "#f59e0b"
                                                : "#ef4444",
                                }}
                            >
                                {metrics.cls !== null ? metrics.cls.toFixed(3) : "N/A"}
                            </span>
                        </div>

                        {/* TTFB */}
                        <div style={{ display: "flex", justifyContent: "space-between" }}>
                            <span style={{ color: "#94a3b8" }}>TTFB:</span>
                            <span style={{ color: "#e2e8f0" }}>
                                {formatMetric(metrics.ttfb)}
                            </span>
                        </div>

                        {/* Memory */}
                        {metrics.memoryUsage !== null && (
                            <div
                                style={{
                                    display: "flex",
                                    justifyContent: "space-between",
                                    marginTop: "8px",
                                    paddingTop: "8px",
                                    borderTop: "1px solid rgba(255, 255, 255, 0.1)",
                                }}
                            >
                                <span style={{ color: "#94a3b8" }}>Memória:</span>
                                <span style={{ color: "#e2e8f0" }}>
                                    {formatMetric(metrics.memoryUsage, "bytes")}
                                </span>
                            </div>
                        )}

                        {/* Render Time */}
                        {metrics.renderTime !== null && (
                            <div style={{ display: "flex", justifyContent: "space-between" }}>
                                <span style={{ color: "#94a3b8" }}>Render:</span>
                                <span style={{ color: "#e2e8f0" }}>
                                    {formatMetric(metrics.renderTime)}
                                </span>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
