/**
 * Sistema de notificações centralizado
 * Padroniza mensagens de feedback para o usuário
 */

import { toast } from "react-hot-toast";
import { errorMessages, formatErrorMessage } from "./errorMessages";

// Durações padronizadas em milissegundos
const TOAST_DURATION = {
    SHORT: 3000,
    MEDIUM: 5000,
    LONG: 8000,
    VERY_LONG: 15000,
} as const;

// Opções padronizadas para toasts
const TOAST_STYLES = {
    success: {
        style: {
            background: "rgba(16, 185, 129, 0.95)",
            color: "#fff",
            borderRadius: "12px",
        },
        icon: "✅",
    },
    error: {
        style: {
            background: "rgba(239, 68, 68, 0.95)",
            color: "#fff",
            borderRadius: "12px",
        },
        icon: "❌",
    },
    warning: {
        style: {
            background: "rgba(245, 158, 11, 0.95)",
            color: "#fff",
            borderRadius: "12px",
        },
        icon: "⚠️",
    },
    info: {
        style: {
            background: "rgba(59, 130, 246, 0.95)",
            color: "#fff",
            borderRadius: "12px",
        },
        icon: "ℹ️",
    },
};

export const notify = {
    // =========================
    // Notificações de Sucesso
    // =========================

    /**
     * Notificação genérica de sucesso
     * @param message - Mensagem personalizada
     */
    success: (message: string) => toast.success(message, {
        duration: TOAST_DURATION.MEDIUM,
        ...TOAST_STYLES.success,
    }),

    /**
     * Item salvo com sucesso
     */
    saved: () => toast.success("Salvo com sucesso!", {
        duration: TOAST_DURATION.SHORT,
        ...TOAST_STYLES.success,
    }),

    /**
     * Item atualizado com sucesso
     */
    updated: () => toast.success("Atualizado com sucesso!", {
        duration: TOAST_DURATION.SHORT,
        ...TOAST_STYLES.success,
    }),

    /**
     * Item removido com sucesso
     */
    deleted: () => toast.success("Removido com sucesso!", {
        duration: TOAST_DURATION.SHORT,
        ...TOAST_STYLES.success,
    }),

    // =========================
    // Notificações de Erro
    // =========================

    /**
     * Notificação genérica de erro
     * @param message - Mensagem personalizada
     * @param duration - Duração customizada (padrão: MEDIUM)
     */
    error: (message: string, duration?: number) => toast.error(message, {
        duration: duration || TOAST_DURATION.MEDIUM,
        ...TOAST_STYLES.error,
    }),

    /**
     * Erro específico por chave
     * @param key - Chave da mensagem em errorMessages
     * @param params - Parâmetros para formatar a mensagem
     */
    errorByKey: (key: keyof typeof errorMessages, params?: Record<string, string | number>) => {
        const message = formatErrorMessage(errorMessages[key], params);
        toast.error(message, {
            duration: TOAST_DURATION.MEDIUM,
            ...TOAST_STYLES.error,
        });
    },

    /**
     * Erro ao salvar
     */
    errorSaving: () => notify.error(errorMessages.SAVE_FAILED),

    /**
     * Erro ao carregar dados
     */
    errorLoading: () => notify.error(errorMessages.LOAD_FAILED),

    /**
     * Erro de conexão
     */
    errorConnection: () => notify.error(errorMessages.CONNECTION_ERROR, TOAST_DURATION.LONG),

    // =========================
    // Notificações de Aviso
    // =========================

    /**
     * Notificação genérica de aviso
     * @param message - Mensagem personalizada
     */
    warning: (message: string) => toast(message, {
        duration: TOAST_DURATION.MEDIUM,
        ...TOAST_STYLES.warning,
    }),

    /**
     * Item já existe
     */
    alreadyExists: () => notify.warning(errorMessages.ITEM_ALREADY_EXISTS),

    /**
     * Nenhum item encontrado
     */
    noItemsFound: () => notify.warning(errorMessages.NOT_FOUND),

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
    // Notificações Específicas - Scanner
    // =========================

    /**
     * QR Code inválido
     */
    qrCodeInvalid: () => notify.error(errorMessages.QR_CODE_INVALID),

    /**
     * Erro ao processar QR Code
     */
    qrCodeProcessing: () => notify.error(errorMessages.QR_CODE_PROCESSING),

    /**
     * NFC-e não encontrada ou com erro
     */
    nfceNotFound: () => notify.error(errorMessages.NFC_E_NOT_FOUND, TOAST_DURATION.VERY_LONG),

    /**
     * Nota duplicada
     * @param date - Data da nota original
     */
    nfceDuplicate: (date: string) => {
        const message = formatErrorMessage(errorMessages.NFC_E_DUPLICATE, { date });
        notify.warning(message);
    },

    // =========================
    // Notificações Específicas - Shopping List
    // =========================

    /**
     * Item adicionado
     */
    itemAdded: () => notify.success(errorMessages.ITEM_ADD_FAILED.replace("Não foi possível", "Item")),

    /**
     * Lista criada
     */
    listCreated: () => notify.success("Lista criada!"),

    /**
     * Erro ao criar lista
     */
    listCreateFailed: () => notify.error(errorMessages.LIST_CREATE_FAILED),

    // =========================
    // Notificações Específicas - IA
    // =========================

    /**
     * IA não configurada
     */
    aiNotConfigured: () => notify.error(errorMessages.AI_NOT_CONFIGURED, TOAST_DURATION.LONG),

    /**
     * Erro de conexão com IA
     */
    aiConnectionFailed: () => notify.error(errorMessages.AI_CONNECTION_FAILED, TOAST_DURATION.LONG),

    // =========================
    // Notificações Específicas - Settings
    // =========================

    /**
     * Configurações salvas
     */
    settingsSaved: () => notify.success("Configurações salvas!"),

    /**
     * Sessão encerrada
     */
    sessionEnded: () => notify.success("Sessão encerrada."),
};