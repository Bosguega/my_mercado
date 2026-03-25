/**
 * Utilitário centralizado para validação de formulários
 * Padroniza validações e mensagens de erro
 */

import { notify } from "./notifications";

export const validators = {
    // =========================
    // Validações Básicas
    // =========================

    /**
     * Valida campo obrigatório
     * @param value - Valor a ser validado
     * @param fieldName - Nome do campo para mensagem
     * @returns true se válido
     */
    required: (value: string | undefined | null, fieldName: string): boolean => {
        if (!value?.trim()) {
            notify.errorValidation(fieldName);
            return false;
        }
        return true;
    },

    /**
     * Valida comprimento mínimo
     * @param value - Valor a ser validado
     * @param minLength - Comprimento mínimo
     * @param fieldName - Nome do campo
     * @returns true se válido
     */
    minLength: (value: string, minLength: number, fieldName: string): boolean => {
        if (value.length < minLength) {
            notify.error(`${fieldName} deve ter pelo menos ${minLength} caracteres.`);
            return false;
        }
        return true;
    },

    /**
     * Valida comprimento máximo
     * @param value - Valor a ser validado
     * @param maxLength - Comprimento máximo
     * @param fieldName - Nome do campo
     * @returns true se válido
     */
    maxLength: (value: string, maxLength: number, fieldName: string): boolean => {
        if (value.length > maxLength) {
            notify.error(`${fieldName} deve ter no máximo ${maxLength} caracteres.`);
            return false;
        }
        return true;
    },

    // =========================
    // Validações de Formato
    // =========================

    /**
     * Valida formato de email
     * @param email - Email a ser validado
     * @returns true se válido
     */
    email: (email: string): boolean => {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            notify.error("Email inválido.");
            return false;
        }
        return true;
    },

    /**
     * Valida formato de data (DD/MM/AAAA)
     * @param date - Data a ser validada
     * @returns true se válido
     */
    dateFormat: (date: string): boolean => {
        const dateRegex = /^\d{2}\/\d{2}\/\d{4}$/;
        if (!dateRegex.test(date)) {
            notify.error("Data inválida! Use DD/MM/AAAA");
            return false;
        }
        return true;
    },

    /**
     * Valida formato de URL
     * @param url - URL a ser validada
     * @returns true se válido
     */
    url: (url: string): boolean => {
        try {
            new URL(url);
            return true;
        } catch {
            notify.error("URL inválida.");
            return false;
        }
    },

    // =========================
    // Validações Numéricas
    // =========================

    /**
     * Valida se é um número válido
     * @param value - Valor a ser validado
     * @param fieldName - Nome do campo
     * @returns true se válido
     */
    number: (value: string, fieldName: string): boolean => {
        const num = parseFloat(value.replace(",", "."));
        if (isNaN(num)) {
            notify.error(`${fieldName} deve ser um número válido.`);
            return false;
        }
        return true;
    },

    /**
     * Valida se é um preço válido (positivo)
     * @param value - Valor a ser validado
     * @returns true se válido
     */
    price: (value: string): boolean => {
        const num = parseFloat(value.replace(",", "."));
        if (isNaN(num) || num < 0) {
            notify.error("Preço inválido! Use apenas números positivos.");
            return false;
        }
        return true;
    },

    /**
     * Valida se é uma quantidade válida (positiva)
     * @param value - Valor a ser validado
     * @returns true se válido
     */
    quantity: (value: string): boolean => {
        const num = parseFloat(value.replace(",", "."));
        if (isNaN(num) || num <= 0) {
            notify.error("Quantidade inválida! Use apenas números positivos.");
            return false;
        }
        return true;
    },

    // =========================
    // Validações Compostas
    // =========================

    /**
     * Valida item de formulário manual
     * @param item - Item a ser validado
     * @returns true se válido
     */
    manualItem: (item: { name?: string; unitPrice?: string }): boolean => {
        if (!validators.required(item.name, "Nome do item")) return false;
        if (!validators.required(item.unitPrice, "Preço do item")) return false;
        if (!validators.price(item.unitPrice!)) return false;
        return true;
    },

    /**
     * Valida dados de produto canônico
     * @param product - Produto a ser validado
     * @returns true se válido
     */
    canonicalProduct: (product: { slug?: string; name?: string }): boolean => {
        if (!validators.required(product.slug, "Slug")) return false;
        if (!validators.required(product.name, "Nome")) return false;
        if (!validators.minLength(product.slug!, 2, "Slug")) return false;
        if (!validators.minLength(product.name!, 2, "Nome")) return false;
        return true;
    },

    /**
     * Valida dados de login
     * @param credentials - Credenciais a serem validadas
     * @returns true se válido
     */
    loginCredentials: (credentials: { email?: string; password?: string }): boolean => {
        if (!validators.required(credentials.email, "Email")) return false;
        if (!validators.email(credentials.email!)) return false;
        if (!validators.required(credentials.password, "Senha")) return false;
        if (!validators.minLength(credentials.password!, 6, "Senha")) return false;
        return true;
    },

    // =========================
    // Validações de Arquivo
    // =========================

    /**
     * Valida extensão de arquivo
     * @param fileName - Nome do arquivo
     * @param allowedExtensions - Extensões permitidas
     * @returns true se válido
     */
    fileExtension: (fileName: string, allowedExtensions: string[]): boolean => {
        const extension = fileName.split(".").pop()?.toLowerCase();
        if (!extension || !allowedExtensions.includes(extension)) {
            notify.error(`Arquivo inválido! Selecione um arquivo ${allowedExtensions.join(", ")}.`);
            return false;
        }
        return true;
    },

    /**
     * Valida tamanho de arquivo
     * @param fileSize - Tamanho do arquivo em bytes
     * @param maxSizeInMB - Tamanho máximo em MB
     * @returns true se válido
     */
    fileSize: (fileSize: number, maxSizeInMB: number): boolean => {
        const maxSizeInBytes = maxSizeInMB * 1024 * 1024;
        if (fileSize > maxSizeInBytes) {
            notify.error(`Arquivo muito grande! Tamanho máximo: ${maxSizeInMB}MB.`);
            return false;
        }
        return true;
    },
};