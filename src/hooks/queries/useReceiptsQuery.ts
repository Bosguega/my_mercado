import { useQuery, useInfiniteQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getReceiptsPaginated, saveReceiptToDB, deleteReceiptFromDB } from "../../services/dbMethods";
import type { Receipt } from "../../types/domain";
import type { HistoryFilters } from "../../types/ui";

// Query keys para cache
export const receiptKeys = {
    all: ["receipts"] as const,
    lists: () => [...receiptKeys.all, "list"] as const,
    list: (filters: HistoryFilters, search?: string) => [...receiptKeys.lists(), filters, search] as const,
    infinite: (filters: HistoryFilters, search?: string) => [...receiptKeys.all, "infinite", filters, search] as const,
    details: () => [...receiptKeys.all, "detail"] as const,
    detail: (id: string) => [...receiptKeys.details(), id] as const,
};

// Hook para query simples com paginação
export function useReceiptsQuery(
    page: number = 1,
    pageSize: number = 20,
    filters?: HistoryFilters,
    search?: string
) {
    return useQuery({
        queryKey: receiptKeys.list(filters || {} as HistoryFilters, search),
        queryFn: () => getReceiptsPaginated(page, pageSize, {
            search,
            period: filters?.period,
            startDate: filters?.startDate,
            endDate: filters?.endDate,
            sortBy: filters?.sortBy,
            sortOrder: filters?.sortOrder,
        }),
        staleTime: 2 * 60 * 1000, // 2 minutos
    });
}

// Hook para query infinita (paginação automática)
export function useInfiniteReceiptsQuery(
    pageSize: number = 20,
    filters?: HistoryFilters,
    search?: string
) {
    return useInfiniteQuery({
        queryKey: receiptKeys.infinite(filters || {} as HistoryFilters, search),
        queryFn: ({ pageParam = 1 }) =>
            getReceiptsPaginated(pageParam, pageSize, {
                search,
                period: filters?.period,
                startDate: filters?.startDate,
                endDate: filters?.endDate,
                sortBy: filters?.sortBy,
                sortOrder: filters?.sortOrder,
            }),
        getNextPageParam: (lastPage, pages) =>
            lastPage.hasMore ? pages.length + 1 : undefined,
        initialPageParam: 1,
        staleTime: 2 * 60 * 1000,
    });
}

// Hook para salvar receipt
export function useSaveReceipt() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async ({ receipt, items }: { receipt: Receipt; items: any[] }) => {
            return saveReceiptToDB(receipt, items);
        },
        onSuccess: () => {
            // Invalidar cache de receipts após salvar
            queryClient.invalidateQueries({ queryKey: receiptKeys.all });
        },
    });
}

// Hook para deletar receipt
export function useDeleteReceipt() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (id: string) => {
            return deleteReceiptFromDB(id);
        },
        onSuccess: () => {
            // Invalidar cache de receipts após deletar
            queryClient.invalidateQueries({ queryKey: receiptKeys.all });
        },
    });
}