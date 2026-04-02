import React from "react";

interface SkeletonProps {
  width?: string;
  height?: string;
  borderRadius?: string;
  className?: string;
  style?: React.CSSProperties;
}

export const Skeleton: React.FC<SkeletonProps> = ({
  width,
  height,
  borderRadius,
  className = "",
  style
}) => {
  return (
    <div
      className={`skeleton-line ${className}`}
      style={{
        width: width || "100%",
        height: height || "20px",
        borderRadius: borderRadius || "6px",
        ...style
      }}
    />
  );
};

export const SkeletonCard: React.FC<{ children: React.ReactNode; className?: string; style?: React.CSSProperties }> = ({
  children,
  className = "",
  style
}) => (
  <div className={`glass-card ${className}`} style={style}>
    {children}
  </div>
);

export const ReceiptSkeleton: React.FC = () => (
  <SkeletonCard>
    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "1rem" }}>
      <div style={{ flex: 1 }}>
        <Skeleton width="70%" height="24px" style={{ marginBottom: "8px" }} />
        <Skeleton width="40%" height="16px" />
      </div>
      <Skeleton width="60px" height="24px" />
    </div>
    <div className="items-list">
      {[...Array(2)].map((_, i) => (
        <div key={i} className="skeleton-item" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "1rem" }}>
          <div style={{ flex: 1 }}>
            <Skeleton width="80%" height="16px" style={{ marginBottom: "4px" }} />
            <Skeleton width="50%" height="14px" />
          </div>
          <Skeleton width="50px" height="20px" />
        </div>
      ))}
    </div>
  </SkeletonCard>
);

export const ProductSkeleton: React.FC = () => (
  <SkeletonCard style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
    <div>
      <Skeleton width="180px" height="20px" style={{ marginBottom: "8px" }} />
      <Skeleton width="120px" height="16px" />
    </div>
    <Skeleton width="80px" height="32px" borderRadius="8px" />
  </SkeletonCard>
);
