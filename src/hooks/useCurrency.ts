import { useCallback } from "react";

/**
 * Hook para formatação e parsing de valores monetários em BRL
 */
export function useCurrency() {
    /**
     * Formata um número ou string para moeda BRL
     * @param value - Valor numérico ou string
     * @returns String formatada (ex: "R$ 1.234,56")
     */
    const format = useCallback((value: number | string | null | undefined): string => {
        if (value === null || value === undefined) return "R$ 0,00";

        const num = typeof value === "string"
            ? parseFloat(value.replace(",", "."))
            : value;

        if (isNaN(num)) return "R$ 0,00";

        return num.toLocaleString("pt-BR", {
            style: "currency",
            currency: "BRL",
        });
    }, []);

    /**
     * Formata um número para string com 2 casas decimais separadas por vírgula
     * @param value - Valor numérico ou string
     * @returns String formatada (ex: "1234,56")
     */
    const formatDecimal = useCallback((value: number | string | null | undefined): string => {
        if (value === null || value === undefined) return "0,00";

        const num = typeof value === "string"
            ? parseFloat(value.replace(",", "."))
            : value;

        if (isNaN(num)) return "0,00";

        return num.toFixed(2).replace(".", ",");
    }, []);

    /**
     * Converte string monetária para número
     * @param value - String monetária (ex: "R$ 1.234,56" ou "1234,56")
     * @returns Número parseado
     */
    const parse = useCallback((value: string | number | null | undefined): number => {
        if (value === null || value === undefined) return 0;
        if (typeof value === "number") return isNaN(value) ? 0 : value;

        // Remove símbolos de moeda e espaços
        const cleaned = value
            .replace(/R\$\s?/g, "")
            .replace(/[^\d,.-]/g, "")
            .trim();

        // Converte vírgula para ponto
        const normalized = cleaned.replace(",", ".");
        const num = parseFloat(normalized);

        return isNaN(num) ? 0 : num;
    }, []);

    /**
     * Calcula o total de um array de valores
     * @param values - Array de valores numéricos ou strings
     * @returns Soma total
     */
    const sum = useCallback((values: (number | string | null | undefined)[]): number => {
        return values.reduce((acc: number, val) => acc + parse(val), 0);
    }, [parse]);

    return {
        format,
        formatDecimal,
        parse,
        sum,
    };
}
