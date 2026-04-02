import { useState } from "react";
import { notify } from "../../utils/notifications";
import {
  useCreateCollaborativeList,
  useJoinCollaborativeListByCode,
  useRenameCollaborativeList,
  useDeleteCollaborativeList,
  useRegenerateCollaborativeListCode,
  useAddCollaborativeListItem,
  useRemoveCollaborativeListItem,
  useToggleCollaborativeListItem,
  useClearCollaborativeListItems,
  useUpdateCollaborativeListMemberRole,
  useRemoveCollaborativeListMember,
  useTransferCollaborativeListOwnership,
} from "../queries/useCollaborativeShoppingListsQuery";
import type { ConfirmDialogConfig } from "../../types/ui";

/**
 * Hook para ações de lista de compras colaborativa
 * Gerencia operações CRUD e membros em listas colaborativas
 */
export function useCollaborativeShoppingListActions(_sessionUserId: string | null | undefined) {
  const [confirmDialog, setConfirmDialog] = useState<ConfirmDialogConfig | null>(null);

  const createCollaborativeList = useCreateCollaborativeList();
  const joinCollaborativeList = useJoinCollaborativeListByCode();
  const renameCollaborativeList = useRenameCollaborativeList();
  const deleteCollaborativeList = useDeleteCollaborativeList();
  const regenerateCollaborativeCode = useRegenerateCollaborativeListCode();
  const addCollaborativeItem = useAddCollaborativeListItem();
  const removeCollaborativeItem = useRemoveCollaborativeListItem();
  const toggleCollaborativeItem = useToggleCollaborativeListItem();
  const clearCollaborativeItems = useClearCollaborativeListItems();
  const updateCollaborativeMemberRole = useUpdateCollaborativeListMemberRole();
  const removeCollaborativeMember = useRemoveCollaborativeListMember();
  const transferCollaborativeOwnership = useTransferCollaborativeListOwnership();

  const handleCreateList = async (name: string) => {
    try {
      const created = await createCollaborativeList.mutateAsync(name);
      notify.success("Lista colaborativa criada!");
      return created;
    } catch {
      notify.error("Não foi possível criar a lista colaborativa.");
      return null;
    }
  };

  const handleJoinByCode = async (code: string) => {
    try {
      const joined = await joinCollaborativeList.mutateAsync(code);
      notify.success("Lista colaborativa conectada!");
      return joined;
    } catch {
      notify.error("Código inválido ou sem permissão para entrar na lista.");
      return null;
    }
  };

  const handleRenameList = async (listId: string, currentName: string) => {
    const rawName = window.prompt("Novo nome da lista:", currentName);
    if (rawName === null) return false;

    try {
      await renameCollaborativeList.mutateAsync({ listId, name: rawName });
      notify.success("Lista renomeada!");
      return true;
    } catch {
      notify.error("Não foi possível renomear a lista colaborativa.");
      return false;
    }
  };

  const handleDeleteList = async (listId: string) => {
    try {
      await deleteCollaborativeList.mutateAsync(listId);
      notify.deleted();
      return true;
    } catch {
      notify.error("Não foi possível excluir a lista colaborativa.");
      return false;
    }
  };

  const handleAddItem = async (listId: string, name: string, quantity?: string) => {
    try {
      await addCollaborativeItem.mutateAsync({ listId, name, quantity });
      notify.itemAdded();
      return true;
    } catch {
      notify.error("Não foi possível adicionar item na lista colaborativa.");
      return false;
    }
  };

  const handleToggleItem = async (listId: string, itemId: string, nextChecked: boolean) => {
    await toggleCollaborativeItem.mutateAsync({ listId, itemId, nextChecked });
  };

  const handleRemoveItem = async (listId: string, itemId: string) => {
    await removeCollaborativeItem.mutateAsync({ listId, itemId });
    notify.deleted();
  };

  const handleClearChecked = async (listId: string) => {
    await clearCollaborativeItems.mutateAsync({ listId, onlyChecked: true });
    notify.success("Itens comprados removidos!");
  };

  const handleClearAll = async (listId: string) => {
    await clearCollaborativeItems.mutateAsync({ listId, onlyChecked: false });
    notify.success("Lista limpa!");
  };

  const handleCopyShareCode = async (shareCode: string) => {
    try {
      await navigator.clipboard.writeText(shareCode);
      notify.success("Código copiado!");
      return true;
    } catch {
      notify.error("Não foi possível copiar o código.");
      return false;
    }
  };

  const handleRegenerateCode = async (listId: string) => {
    try {
      const newCode = await regenerateCollaborativeCode.mutateAsync(listId);
      await navigator.clipboard.writeText(newCode);
      notify.success("Novo código gerado e copiado!");
      return newCode;
    } catch {
      notify.error("Não foi possível gerar novo código.");
      return null;
    }
  };

  const handleChangeMemberRole = async (listId: string, userId: string, nextRole: "editor" | "viewer") => {
    try {
      await updateCollaborativeMemberRole.mutateAsync({ listId, userId, role: nextRole });
      notify.success("Permissão atualizada.");
      return true;
    } catch {
      notify.error("Não foi possível atualizar permissão.");
      return false;
    }
  };

  const handleRemoveMember = async (listId: string, userId: string) => {
    try {
      await removeCollaborativeMember.mutateAsync({ listId, userId });
      notify.success("Membro removido da lista.");
      return true;
    } catch {
      notify.error("Não foi possível remover membro.");
      return false;
    }
  };

  const handleLeaveList = async (listId: string, userId: string) => {
    try {
      await removeCollaborativeMember.mutateAsync({ listId, userId });
      notify.success("Você saiu da lista colaborativa.");
      return true;
    } catch {
      notify.error("Não foi possível sair da lista.");
      return false;
    }
  };

  const handleTransferOwnership = async (listId: string, newOwnerUserId: string) => {
    try {
      await transferCollaborativeOwnership.mutateAsync({ listId, newOwnerUserId });
      notify.success("Ownership transferido com sucesso.");
      return true;
    } catch {
      notify.error("Não foi possível transferir ownership.");
      return false;
    }
  };

  const confirmDeleteList = (listId: string, listName: string) => {
    setConfirmDialog({
      title: "Excluir lista colaborativa?",
      message: `A lista "${listName}" e seus itens serao removidos.`,
      confirmText: "Excluir lista",
      danger: true,
      onConfirm: async () => {
        await handleDeleteList(listId);
      },
    });
  };

  const confirmClearChecked = (listId: string) => {
    setConfirmDialog({
      title: "Limpar itens marcados?",
      message: "Todos os itens ja marcados como comprados serao removidos da lista.",
      confirmText: "Limpar marcados",
      danger: true,
      onConfirm: async () => {
        await handleClearChecked(listId);
      },
    });
  };

  const confirmClearAll = (listId: string) => {
    setConfirmDialog({
      title: "Limpar lista completa?",
      message: "Essa acao remove todos os itens da lista atual e nao pode ser desfeita.",
      confirmText: "Limpar lista",
      danger: true,
      onConfirm: async () => {
        await handleClearAll(listId);
      },
    });
  };

  const confirmTransferOwnership = (listId: string, targetUserId: string) => {
    setConfirmDialog({
      title: "Transferir ownership?",
      message: "Voce deixara de ser owner e passara a ser editor nesta lista.",
      confirmText: "Transferir",
      danger: false,
      onConfirm: async () => {
        await handleTransferOwnership(listId, targetUserId);
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
    handleJoinByCode,
    handleRenameList,
    handleDeleteList,
    handleAddItem,
    handleToggleItem,
    handleRemoveItem,
    handleClearChecked,
    handleClearAll,
    handleCopyShareCode,
    handleRegenerateCode,
    handleChangeMemberRole,
    handleRemoveMember,
    handleLeaveList,
    handleTransferOwnership,
    confirmDeleteList,
    confirmClearChecked,
    confirmClearAll,
    confirmTransferOwnership,
    closeConfirm,
  };
}
