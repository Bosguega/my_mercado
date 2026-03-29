import { useState, useCallback, useEffect, useRef } from "react";
import { getReceiptsPaginated } from "../services/dbMethods";
import type { Receipt } from "../types/domain";
import type { HistoryFilters } from "../types/ui";

interface UseInfiniteReceiptsOptions {
    pageSize?: number;
    filters?: HistoryFilters;
    search?: string;
}

interface UseInfiniteReceiptsReturn {
    receipts: Receipt[];
    hasMore: boolean;
    loading: boolean;
    loadingMore: boolean;
    total: number;
    loadMore: () => Promise<void>;
    refresh: () => Promise<void>;
    error: string | null;
}

export function useInfiniteReceipts({
    pageSize = 20,
    filters,
    search,
}: UseInfiniteReceiptsOptions = {}): UseInfiniteReceiptsReturn {
    const [receipts, setReceipts] = useState<Receipt[]>([]);
    const [page, setPage] = useState(1);
    const [hasMore, setHasMore] = useState(true);
    const [loading, setLoading] = useState(false);
    const [loadingMore, setLoadingMore] = useState(false);
    const [total, setTotal] = useState(0);
    const [error, setError] = useState<string | null>(null);

    // Ref para evitar múltiplas chamadas simultâneas
    const loadingRef = useRef(false);

    // Reset quando filtros mudam
    useEffect(() => {
        setReceipts([]);
        setPage(1);
        setHasMore(true);
        setError(null);
    }, [
        search,
        filters?.period,
        filters?.startDate,
        filters?.endDate,
        filters?.sortBy,
        filters?.sortOrder,
    ]);

    const loadInitialData = useCallback(async () => {
        if (loadingRef.current) return;

        loadingRef.current = true;
        setLoading(true);
        setError(null);

        try {
            const result = await getReceiptsPaginated(1, pageSize, {
                search,
                period: filters?.period,
                startDate: filters?.startDate,
                endDate: filters?.endDate,
                sortBy: filters?.sortBy,
                sortOrder: filters?.sortOrder,
            });

            setReceipts(result.data);
            setHasMore(result.hasMore);
            setTotal(result.total);
            setPage(2); // Próxima página a carregar
        } catch (err) {
            console.error("Erro ao carregar receipts:", err);
            setError("Erro ao carregar notas fiscais");
        } finally {
            setLoading(false);
            loadingRef.current = false;
        }
    }, [pageSize, filters, search]);

    // Carregar primeira página quando filtros mudam
    useEffect(() => {
        if (page === 1) {
            loadInitialData();
        }
    }, [page, loadInitialData]);

    const loadMore = useCallback(async () => {
        if (loadingRef.current || !hasMore) return;

        loadingRef.current = true;
        setLoadingMore(true);
        setError(null);

        try {
            const result = await getReceiptsPaginated(page, pageSize, {
                search,
                period: filters?.period,
                startDate: filters?.startDate,
                endDate: filters?.endDate,
                sortBy: filters?.sortBy,
                sortOrder: filters?.sortOrder,
            });

            setReceipts((prev) => [...prev, ...result.data]);
            setHasMore(result.hasMore);
            setTotal(result.total);
            setPage((prev) => prev + 1);
        } catch (err) {
            console.error("Erro ao carregar mais receipts:", err);
            setError("Erro ao carregar mais notas");
        } finally {
            setLoadingMore(false);
            loadingRef.current = false;
        }
    }, [page, pageSize, filters, hasMore, search]);

    const refresh = useCallback(async () => {
        setReceipts([]);
        setPage(1);
        setHasMore(true);
        setError(null);

        loadingRef.current = true;
        setLoading(true);

        try {
            const result = await getReceiptsPaginated(1, pageSize, {
                search,
                period: filters?.period,
                startDate: filters?.startDate,
                endDate: filters?.endDate,
                sortBy: filters?.sortBy,
                sortOrder: filters?.sortOrder,
            });

            setReceipts(result.data);
            setHasMore(result.hasMore);
            setTotal(result.total);
            setPage(2);
        } catch (err) {
            console.error("Erro ao atualizar receipts:", err);
            setError("Erro ao atualizar notas fiscais");
        } finally {
            setLoading(false);
            loadingRef.current = false;
        }
    }, [pageSize, filters, search]);

    return {
        receipts,
        hasMore,
        loading,
        loadingMore,
        total,
        loadMore,
        refresh,
        error,
    };
}