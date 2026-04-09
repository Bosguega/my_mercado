import { Search, ArrowDownAZ } from 'lucide-react';
import { useState } from 'react';
import type { CSSProperties, ReactNode } from 'react';
import type { SortDirection } from '../types/ui';

const PLACEHOLDER_IDLE = "Pesquisar por nome ou categoria";
const PLACEHOLDER_FOCUSED = "Use espaço para separar termos e - para excluir";

type UniversalSearchBarProps = {
  placeholder?: string;
  value: string;
  onChange: (value: string) => void;
  sortValue?: string;
  onSortChange?: (value: string) => void;
  sortOrder?: SortDirection | null;
  onSortOrderChange?: (value: SortDirection) => void;
  sortOptions?: Array<{ value: string; label: string }>;
  sortLabel?: string;
  extraActions?: ReactNode;
  containerStyle?: CSSProperties;
  inputStyle?: CSSProperties;
};

/**
 * UniversalSearchBar - Componente centralizado de busca e ordenação
 * Mantém a identidade visual "glassmorphism" e simplifica a manutenção entre abas.
 *
 * O placeholder do input muda dinamicamente conforme o foco:
 * - Sem foco: "Pesquisar por nome ou categoria"
 * - Com foco: "Use espaço para separar termos e - para excluir"
 */
const UniversalSearchBar = ({
  placeholder,
  value,
  onChange,
  sortValue,
  onSortChange,
  sortOrder = null, // "asc" | "desc" | null
  onSortOrderChange,
  sortOptions = [],
  sortLabel = "ORDENAR:",
  extraActions = null,
  containerStyle = {},
  inputStyle = {}
}: UniversalSearchBarProps) => {
  const [isFocused, setIsFocused] = useState(false);

  // Placeholder dinâmico: muda conforme o foco
  // Se o consumidor passar um placeholder customizado, respeita-o
  const idlePlaceholder = placeholder ?? PLACEHOLDER_IDLE;
  const activePlaceholder = isFocused ? PLACEHOLDER_FOCUSED : idlePlaceholder;

  const defaultContainerStyle: CSSProperties = {
    padding: "1.25rem",
    display: "flex",
    flexDirection: "column",
    gap: "1rem",
    marginBottom: "1rem",
    ...containerStyle
  };

  const inputWrapperStyle: CSSProperties = {
    position: "relative",
    width: "100%",
  };

  const commonInputStyle: CSSProperties = {
    height: "48px",
    borderRadius: "12px",
    border: "none",
    background: "rgba(255, 255, 255, 0.05)",
    fontSize: "0.95rem",
    width: "100%",
    padding: "0 1rem 0 3rem",
    color: "#fff",
    outline: "none",
    ...inputStyle
  };

  return (
    <div className="glass-card" style={defaultContainerStyle}>
      {/* Campo de Busca */}
      <div style={inputWrapperStyle}>
        <Search
          size={18}
          style={{
            position: "absolute",
            left: "1rem",
            top: "50%",
            transform: "translateY(-50%)",
            color: "#64748b",
            pointerEvents: "none"
          }}
        />
        <input
          type="text"
          placeholder={activePlaceholder}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          style={commonInputStyle}
          className="search-input-field"
        />
      </div>

      {/* Seletor de ordenação / Filtros / Ações Extras */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "0 0.25rem",
          flexWrap: "wrap",
          gap: "1rem"
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
          {sortLabel && (
            <span style={{ fontSize: "0.8rem", color: "#64748b", fontWeight: 500 }}>
              {sortLabel}
            </span>
          )}
          {sortOptions.length > 0 && (
            <select
              value={sortValue}
              onChange={(e) => onSortChange?.(e.target.value)}
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
              {sortOptions.map(opt => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          )}

          {sortOrder && onSortOrderChange && (
            <button
              onClick={() => onSortOrderChange(sortOrder === "asc" ? "desc" : "asc")}
              className="btn"
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
                transition: "all 0.2s ease"
              }}
              title={sortOrder === "asc" ? "Crescente" : "Decrescente"}
            >
              <div
                style={{
                  display: "flex",
                  transition: "transform 0.4s cubic-bezier(0.4, 0, 0.2, 1)",
                  transform: sortOrder === "asc" ? "rotate(180deg)" : "rotate(0deg)"
                }}
              >
                <ArrowDownAZ size={20} />
              </div>
            </button>
          )}
        </div>

        {/* Espaço para botões de ação (ex: Gráfico) */}
        {extraActions && (
          <div style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
            {extraActions}
          </div>
        )}
      </div>
    </div>
  );
};

export default UniversalSearchBar;
