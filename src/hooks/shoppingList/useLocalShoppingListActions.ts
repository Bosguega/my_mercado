import { useState } from "react";
import { toast } from "react-hot-toast";
import { useShoppingListStore } from "../../stores/useShoppingListStore";
import type { ConfirmDialogConfig } from "../../types/ui";

/**
 * Hook para ações de lista de compras local
 * Gerencia operações CRUD em listas locais
 */
export function useLocalShoppingListActions(sessionUserId: string | null | undefined) {
  const [confirmDialog, setConfirmDialog] = useState<ConfirmDialogConfig | null>(null);

  const createList = useShoppingListStore((state) => state.createList);
  const renameList = useShoppingListStore((state) => state.renameList);
  const deleteList = useShoppingListStore((state) => state.deleteList);
  const addItem = useShoppingListStore((state) => state.addItem);
  const toggleChecked = useShoppingListStore((state) => state.toggleChecked);
  const removeItem = useShoppingListStore((state) => state.removeItem);
  const clearChecked = useShoppingListStore((state) => state.clearChecked);
  const clearAll = useShoppingListStore((state) => state.clearAll);
  const moveItemToList = useShoppingListStore((state) => state.moveItemToList);
  const copyItemToList = useShoppingListStore((state) => state.copyItemToList);

  const handleCreateList = (name: string) => {
    const result = createList(sessionUserId, name);
    if (!result.ok) {
      if (result.reason === "duplicate") {
        toast.error("Ja existe uma lista com esse nome.");
      } else {
        toast.error("Informe um nome valido para a lista.");
      }
      return false;
    }
    toast.success("Lista criada!");
    return true;
  };

  const handleRenameList = (listId: string, currentName: string) => {
    const rawName = window.prompt("Novo nome da lista:", currentName);
    if (rawName === null) return false;
    
    const result = renameList(sessionUserId, listId, rawName);
    if (!result.ok) {
      if (result.reason === "duplicate") {
        toast.error("Ja existe uma lista com esse nome.");
      } else {
        toast.error("Nao foi possivel renomear a lista.");
      }
      return false;
    }
    toast.success("Lista renomeada!");
    return true;
  };

  const handleDeleteList = (listId: string, listName: string, listsCount: number) => {
    if (listsCount <= 1) {
      toast.error("Nao e possivel excluir a ultima lista.");
      return false;
    }

    const result = deleteList(sessionUserId, listId);
    if (!result.ok) {
      toast.error("Nao foi possivel excluir a lista.");
      return false;
    }
    toast.success("Lista excluida!");
    return true;
  };

  const handleAddItem = (name: string, quantity?: string) => {
    const result = addItem(sessionUserId, name, quantity);
    if (!result.ok) {
      if (result.reason === "duplicate") {
        toast.error("Esse item ja esta pendente na lista.");
      } else {
        toast.error("Digite o nome do item para adicionar.");
      }
      return false;
    }
    toast.success("Item adicionado na lista.");
    return true;
  };

  const handleToggleItem = (itemId: string) => {
    toggleChecked(sessionUserId, itemId);
  };

  const handleRemoveItem = (itemId: string) => {
    removeItem(sessionUserId, itemId);
  };

  const handleClearChecked = () => {
    clearChecked(sessionUserId);
    toast.success("Itens comprados removidos!");
  };

  const handleClearAll = () => {
    clearAll(sessionUserId);
    toast.success("Lista limpa!");
  };

  const handleMoveItem = (itemId: string, targetListId: string, sourceListId: string) => {
    const result = moveItemToList(sessionUserId, itemId, targetListId, sourceListId);
    if (!result.ok) {
      if (result.reason === "duplicate") {
        toast.error("Ja existe item pendente equivalente na lista destino.");
      } else if (result.reason === "same_list") {
        toast.error("Selecione uma lista de destino diferente.");
      } else {
        toast.error("Nao foi possivel mover o item.");
      }
      return false;
    }
    return true;
  };

  const handleCopyItem = (itemId: string, targetListId: string, sourceListId: string) => {
    const result = copyItemToList(sessionUserId, itemId, targetListId, sourceListId);
    if (!result.ok) {
      if (result.reason === "duplicate") {
        toast.error("Ja existe item pendente equivalente na lista destino.");
      } else if (result.reason === "same_list") {
        toast.error("Selecione uma lista de destino diferente.");
      } else {
        toast.error("Nao foi possivel copiar o item.");
      }
      return false;
    }
    return true;
  };

  const confirmClearChecked = (onConfirm: () => void) => {
    setConfirmDialog({
      title: "Limpar itens marcados?",
      message: "Todos os itens ja marcados como comprados serao removidos da lista.",
      confirmText: "Limpar marcados",
      danger: true,
      onConfirm: () => {
        onConfirm();
        toast.success("Itens comprados removidos!");
      },
    });
  };

  const confirmClearAll = (onConfirm: () => void) => {
    setConfirmDialog({
      title: "Limpar lista completa?",
      message: "Essa acao remove todos os itens da lista atual e nao pode ser desfeita.",
      confirmText: "Limpar lista",
      danger: true,
      onConfirm: () => {
        onConfirm();
        toast.success("Lista limpa!");
      },
    });
  };

  const confirmDeleteList = (listId: string, listName: string, listsCount: number) => {
    setConfirmDialog({
      title: "Excluir lista?",
      message:
        listsCount <= 1
          ? "Voce precisa ter pelo menos uma lista."
          : `A lista "${listName}" e seus itens serao removidos.`,
      confirmText: "Excluir lista",
      danger: true,
      onConfirm: () => {
        handleDeleteList(listId, listName, listsCount);
      },
    });
  };

  const closeConfirm = () => {
    confirmDialog?.onCancel?.();
    setConfirmDialog(null);
  };

  return {
    confirmDialog,
    handleCreateList,
    handleRenameList,
    handleDeleteList,
    handleAddItem,
    handleToggleItem,
    handleRemoveItem,
    handleClearChecked,
    handleClearAll,
    handleMoveItem,
    handleCopyItem,
    confirmClearChecked,
    confirmClearAll,
    confirmDeleteList,
    closeConfirm,
  };
}
