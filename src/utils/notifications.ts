/**
 * Sistema de notificações centralizado
 * Padroniza mensagens de feedback para o usuário
 */

import { toast } from "react-hot-toast";

export const notify = {
    // =========================
    // Notificações de Sucesso
    // =========================

    /**
     * Notificação genérica de sucesso
     * @param message - Mensagem personalizada
     */
    success: (message: string) => toast.success(message),

    /**
     * Item salvo com sucesso
     */
    saved: () => toast.success("Salvo com sucesso!"),

    /**
     * Item atualizado com sucesso
     */
    updated: () => toast.success("Atualizado com sucesso!"),

    /**
     * Item removido com sucesso
     */
    deleted: () => toast.success("Removido com sucesso!"),

    /**
     * Backup criado com sucesso
     * @param count - Número de itens no backup
     */
    backupCreated: (count: number) =>
        toast.success(`Backup criado com ${count} itens!`),

    /**
     * Backup restaurado com sucesso
     * @param count - Número de itens restaurados
     */
    backupRestored: (count: number) =>
        toast.success(`Backup restaurado com ${count} itens!`),

    /**
     * Exportação concluída
     * @param count - Número de itens exportados
     */
    exported: (count: number) =>
        toast.success(`Exportado com ${count} itens!`),

    // =========================
    // Notificações de Erro
    // =========================

    /**
     * Notificação genérica de erro
     * @param message - Mensagem personalizada
     */
    error: (message: string) => toast.error(message),

    /**
     * Erro ao salvar
     */
    errorSaving: () => toast.error("Erro ao salvar."),

    /**
     * Erro ao atualizar
     */
    errorUpdating: () => toast.error("Erro ao atualizar."),

    /**
     * Erro ao deletar
     */
    errorDeleting: () => toast.error("Erro ao remover."),

    /**
     * Erro ao carregar dados
     */
    errorLoading: () => toast.error("Erro ao carregar dados."),

    /**
     * Erro de conexão
     */
    errorConnection: () => toast.error("Erro de conexão. Tente novamente."),

    /**
     * Erro de validação
     * @param field - Nome do campo com erro
     */
    errorValidation: (field: string) =>
        toast.error(`${field} é obrigatório.`),

    // =========================
    // Notificações de Aviso
    // =========================

    /**
     * Notificação genérica de aviso
     * @param message - Mensagem personalizada
     */
    warning: (message: string) => toast(message, { icon: "⚠️" }),

    /**
     * Item já existe
     */
    alreadyExists: () => toast("Este item já existe.", { icon: "⚠️" }),

    /**
     * Nenhum item encontrado
     */
    noItemsFound: () => toast("Nenhum item encontrado.", { icon: "⚠️" }),

    // =========================
    // Notificações de Loading
    // =========================

    /**
     * Notificação de loading
     * @param message - Mensagem de loading
     * @returns ID do toast para dismiss
     */
    loading: (message: string) => toast.loading(message),

    /**
     * Remove notificação de loading
     * @param toastId - ID do toast a ser removido
     */
    dismiss: (toastId: string) => toast.dismiss(toastId),

    // =========================
    // Notificações Específicas
    // =========================

    /**
     * Item adicionado
     */
    itemAdded: () => toast.success("Item adicionado!"),

    /**
     * Configurações salvas
     */
    settingsSaved: () => toast.success("Configurações salvas!"),

    /**
     * Sessão encerrada
     */
    sessionEnded: () => toast.success("Sessão encerrada."),

    /**
     * Dados sincronizados
     */
    dataSynced: () => toast.success("Dados sincronizados!"),

    /**
     * Cache limpo
     */
    cacheCleared: () => toast.success("Cache limpo com sucesso!"),
};