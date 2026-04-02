import { useMemo, useState } from "react";
import { ListChecks, Plus, Eraser, Trash2, Pencil, KeyRound, RefreshCcw, Users } from "lucide-react";
import { toast } from "react-hot-toast";
import { useReceiptsSessionStore } from "../../stores/useReceiptsSessionStore";
import { useCollaborativeShoppingListActions } from "../../hooks/shoppingList/useCollaborativeShoppingListActions";
import {
  useCollaborativeListsQuery,
  useCollaborativeListItemsQuery,
  useCollaborativeListMembersQuery,
  useCollaborativeListRealtime,
} from "../../hooks/queries/useCollaborativeShoppingListsQuery";
import { useSortedShoppingItems } from "../../hooks/queries/useSortedShoppingItems";
import { ShoppingListItem } from "../ShoppingListItem";
import ConfirmDialog from "../ConfirmDialog";
import type { ShoppingListItem as ShoppingListItemType } from "../../types/ui";
import type { CollaborativeShoppingListItem } from "../../types/domain";

const EMPTY_SHOPPING_ITEMS: ShoppingListItemType[] = [];

interface CollaborativeShoppingListTabProps {
  onSwitchToLocal?: () => void;
}

function toUiItem(item: CollaborativeShoppingListItem): ShoppingListItemType {
  return {
    id: item.id,
    name: item.name,
    normalized_key: item.normalized_key,
    quantity: item.quantity || undefined,
    checked: item.checked,
    created_at: item.created_at,
    checked_at: item.checked_at || undefined,
    checked_by_user_id: item.checked_by_user_id || undefined,
  };
}

/**
 * Componente de Lista de Compras Colaborativa
 * Gerencia listas de compras compartilhadas em tempo real
 */
