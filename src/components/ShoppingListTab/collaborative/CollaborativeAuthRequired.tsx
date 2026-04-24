import { Users } from "lucide-react";

export function CollaborativeAuthRequired() {
  return (
    <div>
      <div className="shopping-section-header">
        <div>
          <h2 className="section-title" style={{ marginBottom: "0.2rem" }}>
            <Users size={20} color="var(--primary)" />
            Lista de Compras Colaborativa
          </h2>
          <p style={{ color: "#64748b", fontSize: "0.8rem", marginLeft: "1.8rem" }}>
            Login necessario para usar listas colaborativas
          </p>
        </div>
      </div>

      <div className="glass-card" style={{ textAlign: "center", padding: "3rem 1rem" }}>
        <Users size={44} color="#334155" />
        <h3 style={{ color: "#e2e8f0", marginTop: "0.8rem" }}>Autenticacao necessaria</h3>
        <p style={{ color: "#94a3b8", fontSize: "0.9rem", marginTop: "0.3rem" }}>
          Faca login para criar ou participar de listas colaborativas.
        </p>
      </div>
    </div>
  );
}
