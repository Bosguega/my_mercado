import { KeyRound, Pencil, Plus, RefreshCcw, Trash2 } from "lucide-react";
import { useCollaborativeShoppingListActions } from "../../../hooks/shoppingList/useCollaborativeShoppingListActions";
import type { CollaborativeShoppingList, CollaborativeShoppingListMember } from "../../../types/domain";

type CollaborativeActions = ReturnType<typeof useCollaborativeShoppingListActions>;

interface CollaborativeManagementCardProps {
  onSwitchToLocal?: () => void;
  activeList: CollaborativeShoppingList | null;
  collaborativeLists: CollaborativeShoppingList[];
  collaborativeMembers: CollaborativeShoppingListMember[];
  sessionUserId: string | null;
  setActiveListId: (next: string | null) => void;
  onCreateList: () => void;
  onRenameList: () => void;
  onJoinByCode: () => void;
  actions: CollaborativeActions;
}

export function CollaborativeManagementCard({
  onSwitchToLocal,
  activeList,
  collaborativeLists,
  collaborativeMembers,
  sessionUserId,
  setActiveListId,
  onCreateList,
  onRenameList,
  onJoinByCode,
  actions,
}: CollaborativeManagementCardProps) {
  return (
    <div className="glass-card" style={{ marginBottom: "1rem", padding: "0.75rem" }}>
      <div className="shopping-collab-top-actions">
        <button
          className="btn"
          style={{
            background: "rgba(255,255,255,0.08)",
            boxShadow: "none",
          }}
          onClick={onSwitchToLocal}
        >
          Voltar para Lista Local
        </button>
        <button
          className="btn"
          style={{ background: "rgba(255,255,255,0.08)", boxShadow: "none" }}
          onClick={onJoinByCode}
        >
          <KeyRound size={15} /> Entrar por codigo
        </button>
      </div>

      <div className="shopping-list-toolbar">
        <select
          className="search-input"
          value={activeList?.id || ""}
          onChange={(event) => setActiveListId(event.target.value || null)}
          aria-label="Selecionar lista colaborativa"
        >
          {collaborativeLists.map((list) => (
            <option key={list.id} value={list.id}>
              {list.name} ({list.role || "membro"})
            </option>
          ))}
        </select>
        <button className="btn" style={{ padding: "0.5rem 0.7rem" }} onClick={onCreateList}>
          <Plus size={15} /> Nova
        </button>
        <button
          className="btn"
          style={{ padding: "0.5rem 0.7rem", background: "rgba(255,255,255,0.08)", boxShadow: "none" }}
          onClick={onRenameList}
          disabled={!activeList}
        >
          <Pencil size={15} /> Renomear
        </button>
        <button
          className="btn"
          style={{
            padding: "0.5rem 0.7rem",
            background: "rgba(239, 68, 68, 0.12)",
            boxShadow: "none",
            color: "#f87171",
          }}
          onClick={() => activeList && actions.confirmDeleteList(activeList.id, activeList.name)}
          disabled={!activeList || activeList.role !== "owner"}
        >
          <Trash2 size={15} /> Excluir
        </button>
      </div>

      {activeList && (
        <>
          <div
            style={{
              marginTop: "0.1rem",
              padding: "0.65rem",
              borderRadius: "0.7rem",
              background: "rgba(14,165,233,0.10)",
              border: "1px solid rgba(14,165,233,0.22)",
              display: "flex",
              flexWrap: "wrap",
              gap: "0.45rem",
              alignItems: "center",
            }}
          >
            <span style={{ color: "#7dd3fc", fontSize: "0.82rem" }}>
              Codigo: <strong>{activeList.share_code}</strong>
            </span>
            <button
              className="btn"
              style={{ padding: "0.35rem 0.55rem", background: "rgba(255,255,255,0.1)", boxShadow: "none" }}
              onClick={() => actions.handleCopyShareCode(activeList.share_code)}
            >
              Copiar codigo
            </button>
            <button
              className="btn"
              style={{ padding: "0.35rem 0.55rem", background: "rgba(255,255,255,0.1)", boxShadow: "none" }}
              onClick={() => actions.handleRegenerateCode(activeList.id)}
              disabled={activeList.role !== "owner"}
            >
              <RefreshCcw size={13} /> Novo codigo
            </button>
            <span style={{ color: "#bae6fd", fontSize: "0.74rem" }}>
              Modo colaborativo em tempo real
            </span>
          </div>

          <div
            style={{
              marginTop: "0.55rem",
              padding: "0.65rem",
              borderRadius: "0.7rem",
              background: "rgba(2,132,199,0.08)",
              border: "1px solid rgba(2,132,199,0.18)",
            }}
          >
            <div
              style={{
                color: "#bae6fd",
                fontSize: "0.78rem",
                textTransform: "uppercase",
                marginBottom: "0.4rem",
                fontWeight: 700,
              }}
            >
              Membros ({collaborativeMembers.length})
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: "0.35rem" }}>
              {collaborativeMembers.map((member) => (
                <div key={member.user_id} className="shopping-member-row">
                  <span style={{ color: "#e2e8f0", fontSize: "0.8rem" }}>
                    {member.user_id === sessionUserId ? "Voce" : `${member.user_id.slice(0, 8)}...`}
                  </span>
                  <select
                    className="search-input"
                    value={member.role === "owner" ? "owner" : member.role}
                    disabled={
                      activeList.role !== "owner" ||
                      member.role === "owner"
                    }
                    onChange={(event) =>
                      actions.handleChangeMemberRole(
                        activeList.id,
                        member.user_id,
                        event.target.value as "editor" | "viewer",
                      )
                    }
                    style={{ minHeight: "32px", padding: "0.3rem 0.45rem" }}
                  >
                    {member.role === "owner" && <option value="owner">owner</option>}
                    <option value="editor">editor</option>
                    <option value="viewer">viewer</option>
                  </select>
                  <button
                    className="btn"
                    style={{
                      padding: "0.35rem 0.55rem",
                      background: "rgba(239,68,68,0.16)",
                      boxShadow: "none",
                      color: "#fca5a5",
                    }}
                    disabled={
                      activeList.role !== "owner" ||
                      member.role === "owner"
                    }
                    onClick={() => actions.handleRemoveMember(activeList.id, member.user_id)}
                  >
                    Remover
                  </button>
                  <button
                    className="btn"
                    style={{
                      padding: "0.35rem 0.55rem",
                      background: "rgba(16,185,129,0.16)",
                      boxShadow: "none",
                      color: "#86efac",
                    }}
                    disabled={
                      activeList.role !== "owner" ||
                      member.role === "owner"
                    }
                    onClick={() =>
                      actions.confirmTransferOwnership(activeList.id, member.user_id)
                    }
                  >
                    Tornar owner
                  </button>
                </div>
              ))}
            </div>
            {activeList.role !== "owner" && (
              <div style={{ marginTop: "0.55rem", display: "flex", justifyContent: "flex-end" }}>
                <button
                  className="btn"
                  style={{
                    padding: "0.35rem 0.6rem",
                    background: "rgba(239,68,68,0.16)",
                    boxShadow: "none",
                    color: "#fca5a5",
                  }}
                  onClick={() => actions.handleLeaveList(activeList.id, sessionUserId!)}
                >
                  Sair da lista
                </button>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
