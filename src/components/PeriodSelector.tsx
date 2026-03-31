import type { CSSProperties } from "react";
import type { HistoryFilters, SearchFilters } from "../types/ui";

type PeriodValue = "all" | "this-month" | "last-3-months" | "custom";

type PeriodSelectorProps<T extends HistoryFilters | SearchFilters> = {
  filters: T;
  onChange: (filters: T) => void;
  containerStyle?: CSSProperties;
  selectStyle?: CSSProperties;
  label?: string;
};

const PERIOD_OPTIONS = [
  { value: "all", label: "Todo período" },
  { value: "this-month", label: "Este mês" },
  { value: "last-3-months", label: "Últimos 3 meses" },
  { value: "custom", label: "Personalizado" },
];

/**
 * PeriodSelector - Seletor de período reutilizável
 * 
 * Componente visual para seleção de período (all, this-month, last-3-months, custom)
 * Funciona com HistoryFilters ou SearchFilters.
 * Não gerencia estado interno - estado controlado via props.
 * 
 * @example
 * // Com HistoryFilters
 * <PeriodSelector
 *   filters={historyFilters}
 *   onChange={setHistoryFilters}
 *   label="PERÍODO:"
 * />
 * 
 * @example
 * // Com SearchFilters
 * <PeriodSelector
 *   filters={searchFilters}
 *   onChange={setSearchFilters}
 * />
 */
export function PeriodSelector<T extends HistoryFilters | SearchFilters>({
  filters,
  onChange,
  containerStyle = {},
  selectStyle = {},
  label = "PERÍODO:",
}: PeriodSelectorProps<T>) {
  const defaultSelectStyle: CSSProperties = {
    background: "rgba(59, 130, 246, 0.1)",
    border: "none",
    borderRadius: "6px",
    color: "var(--primary)",
    fontSize: "0.8rem",
    fontWeight: 600,
    padding: "0.25rem 0.5rem",
    cursor: "pointer",
    outline: "none",
    ...selectStyle,
  };

  return (
    <div
      style={{ display: "flex", alignItems: "center", gap: "0.5rem", ...containerStyle }}
    >
      <span
        style={{
          fontSize: "0.8rem",
          color: "#64748b",
          fontWeight: 500,
        }}
      >
        {label}
      </span>
      <select
        value={filters.period}
        onChange={(e) =>
          onChange({
            ...filters,
            period: e.target.value as PeriodValue,
          } as T)
        }
        style={defaultSelectStyle}
      >
        {PERIOD_OPTIONS.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
    </div>
  );
}

type PeriodDatePickersProps<T extends HistoryFilters | SearchFilters> = {
  filters: T;
  onChange: (filters: T) => void;
  containerStyle?: CSSProperties;
};

/**
 * PeriodDatePickers - Date pickers para período personalizado
 * 
 * Renderiza inputs de data para início e fim quando o período é "custom".
 * Funciona com HistoryFilters ou SearchFilters.
 * Deve ser renderizado condicionalmente pelo componente pai.
 * 
 * @example
 * // Com HistoryFilters
 * {historyFilters.period === "custom" && (
 *   <PeriodDatePickers
 *     filters={historyFilters}
 *     onChange={setHistoryFilters}
 *   />
 * )}
 */
export function PeriodDatePickers<T extends HistoryFilters | SearchFilters>({
  filters,
  onChange,
  containerStyle = {},
}: PeriodDatePickersProps<T>) {
  if (filters.period !== "custom") return null;

  const defaultContainerStyle: CSSProperties = {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: "0.75rem",
    marginBottom: "1rem",
    padding: "1rem",
    ...containerStyle,
  };

  const labelStyle: CSSProperties = {
    display: "block",
    fontSize: "0.7rem",
    color: "#64748b",
    marginBottom: "0.5rem",
    fontWeight: 600,
    textTransform: "uppercase",
  };

  const inputStyle: CSSProperties = {
    background: "rgba(255,255,255,0.05)",
    fontSize: "0.85rem",
    height: "40px",
  };

  const handleChange = (field: "startDate" | "endDate") => (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    onChange({
      ...filters,
      [field]: e.target.value,
    } as T);
  };

  return (
    <div className="glass-card" style={defaultContainerStyle}>
      <div>
        <label style={labelStyle}>Início</label>
        <input
          type="date"
          className="search-input"
          value={filters.startDate || ""}
          onChange={handleChange("startDate")}
          style={inputStyle}
        />
      </div>
      <div>
        <label style={labelStyle}>Fim</label>
        <input
          type="date"
          className="search-input"
          value={filters.endDate || ""}
          onChange={handleChange("endDate")}
          style={inputStyle}
        />
      </div>
    </div>
  );
}