export function CollaborativeShoppingListTab({ onSwitchToLocal }: CollaborativeShoppingListTabProps) {
  const sessionUserId = useReceiptsSessionStore((state) => state.sessionUserId);
  const isAuthenticated = Boolean(sessionUserId);

  const [activeListId, setActiveListId] = useState<string | null>(null);

  const collaborativeListsQuery = useCollaborativeListsQuery(true);
  const collaborativeLists = collaborativeListsQuery.data || [];

  const activeList = useMemo(
    () =>
      collaborativeLists.find((entry) => entry.id === activeListId) ||
      collaborativeLists[0] ||
      null,
    [activeListId, collaborativeLists],
  );

  const collaborativeItemsQuery = useCollaborativeListItemsQuery(activeList?.id || null, true);
  const collaborativeMembersQuery = useCollaborativeListMembersQuery(activeList?.id || null, true);
  useCollaborativeListRealtime(activeList?.id || null, true);

  const collaborativeItems = useMemo(
    () => (collaborativeItemsQuery.data || []).map(toUiItem),
    [collaborativeItemsQuery.data],
  );

  const collaborativeMembers = collaborativeMembersQuery.data || [];
  const orderedItems = useSortedShoppingItems(collaborativeItems);

  const [itemName, setItemName] = useState("");
  const [itemQty, setItemQty] = useState("");

  const actions = useCollaborativeShoppingListActions(sessionUserId);

  const handleAddItem = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!activeList?.id) {
      toast.error("Crie ou entre em uma lista colaborativa primeiro.");
      return;
    }
    const success = await actions.handleAddItem(activeList.id, itemName, itemQty);
    if (success) {
      setItemName("");
      setItemQty("");
    }
  };

  const handleCreateList = async () => {
    const rawName = window.prompt("Nome da nova lista colaborativa:");
    if (rawName === null) return;
    const created = await actions.handleCreateList(rawName);
    if (created) {
      setActiveListId(created.id);
    }
  };

  const handleRenameList = async () => {
    if (!activeList) return;
    await actions.handleRenameList(activeList.id, activeList.name);
  };

  const handleJoinByCode = async () => {
    const rawCode = window.prompt("Codigo da lista compartilhada:");
    if (rawCode === null) return;
    const joined = await actions.handleJoinByCode(rawCode);
    if (joined) {
      setActiveListId(joined.id);
    }
  };

  const checkedCount = collaborativeItems.filter((item) => item.checked).length;
  const pendingCount = collaborativeItems.length - checkedCount;

  if (!isAuthenticated) {
    return (
      <div>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-start",
            marginBottom: "1rem",
            gap: "1rem",
          }}
        >
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

  return (
    <div>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
          marginBottom: "1rem",
          gap: "1rem",
        }}
      >
        <div>
          <h2 className="section-title" style={{ marginBottom: "0.2rem" }}>
            <Users size={20} color="var(--primary)" />
            Lista de Compras Colaborativa
          </h2>
          <p style={{ color: "#64748b", fontSize: "0.8rem", marginLeft: "1.8rem" }}>
            {pendingCount} pendente(s) de {collaborativeItems.length}
          </p>
        </div>

        <div style={{ display: "flex", gap: "0.5rem" }}>
          <button
            className="btn"
            style={{
              padding: "0.45rem 0.6rem",
              background: "rgba(245, 158, 11, 0.15)",
              boxShadow: "none",
              color: "#f59e0b",
            }}
            title="Limpar marcados"
            onClick={() => activeList && actions.confirmClearChecked(activeList.id)}
            disabled={checkedCount === 0}
          >
            <Eraser size={16} />
          </button>
          <button
            className="btn"
            style={{
              padding: "0.45rem 0.6rem",
              background: "rgba(239, 68, 68, 0.15)",
              boxShadow: "none",
              color: "#ef4444",
            }}
            title="Limpar lista"
            onClick={() => activeList && actions.confirmClearAll(activeList.id)}
            disabled={collaborativeItems.length === 0}
          >
            <Trash2 size={16} />
          </button>
        </div>
      </div>

      <div className="glass-card" style={{ marginBottom: "1rem", padding: "0.75rem" }}>
        <div style={{ display: "flex", gap: "0.5rem", marginBottom: "0.7rem" }}>
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
            onClick={handleJoinByCode}
          >
            <KeyRound size={15} /> Entrar por codigo
          </button>
        </div>

        <div
          style={{
            marginBottom: "0.7rem",
            display: "grid",
            gridTemplateColumns: "1fr auto auto auto",
            gap: "0.5rem",
            alignItems: "center",
          }}
        >
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
          <button className="btn" style={{ padding: "0.5rem 0.7rem" }} onClick={handleCreateList}>
            <Plus size={15} /> Nova
          </button>
          <button
            className="btn"
            style={{ padding: "0.5rem 0.7rem", background: "rgba(255,255,255,0.08)", boxShadow: "none" }}
            onClick={handleRenameList}
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
            onClick={() =>
              activeList && actions.confirmDeleteList(activeList.id, activeList.name)
            }
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
                  <div
                    key={member.user_id}
                    style={{
                      display: "grid",
                      gridTemplateColumns: "1fr auto auto auto",
                      gap: "0.4rem",
                      alignItems: "center",
                    }}
                  >
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

      <form className="glass-card" onSubmit={handleAddItem} style={{ marginBottom: "1rem" }}>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 110px",
            gap: "0.5rem",
            marginBottom: "0.75rem",
          }}
        >
          <input
            className="search-input"
            placeholder="Ex: Arroz, Leite, Cafe..."
            value={itemName}
            onChange={(e) => setItemName(e.target.value)}
          />
          <input
            className="search-input"
            placeholder="Qtd"
            value={itemQty}
            onChange={(e) => setItemQty(e.target.value)}
          />
        </div>

        <button
          className="btn"
          style={{ width: "100%" }}
          type="submit"
          disabled={!activeList?.id}
        >
          <Plus size={18} />
          Adicionar Item
        </button>
      </form>

      <div className="items-list" style={{ gap: "0.85rem" }}>
        {orderedItems.length === 0 ? (
          <div className="glass-card" style={{ textAlign: "center", padding: "3rem 1rem" }}>
            <ListChecks size={44} color="#334155" />
            <h3 style={{ color: "#e2e8f0", marginTop: "0.8rem" }}>Sua lista esta vazia</h3>
            <p style={{ color: "#94a3b8", fontSize: "0.9rem", marginTop: "0.3rem" }}>
              Adicione itens para acompanhar o que falta pegar no mercado.
            </p>
          </div>
        ) : (
          orderedItems.map((item) => (
            <ShoppingListItem
              key={item.id}
              item={item}
              history={[]}
              historyMatchType="none"
              onToggle={() => activeList && actions.handleToggleItem(activeList.id, item.id, !item.checked)}
              onRemove={() => activeList && actions.handleRemoveItem(activeList.id, item.id)}
              currentUserId={sessionUserId}
            />
          ))
        )}
      </div>

      <ConfirmDialog
        isOpen={Boolean(actions.confirmDialog)}
        title={actions.confirmDialog?.title || ""}
        message={actions.confirmDialog?.message || ""}
        confirmText={actions.confirmDialog?.confirmText}
        cancelText={actions.confirmDialog?.cancelText}
        danger={actions.confirmDialog?.danger}
        busy={false}
        onCancel={actions.closeConfirm}
        onConfirm={async () => {
          await actions.confirmDialog?.onConfirm?.();
          actions.closeConfirm();
        }}
      />
    </div>
  );
}
