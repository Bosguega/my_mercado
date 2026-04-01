import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "react-hot-toast";
import {
    getCanonicalProducts,
    getCanonicalProduct,
    createCanonicalProduct,
    updateCanonicalProduct,
    deleteCanonicalProduct,
    mergeCanonicalProducts,
    associateItemToCanonicalProduct,
    associateDictionaryToCanonicalProduct,
} from "../../services";
import type { CanonicalProduct } from "../../types/domain";

// Query keys para cache
export const canonicalProductKeys = {
    all: ["canonical-products"] as const,
    lists: () => [...canonicalProductKeys.all, "list"] as const,
    list: () => [...canonicalProductKeys.lists()] as const,
    details: () => [...canonicalProductKeys.all, "detail"] as const,
    detail: (id: string) => [...canonicalProductKeys.details(), id] as const,
};

// Hook para buscar todos os produtos canônicos
export function useCanonicalProductsQuery() {
    return useQuery({
        queryKey: canonicalProductKeys.list(),
        queryFn: getCanonicalProducts,
        staleTime: 5 * 60 * 1000, // 5 minutos
    });
}

// Hook para buscar um produto canônico específico
export function useCanonicalProductQuery(id: string) {
    return useQuery({
        queryKey: canonicalProductKeys.detail(id),
        queryFn: () => getCanonicalProduct(id),
        enabled: !!id,
        staleTime: 5 * 60 * 1000,
    });
}

// Hook para criar produto canônico
export function useCreateCanonicalProduct() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (product: Pick<CanonicalProduct, "slug" | "name" | "category" | "brand">) =>
            createCanonicalProduct(product),
        onSuccess: (newProduct) => {
            // Atualizar cache
            queryClient.setQueryData(canonicalProductKeys.list(), (old: CanonicalProduct[] | undefined) => {
                if (!old) return [newProduct];
                return [...old, newProduct].sort((a, b) => a.name.localeCompare(b.name));
            });

            toast.success("Produto canônico criado com sucesso!");
        },
        onError: (err) => {
            console.error("Erro ao criar produto canônico:", err);
            toast.error(err instanceof Error ? err.message : "Erro ao criar produto can�nico.");
        },
    });
}

// Hook para atualizar produto canônico
export function useUpdateCanonicalProduct() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: ({ id, updates }: { id: string; updates: Partial<Pick<CanonicalProduct, "name" | "category" | "brand">> }) =>
            updateCanonicalProduct(id, updates),
        onSuccess: (_, { id, updates }) => {
            // Atualizar cache
            queryClient.setQueryData(canonicalProductKeys.list(), (old: CanonicalProduct[] | undefined) => {
                if (!old) return old;
                return old.map((product) =>
                    product.id === id ? { ...product, ...updates } : product
                );
            });

            queryClient.setQueryData(canonicalProductKeys.detail(id), (old: CanonicalProduct | undefined) => {
                if (!old) return old;
                return { ...old, ...updates };
            });

            toast.success("Produto canônico atualizado!");
        },
        onError: (err) => {
            console.error("Erro ao atualizar produto canônico:", err);
            toast.error(err instanceof Error ? err.message : "Erro ao atualizar produto can�nico.");
        },
    });
}

// Hook para deletar produto canônico
export function useDeleteCanonicalProduct() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (id: string) => deleteCanonicalProduct(id),
        onSuccess: (_, deletedId) => {
            // Remover do cache
            queryClient.setQueryData(canonicalProductKeys.list(), (old: CanonicalProduct[] | undefined) => {
                if (!old) return old;
                return old.filter((product) => product.id !== deletedId);
            });

            queryClient.removeQueries({ queryKey: canonicalProductKeys.detail(deletedId) });

            toast.success("Produto canônico removido!");
        },
        onError: (err) => {
            console.error("Erro ao deletar produto canônico:", err);
            toast.error(err instanceof Error ? err.message : "Erro ao deletar produto canônico.");
        },
    });
}

// Hook para merge de produtos canônicos
export function useMergeCanonicalProducts() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: ({ primaryId, secondaryId }: { primaryId: string; secondaryId: string }) =>
            mergeCanonicalProducts(primaryId, secondaryId),
        onSuccess: (_, { primaryId: _primaryId, secondaryId }) => {
            // Remover secundário do cache
            queryClient.setQueryData(canonicalProductKeys.list(), (old: CanonicalProduct[] | undefined) => {
                if (!old) return old;
                return old.filter((product) => product.id !== secondaryId);
            });

            queryClient.removeQueries({ queryKey: canonicalProductKeys.detail(secondaryId) });

            // Invalidar queries de items e dicionário para atualizar associações
            queryClient.invalidateQueries({ queryKey: ["receipts"] });
            queryClient.invalidateQueries({ queryKey: ["dictionary"] });

            toast.success("Produtos mesclados com sucesso!");
        },
        onError: (err) => {
            console.error("Erro ao mesclar produtos:", err);
            toast.error("Erro ao mesclar produtos.");
        },
    });
}

// Hook para associar item a produto canônico
export function useAssociateItemToCanonicalProduct() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: ({ itemId, canonicalProductId }: { itemId: string; canonicalProductId: string | null }) =>
            associateItemToCanonicalProduct(itemId, canonicalProductId),
        onSuccess: () => {
            // Invalidar queries de receipts para atualizar dados
            queryClient.invalidateQueries({ queryKey: ["receipts"] });

            toast.success("Item associado com sucesso!");
        },
        onError: (err) => {
            console.error("Erro ao associar item:", err);
            toast.error("Erro ao associar item.");
        },
    });
}

// Hook para associar dicionário a produto canônico
export function useAssociateDictionaryToCanonicalProduct() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: ({ key, canonicalProductId }: { key: string; canonicalProductId: string | null }) =>
            associateDictionaryToCanonicalProduct(key, canonicalProductId),
        onSuccess: () => {
            // Invalidar queries de dicionário
            queryClient.invalidateQueries({ queryKey: ["dictionary"] });

            toast.success("Dicionário associado com sucesso!");
        },
        onError: (err) => {
            console.error("Erro ao associar dicionário:", err);
            toast.error("Erro ao associar dicionário.");
        },
    });
}
