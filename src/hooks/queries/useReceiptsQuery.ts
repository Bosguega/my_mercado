import { useQuery, useInfiniteQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "react-hot-toast";
import {
    getReceiptsPaginated,
    getAllReceiptsFromDB,
    saveReceiptToDB,
    deleteReceiptFromDB,
    restoreReceiptsToDB
} from "../../services/dbMethods";
import { processItemsPipeline } from "../../services/productService";
import { getReceiptIdCandidates, toUserScopedReceiptId } from "../../utils/receiptId";
import type { Receipt } from "../../types/domain";
import type { HistoryFilters } from "../../types/ui";

const LOCAL_STORAGE_KEY = "@MyMercado:receipts";

// Query keys para cache
export const receiptKeys = {
    all: ["receipts"] as const,
    lists: () => [...receiptKeys.all, "list"] as const,
    list: (filters: HistoryFilters, search?: string) => [...receiptKeys.lists(), filters, search] as const,
    infinite: (filters: HistoryFilters, search?: string) => [...receiptKeys.all, "infinite", filters, search] as const,
    allReceipts: () => [...receiptKeys.all, "all"] as const,
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

// Hook para salvar receipt com detecção de duplicatas
export function useSaveReceipt() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async ({
            receipt,
            sessionUserId,
            forceReplace = false
        }: {
            receipt: Receipt;
            sessionUserId: string | null;
            forceReplace?: boolean;
        }) => {
            // Buscar receipts atuais do cache ou localStorage
            const currentReceipts = queryClient.getQueryData<Receipt[]>(receiptKeys.allReceipts()) ||
                JSON.parse(localStorage.getItem(LOCAL_STORAGE_KEY) || "[]") as Receipt[];

            const rawReceiptId = receipt.id || Date.now().toString();
            const receiptId = toUserScopedReceiptId(rawReceiptId, sessionUserId ?? undefined);
            const idCandidates = new Set(
                getReceiptIdCandidates(rawReceiptId, sessionUserId ?? undefined),
            );
            const existing = currentReceipts.find((r: Receipt) => idCandidates.has(String(r.id)));

            if (existing && !forceReplace) {
                return { duplicate: true, existingReceipt: existing };
            }

            // Se existe e forceReplace, deletar o antigo primeiro
            if (existing && forceReplace && existing.id !== receiptId) {
                await deleteReceiptFromDB(existing.id);
            }

            // Processar items
            const processedItems = await processItemsPipeline(receipt.items || []);
            const fullReceipt = { ...receipt, id: receiptId, items: processedItems };

            // Salvar no banco
            await saveReceiptToDB(fullReceipt, processedItems);

            return { success: true, receipt: fullReceipt, existingId: existing?.id };
        },
        onSuccess: (result) => {
            if ('duplicate' in result && result.duplicate) {
                // Não invalidar cache se for duplicata
                return;
            }

            if ('success' in result && result.success) {
                // Atualizar cache otimisticamente
                queryClient.setQueryData(receiptKeys.allReceipts(), (old: Receipt[] | undefined) => {
                    if (!old) return [result.receipt];

                    const idsToReplace = new Set<string>();
                    if (result.existingId) idsToReplace.add(String(result.existingId));

                    const filtered = old.filter((r: Receipt) => !idsToReplace.has(String(r.id)));
                    const newList = [result.receipt, ...filtered];
                    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(newList));
                    return newList;
                });

                // Invalidar queries paginadas
                queryClient.invalidateQueries({ queryKey: receiptKeys.lists() });
                queryClient.invalidateQueries({ queryKey: receiptKeys.infinite() });
            }
        },
        onError: (err) => {
            console.error("Erro ao salvar nota:", err);
            toast.error("Erro técnico ao salvar a nota.");
        },
    });
}

// Hook para buscar TODOS os receipts (para analytics e backup)
export function useAllReceiptsQuery(enabled: boolean = true) {
    return useQuery({
        queryKey: receiptKeys.allReceipts(),
        queryFn: async () => {
            const data = await getAllReceiptsFromDB();
            // Sincronizar com localStorage como fallback
            if (Array.isArray(data) && data.length > 0) {
                localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(data));
            }
            return data;
        },
        staleTime: 5 * 60 * 1000, // 5 minutos
        enabled,
    });
}

// Hook para deletar receipt
export function useDeleteReceipt() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (id: string) => {
            await deleteReceiptFromDB(id);
            return id;
        },
        onSuccess: (deletedId) => {
            // Atualizar cache otimisticamente
            queryClient.setQueryData(receiptKeys.allReceipts(), (old: Receipt[] | undefined) => {
                if (!old) return old;
                const newList = old.filter((r: Receipt) => r.id !== deletedId);
                localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(newList));
                return newList;
            });

            // Invalidar todas as queries de receipts
            queryClient.invalidateQueries({ queryKey: receiptKeys.all });

            toast.success("Nota removida com sucesso!");
        },
        onError: (err) => {
            console.error("Erro ao remover nota:", err);
            toast.error("Erro ao remover nota no banco remoto.");
        },
    });
}

// Hook para restaurar backup
export function useRestoreReceipts() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (receipts: Receipt[]) => {
            await restoreReceiptsToDB(receipts);
            return receipts;
        },
        onSuccess: (restoredReceipts) => {
            // Atualizar cache
            queryClient.setQueryData(receiptKeys.allReceipts(), restoredReceipts);
            localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(restoredReceipts));

            // Invalidar todas as queries
            queryClient.invalidateQueries({ queryKey: receiptKeys.all });

            toast.success(`Backup restaurado com ${restoredReceipts.length} notas!`);
        },
        onError: (err) => {
            console.error("Erro ao restaurar backup:", err);
            toast.error("Erro ao restaurar backup.");
        },
    });
}
