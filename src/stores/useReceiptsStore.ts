import { create } from "zustand";
import { toast } from "react-hot-toast";
import {
  getAllReceiptsFromDB,
  saveReceiptToDB,
  deleteReceiptFromDB,
} from "../services/dbMethods";
import { processItemsPipeline } from "../services/productService";
import { getReceiptIdCandidates, toUserScopedReceiptId } from "../utils/receiptId";
import type { Receipt } from "../types/domain";

type SaveReceiptResult =
  | { duplicate: true; existingReceipt: Receipt }
  | { success: true; receipt: Receipt }
  | { success: false; error: unknown };

type ReceiptsState = {
  sessionUserId: string | null;
  savedReceipts: Receipt[];
  loading: boolean;
  error: unknown;
  setSessionUserId: (userId: string | null) => void;
  clearReceipts: () => void;
  setSavedReceipts: (value: Receipt[] | ((prev: Receipt[]) => Receipt[])) => void;
  loadReceipts: () => Promise<void>;
  saveReceipt: (receipt: Receipt, forceReplace?: boolean) => Promise<SaveReceiptResult>;
  deleteReceipt: (id: string) => Promise<boolean>;
};

const LOCAL_STORAGE_KEY = "@MyMercado:receipts";

export const useReceiptsStore = create<ReceiptsState>((set, get) => ({
  sessionUserId: null,
  savedReceipts: [],
  loading: false,
  error: null,

  setSessionUserId: (userId) => set({ sessionUserId: userId }),

  clearReceipts: () => {
    set({ savedReceipts: [], error: null, loading: false });
  },

  setSavedReceipts: (value) =>
    set((state) => {
      const next =
        typeof value === "function"
          ? value(state.savedReceipts)
          : value;
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(next));
      return { savedReceipts: next };
    }),

  loadReceipts: async () => {
    set({ loading: true, error: null });
    try {
      const data = await getAllReceiptsFromDB();
      if (Array.isArray(data)) {
        set({ savedReceipts: data });
        localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(data));
      }
    } catch (err: unknown) {
      console.error("Erro ao carregar notas:", err);
      set({ error: err });
      const stored = localStorage.getItem(LOCAL_STORAGE_KEY);
      if (stored) {
        try {
          const parsed = JSON.parse(stored) as Receipt[];
          set({ savedReceipts: parsed });
        } catch (parseErr) {
          console.error("Erro ao ler localStorage:", parseErr);
        }
      }
    } finally {
      set({ loading: false });
    }
  },

  saveReceipt: async (receipt, forceReplace = false) => {
    const { sessionUserId, savedReceipts } = get();
    const rawReceiptId = receipt.id || Date.now().toString();
    const receiptId = toUserScopedReceiptId(rawReceiptId, sessionUserId ?? undefined);
    const idCandidates = new Set(
      getReceiptIdCandidates(rawReceiptId, sessionUserId ?? undefined),
    );
    const existing = savedReceipts.find((r: Receipt) => idCandidates.has(String(r.id)));

    if (existing && !forceReplace) {
      return { duplicate: true, existingReceipt: existing };
    }

    try {
      if (existing && forceReplace && existing.id !== receiptId) {
        await deleteReceiptFromDB(existing.id);
      }

      const processedItems = await processItemsPipeline(receipt.items || []);
      const fullReceipt = { ...receipt, id: receiptId, items: processedItems };
      await saveReceiptToDB(fullReceipt, processedItems);

      set((state) => {
        const idsToReplace = new Set(idCandidates);
        if (existing?.id) idsToReplace.add(String(existing.id));

        const filtered = state.savedReceipts.filter(
          (r: Receipt) => !idsToReplace.has(String(r.id)),
        );
        const newList = [fullReceipt, ...filtered];
        localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(newList));
        return { savedReceipts: newList };
      });

      return { success: true, receipt: fullReceipt };
    } catch (err: unknown) {
      console.error("Erro ao salvar nota:", err);
      toast.error("Erro técnico ao salvar a nota.");
      return { success: false, error: err };
    }
  },

  deleteReceipt: async (id: string) => {
    try {
      await deleteReceiptFromDB(id);
      set((state) => {
        const newList = state.savedReceipts.filter((r: Receipt) => r.id !== id);
        localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(newList));
        return { savedReceipts: newList };
      });
      toast.success("Nota removida com sucesso!");
      return true;
    } catch (err: unknown) {
      console.error("Erro ao remover nota:", err);
      toast.error("Erro ao remover nota no banco remoto.");
      return false;
    }
  },
}));
