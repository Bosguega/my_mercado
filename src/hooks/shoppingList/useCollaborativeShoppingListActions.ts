import { useState } from "react";
import { toast } from "react-hot-toast";
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
export function useCollaborativeShoppingListActions(sessionUserId: string | null | undefined) {
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
      toast.success("Lista colaborativa criada!");
      return created;
    } catch {
      toast.error("Nao foi possivel criar a lista colaborativa.");
      return null;
    }
  };

  const handleJoinByCode = async (code: string) => {
    try {
      const joined = await joinCollaborativeList.mutateAsync(code);
      toast.success("Lista colaborativa conectada!");
      return joined;
    } catch {
      toast.error("Codigo invalido ou sem permissao para entrar na lista.");
      return null;
    }
  };

  const handleRenameList = async (listId: string, currentName: string) => {
    const rawName = window.prompt("Novo nome da lista:", currentName);
    if (rawName === null) return false;

    try {
      await renameCollaborativeList.mutateAsync({ listId, name: rawName });
      toast.success("Lista renomeada!");
      return true;
    } catch {
      toast.error("Nao foi possivel renomear a lista colaborativa.");
      return false;
    }
  };

  const handleDeleteList = async (listId: string) => {
    try {
      await deleteCollaborativeList.mutateAsync(listId);
      toast.success("Lista colaborativa excluida!");
      return true;
    } catch {
      toast.error("Nao foi possivel excluir a lista colaborativa.");
      return false;
    }
  };

  const handleAddItem = async (listId: string, name: string, quantity?: string) => {
    try {
      await addCollaborativeItem.mutateAsync({ listId, name, quantity });
      toast.success("Item adicionado na lista colaborativa.");
      return true;
    } catch {
      toast.error("Nao foi possivel adicionar item na lista colaborativa.");
      return false;
    }
  };

  const handleToggleItem = async (listId: string, itemId: string, nextChecked: boolean) => {
    await toggleCollaborativeItem.mutateAsync({ listId, itemId, nextChecked });
  };

  const handleRemoveItem = async (listId: string, itemId: string) => {
    await removeCollaborativeItem.mutateAsync({ listId, itemId });
  };

  const handleClearChecked = async (listId: string) => {
    await clearCollaborativeItems.mutateAsync({ listId, onlyChecked: true });
    toast.success("Itens comprados removidos!");
  };

  const handleClearAll = async (listId: string) => {
    await clearCollaborativeItems.mutateAsync({ listId, onlyChecked: false });
    toast.success("Lista limpa!");
  };

  const handleCopyShareCode = async (shareCode: string) => {
    try {
      await navigator.clipboard.writeText(shareCode);
      toast.success("Codigo copiado!");
      return true;
    } catch {
      toast.error("Nao foi possivel copiar o codigo.");
      return false;
    }
  };

  const handleRegenerateCode = async (listId: string) => {
    try {
      const newCode = await regenerateCollaborativeCode.mutateAsync(listId);
      await navigator.clipboard.writeText(newCode);
      toast.success("Novo codigo gerado e copiado!");
      return newCode;
    } catch {
      toast.error("Nao foi possivel gerar novo codigo.");
      return null;
    }
  };

  const handleChangeMemberRole = async (listId: string, userId: string, nextRole: "editor" | "viewer") => {
    try {
      await updateCollaborativeMemberRole.mutateAsync({ listId, userId, role: nextRole });
      toast.success("Permissao atualizada.");
      return true;
    } catch {
      toast.error("Nao foi possivel atualizar permissao.");
      return false;
    }
  };

  const handleRemoveMember = async (listId: string, userId: string) => {
    try {
      await removeCollaborativeMember.mutateAsync({ listId, userId });
      toast.success("Membro removido da lista.");
      return true;
    } catch {
      toast.error("Nao foi possivel remover membro.");
      return false;
    }
  };

  const handleLeaveList = async (listId: string, userId: string) => {
    try {
      await removeCollaborativeMember.mutateAsync({ listId, userId });
      toast.success("Voce saiu da lista colaborativa.");
      return true;
    } catch {
      toast.error("Nao foi possivel sair da lista.");
      return false;
    }
  };

  const handleTransferOwnership = async (listId: string, newOwnerUserId: string) => {
    try {
      await transferCollaborativeOwnership.mutateAsync({ listId, newOwnerUserId });
      toast.success("Ownership transferido com sucesso.");
      return true;
    } catch {
      toast.error("Nao foi possivel transferir ownership.");
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
