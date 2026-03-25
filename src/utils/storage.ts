/**
 * Utilitário centralizado para acesso a localStorage e sessionStorage
 * Simplifica operações e reduz erros de parsing
 */

export const storage = {
    // =========================
    // LocalStorage
    // =========================

    local: {
        /**
         * Recupera valor do localStorage com fallback
         * @param key - Chave do storage
         * @param fallback - Valor padrão se não existir
         * @returns Valor recuperado ou fallback
         */
        get: <T>(key: string, fallback: T): T => {
            try {
                const item = localStorage.getItem(key);
                return item ? JSON.parse(item) : fallback;
            } catch {
                return fallback;
            }
        },

        /**
         * Salva valor no localStorage
         * @param key - Chave do storage
         * @param value - Valor a ser salvo
         */
        set: <T>(key: string, value: T): void => {
            try {
                localStorage.setItem(key, JSON.stringify(value));
            } catch (error) {
                console.error(`[storage.local.set] Erro ao salvar ${key}:`, error);
            }
        },

        /**
         * Remove valor do localStorage
         * @param key - Chave do storage
         */
        remove: (key: string): void => {
            try {
                localStorage.removeItem(key);
            } catch (error) {
                console.error(`[storage.local.remove] Erro ao remover ${key}:`, error);
            }
        },

        /**
         * Limpa todo o localStorage
         */
        clear: (): void => {
            try {
                localStorage.clear();
            } catch (error) {
                console.error("[storage.local.clear] Erro ao limpar localStorage:", error);
            }
        },

        /**
         * Verifica se uma chave existe
         * @param key - Chave do storage
         * @returns true se existir
         */
        has: (key: string): boolean => {
            try {
                return localStorage.getItem(key) !== null;
            } catch {
                return false;
            }
        },
    },

    // =========================
    // SessionStorage
    // =========================

    session: {
        /**
         * Recupera valor do sessionStorage
         * @param key - Chave do storage
         * @returns Valor recuperado ou null
         */
        get: (key: string): string | null => {
            try {
                return sessionStorage.getItem(key);
            } catch {
                return null;
            }
        },

        /**
         * Salva valor no sessionStorage
         * @param key - Chave do storage
         * @param value - Valor a ser salvo
         */
        set: (key: string, value: string): void => {
            try {
                sessionStorage.setItem(key, value);
            } catch (error) {
                console.error(`[storage.session.set] Erro ao salvar ${key}:`, error);
            }
        },

        /**
         * Remove valor do sessionStorage
         * @param key - Chave do storage
         */
        remove: (key: string): void => {
            try {
                sessionStorage.removeItem(key);
            } catch (error) {
                console.error(`[storage.session.remove] Erro ao remover ${key}:`, error);
            }
        },

        /**
         * Limpa todo o sessionStorage
         */
        clear: (): void => {
            try {
                sessionStorage.clear();
            } catch (error) {
                console.error("[storage.session.clear] Erro ao limpar sessionStorage:", error);
            }
        },

        /**
         * Verifica se uma chave existe
         * @param key - Chave do storage
         * @returns true se existir
         */
        has: (key: string): boolean => {
            try {
                return sessionStorage.getItem(key) !== null;
            } catch {
                return false;
            }
        },
    },

    // =========================
    // Utilitários Gerais
    // =========================

    /**
     * Migra dados de localStorage para sessionStorage
     * @param key - Chave a ser migrada
     * @returns true se migrou com sucesso
     */
    migrateToSession: (key: string): boolean => {
        try {
            const value = localStorage.getItem(key);
            if (value) {
                sessionStorage.setItem(key, value);
                localStorage.removeItem(key);
                return true;
            }
            return false;
        } catch {
            return false;
        }
    },

    /**
     * Migra dados de sessionStorage para localStorage
     * @param key - Chave a ser migrada
     * @returns true se migrou com sucesso
     */
    migrateToLocal: (key: string): boolean => {
        try {
            const value = sessionStorage.getItem(key);
            if (value) {
                localStorage.setItem(key, value);
                sessionStorage.removeItem(key);
                return true;
            }
            return false;
        } catch {
            return false;
        }
    },
};