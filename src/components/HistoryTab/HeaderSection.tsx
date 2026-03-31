import { History, Download, Upload, Save } from "lucide-react";
import type { HeaderSectionProps } from "../HistoryTab.types";

export function HeaderSection({
  totalCount,
  filteredCount,
  isLoading,
  onRefresh,
  onBackup,
  onRestore,
  onExportCSV,
}: HeaderSectionProps) {
  return (
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
          {filteredCount} de {totalCount} notas
        </div>
      </div>
      <div style={{ display: "flex", gap: "0.5rem" }}>
        <button
          onClick={onRefresh}
          className="btn"
          style={{
            padding: "0.5rem",
            background: "rgba(148, 163, 184, 0.1)",
            border: "none",
            color: "#94a3b8",
            borderRadius: "8px",
          }}
          title="Sincronizar"
          disabled={isLoading}
        >
          <History size={20} className={isLoading ? "spin" : ""} />
        </button>

        <input
          type="file"
          id="restore-input"
          accept=".json"
          onChange={onRestore}
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
          onClick={onBackup}
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
          onClick={onExportCSV}
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
  );
}
