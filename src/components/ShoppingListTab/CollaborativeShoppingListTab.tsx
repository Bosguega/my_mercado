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
import InputDialog from "../InputDialog";
import type { ShoppingListItem as ShoppingListItemType } from "../../types/ui";
import type { CollaborativeShoppingListItem } from "../../types/domain";

// eslint-disable-next-line @typescript-eslint/no-unused-vars
const EMPTY_SHOPPING_ITEMS: ShoppingListItemType[] = [];

interface CollaborativeShoppingListTabProps {
  onSwitchToLocal?: () => void;
}
type CollabInputDialogState =
  | { mode: "create"; initialValue: string }
  | { mode: "rename"; initialValue: string }
  | { mode: "join"; initialValue: string }
  | null;

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

  const collaborativeListsQuery = useCollaborativeListsQuery(isAuthenticated);
  const collaborativeLists = useMemo(
    () => collaborativeListsQuery.data || [],
    [collaborativeListsQuery.data]
  );

  const activeList = useMemo(
    () =>
      collaborativeLists.find((entry) => entry.id === activeListId) ||
      collaborativeLists[0] ||
      null,
    [activeListId, collaborativeLists],
  );

  const collaborativeItemsQuery = useCollaborativeListItemsQuery(
    activeList?.id || null,
    isAuthenticated,
  );
  const collaborativeMembersQuery = useCollaborativeListMembersQuery(
    activeList?.id || null,
    isAuthenticated,
  );
  useCollaborativeListRealtime(activeList?.id || null, isAuthenticated);

  const collaborativeItems = useMemo(
    () => (collaborativeItemsQuery.data || []).map(toUiItem),
    [collaborativeItemsQuery.data],
  );

  const collaborativeMembers = collaborativeMembersQuery.data || [];
  const orderedItems = useSortedShoppingItems(collaborativeItems);

  const [itemName, setItemName] = useState("");
  const [itemQty, setItemQty] = useState("");
  const [collabInputDialog, setCollabInputDialog] = useState<CollabInputDialogState>(null);

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
    setCollabInputDialog({ mode: "create", initialValue: "" });
  };

  const handleRenameList = async () => {
    if (!activeList) return;
    setCollabInputDialog({ mode: "rename", initialValue: activeList.name });
  };

  const handleJoinByCode = async () => {
    setCollabInputDialog({ mode: "join", initialValue: "" });
  };

  const handleConfirmCollabInput = async (rawValue: string) => {
    const trimmed = rawValue.trim();
    if (!trimmed) return;

    if (collabInputDialog?.mode === "create") {
      const created = await actions.handleCreateList(trimmed);
      if (created) {
        setActiveListId(created.id);
        setCollabInputDialog(null);
      }
      return;
    }

    if (collabInputDialog?.mode === "rename" && activeList) {
      const success = await actions.handleRenameList(activeList.id, trimmed);
      if (success) setCollabInputDialog(null);
      return;
    }

    if (collabInputDialog?.mode === "join") {
      const joined = await actions.handleJoinByCode(trimmed);
      if (joined) {
        setActiveListId(joined.id);
        setCollabInputDialog(null);
      }
    }
  };

  const checkedCount = collaborativeItems.filter((item) => item.checked).length;
  const pendingCount = collaborativeItems.length - checkedCount;

  if (!isAuthenticated) {
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

  return (
    <div>
      <div className="shopping-section-header">
        <div>
          <h2 className="section-title" style={{ marginBottom: "0.2rem" }}>
            <Users size={20} color="var(--primary)" />
            Lista de Compras Colaborativa
          </h2>
          <p style={{ color: "#64748b", fontSize: "0.8rem", marginLeft: "1.8rem" }}>
            {pendingCount} pendente(s) de {collaborativeItems.length}
          </p>
        </div>

        <div className="shopping-icon-actions">
          <button
            className="btn"
            style={{
              padding: "0.45rem 0.6rem",
              background: "rgba(245, 158, 11, 0.15)",
              boxShadow: "none",
              color: "#f59e0b",
            }}
            title="Limpar marcados"
            aria-label="Limpar itens marcados"
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
            aria-label="Limpar lista"
            onClick={() => activeList && actions.confirmClearAll(activeList.id)}
            disabled={collaborativeItems.length === 0}
          >
            <Trash2 size={16} />
          </button>
        </div>
      </div>

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
            onClick={handleJoinByCode}
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

      <form className="glass-card" onSubmit={handleAddItem} style={{ marginBottom: "1rem" }}>
        <div className="shopping-add-form-row">
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

      <InputDialog
        isOpen={Boolean(collabInputDialog)}
        title={
          collabInputDialog?.mode === "rename"
            ? "Renomear lista colaborativa"
            : collabInputDialog?.mode === "join"
              ? "Entrar por codigo"
              : "Nova lista colaborativa"
        }
        message={
          collabInputDialog?.mode === "join"
            ? "Informe o codigo de compartilhamento da lista."
            : "Informe um nome para a lista."
        }
        placeholder={collabInputDialog?.mode === "join" ? "Codigo da lista" : "Nome da lista"}
        initialValue={collabInputDialog?.initialValue || ""}
        confirmText={
          collabInputDialog?.mode === "rename"
            ? "Renomear"
            : collabInputDialog?.mode === "join"
              ? "Entrar"
              : "Criar"
        }
        onCancel={() => setCollabInputDialog(null)}
        onConfirm={handleConfirmCollabInput}
      />
    </div>
  );
}
