/**
 * Logger centralizado para a aplicação
 * Em produção, logs são desabilitados para melhor performance
 * Em desenvolvimento, logs são exibidos no console
 */

const isDev = import.meta.env.DEV;

export const logger = {
    /**
     * Log de erro - sempre visível em desenvolvimento
     * @param context - Contexto do erro (ex: "saveReceipt", "loadDictionary")
     * @param message - Mensagem de erro
     * @param error - Erro capturado
     */
    error: (context: string, message: string, error?: unknown) => {
        if (isDev) {
            console.error(`[${context}] ${message}`, error);
        }
    },

    /**
     * Log de warning - sempre visível em desenvolvimento
     * @param context - Contexto do warning
     * @param message - Mensagem de warning
     * @param data - Dados adicionais opcionais
     */
    warn: (context: string, message: string, data?: unknown) => {
        if (isDev) {
            if (data !== undefined) {
                console.warn(`[${context}] ${message}`, data);
            } else {
                console.warn(`[${context}] ${message}`);
            }
        }
    },

    /**
     * Log de informação - apenas em desenvolvimento
     * @param context - Contexto da informação
     * @param message - Mensagem informativa
     * @param data - Dados adicionais opcionais
     */
    info: (context: string, message: string, data?: unknown) => {
        if (isDev) {
            if (data !== undefined) {
                console.log(`[${context}] ${message}`, data);
            } else {
                console.log(`[${context}] ${message}`);
            }
        }
    },

    /**
     * Log de debug - apenas em desenvolvimento
     * @param context - Contexto do debug
     * @param message - Mensagem de debug
     * @param data - Dados adicionais opcionais
     */
    debug: (context: string, message: string, data?: unknown) => {
        if (isDev) {
            if (data !== undefined) {
                console.debug(`[${context}] ${message}`, data);
            } else {
                console.debug(`[${context}] ${message}`);
            }
        }
    },
};