import { Skeleton, SkeletonCard } from "../../Skeleton";
import type { LoadingScreenProps } from "../../../types/scanner";

export function LoadingScreen({ message = "Extraindo dados da nota fiscal..." }: LoadingScreenProps) {
  return (
    <>
      <SkeletonCard style={{ padding: "2rem" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "1rem", marginBottom: "1.5rem" }}>
          <Skeleton width="60px" height="60px" borderRadius="50%" />
          <div style={{ flex: 1 }}>
            <Skeleton width="180px" height="24px" style={{ marginBottom: "8px" }} />
            <Skeleton width="120px" height="18px" />
          </div>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
          {[...Array(5)].map((_, i) => (
            <div
              key={i}
              className="skeleton-item"
              style={{
                background: "rgba(255,255,255,0.02)",
                display: "flex",
                flexDirection: "column",
                gap: "4px",
              }}
            >
              <Skeleton width="70%" height="16px" />
              <Skeleton width="50%" height="14px" />
            </div>
          ))}
        </div>
      </SkeletonCard>
      <p style={{ textAlign: "center", color: "#94a3b8", marginTop: "1rem", fontSize: "0.9rem" }}>
        {message}
      </p>
    </>
  );
}
