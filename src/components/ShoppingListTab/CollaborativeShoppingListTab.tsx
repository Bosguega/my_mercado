import { ListChecks, Plus } from "lucide-react";
import { ShoppingListItem } from "../ShoppingListItem";
import ConfirmDialog from "../ConfirmDialog";
import InputDialog from "../InputDialog";
import { CollaborativeAuthRequired } from "./collaborative/CollaborativeAuthRequired";
import { CollaborativeHeader } from "./collaborative/CollaborativeHeader";
import { CollaborativeManagementCard } from "./collaborative/CollaborativeManagementCard";
import { useCollaborativeTabController } from "./collaborative/useCollaborativeTabController";

interface CollaborativeShoppingListTabProps {
  onSwitchToLocal?: () => void;
}

/**
 * Componente de Lista de Compras Colaborativa
 * Gerencia listas de compras compartilhadas em tempo real
 */
export function CollaborativeShoppingListTab({ onSwitchToLocal }: CollaborativeShoppingListTabProps) {
  const {
    sessionUserId,
    isAuthenticated,
    activeList,
    setActiveListId,
    collaborativeLists,
    collaborativeItems,
    collaborativeMembers,
    orderedItems,
    itemName,
    setItemName,
    itemQty,
    setItemQty,
    collabInputDialog,
    setCollabInputDialog,
    actions,
    checkedCount,
    pendingCount,
    handleAddItem,
    handleCreateList,
    handleRenameList,
    handleJoinByCode,
    handleConfirmCollabInput,
  } = useCollaborativeTabController();

  if (!isAuthenticated) {
    return <CollaborativeAuthRequired />;
  }

  return (
    <div>
      <CollaborativeHeader
        pendingCount={pendingCount}
        totalCount={collaborativeItems.length}
        checkedCount={checkedCount}
        onClearChecked={() => activeList && actions.confirmClearChecked(activeList.id)}
        onClearAll={() => activeList && actions.confirmClearAll(activeList.id)}
      />

      <CollaborativeManagementCard
        onSwitchToLocal={onSwitchToLocal}
        activeList={activeList}
        collaborativeLists={collaborativeLists}
        collaborativeMembers={collaborativeMembers}
        sessionUserId={sessionUserId}
        setActiveListId={setActiveListId}
        onCreateList={handleCreateList}
        onRenameList={handleRenameList}
        onJoinByCode={handleJoinByCode}
        actions={actions}
      />

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
