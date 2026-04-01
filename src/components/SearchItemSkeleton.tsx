import { memo } from "react";
import { Skeleton } from "./Skeleton";

/**
 * Componente de skeleton para item de busca
 * Reutilizável para listas de loading
 */
export const SearchItemSkeleton = memo(function SearchItemSkeleton() {
  return (
    <div
      className="item-row"
      style={{
        background: "rgba(255,255,255,0.02)",
        border: "1px solid rgba(255,255,255,0.05)",
        display: "flex",
        padding: "1rem",
        marginBottom: "0.5rem",
        borderRadius: "1rem",
      }}
    >
      <div style={{ flex: 1 }}>
        <Skeleton width="60%" height="18px" style={{ marginBottom: "8px" }} />
        <Skeleton width="40%" height="14px" />
      </div>
      <div style={{ textAlign: "right" }}>
        <Skeleton
          width="80px"
          height="20px"
          style={{ marginBottom: "4px" }}
        />
        <Skeleton width="40px" height="12px" style={{ marginLeft: "auto" }} />
      </div>
    </div>
  );
});
