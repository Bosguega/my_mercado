import { toast } from "react-hot-toast";
import {
  createReceiptsStorage,
  createDictionaryStorage,
  isIndexedDBAvailable,
  getStorageStatus,
} from "../utils/storage";
import { getAllReceiptsFromDB, saveReceiptToDB } from "./receiptService";
import { getDictionary } from "./dictionaryService";
import type { Receipt, ReceiptItem, DictionaryEntry, DictionaryMap } from "../types/domain";

// =========================
// RECEIPT FALLBACK
// =========================

/**
 * Wrapper com fallback automático para getAllReceiptsFromDB
 * Tenta Supabase, fallback para IndexedDB/localStorage
 */
export async function getAllReceiptsFromDBWithFallback(): Promise<Receipt[]> {
  try {
    // Tenta Supabase primeiro
    return await getAllReceiptsFromDB();
  } catch (error) {
    console.warn("Supabase falhou, usando fallback local:", error);

    try {
      const receiptsStorage = createReceiptsStorage();
      const receipts = await receiptsStorage.getAll<Receipt>();

      if (receipts.length > 0) {
        console.log(
          `[Fallback] ${receipts.length} receipts carregados do storage local`
        );
      }

      return receipts;
    } catch (fallbackError) {
      console.error("Fallback também falhou:", fallbackError);
      return [];
    }
  }
}

/**
 * Wrapper com fallback automático para saveReceiptToDB
 * Salva no Supabase e faz backup no storage local
 */
export async function saveReceiptToDBWithFallback(
  receiptData: Receipt,
  items: ReceiptItem[]
): Promise<{ id: string; date: string } | null> {
  let supabaseResult: { id: string; date: string } | null = null;
  let supabaseError: unknown = null;

  // Tenta salvar no Supabase
  try {
    supabaseResult = await saveReceiptToDB(receiptData, items);
  } catch (error) {
    supabaseError = error;
    console.warn("Supabase falhou ao salvar, usando fallback local:", error);
  }

  // Sempre salva no storage local como backup
  try {
    const receiptsStorage = createReceiptsStorage();
    await receiptsStorage.set(receiptData.id, { ...receiptData, items });

    if (supabaseError) {
      toast.success("Nota salva localmente (offline)");
    }
  } catch (fallbackError) {
    console.error("Fallback local falhou:", fallbackError);

    if (supabaseError) {
      throw new Error("Falha ao salvar no Supabase e no fallback local");
    }
  }

  return supabaseResult;
}

// =========================
// DICTIONARY FALLBACK
// =========================

/**
 * Wrapper com fallback para getDictionary
 */
export async function getDictionaryWithFallback(
  keys: string[]
): Promise<DictionaryMap> {
  try {
    // Tenta Supabase primeiro
    return await getDictionary(keys);
  } catch (error) {
    console.warn("Supabase falhou, usando fallback local:", error);

    try {
      const dictStorage = createDictionaryStorage();
      const allEntries = await dictStorage.getAll<DictionaryEntry>();

      // Filtra apenas as chaves solicitadas
      const result: DictionaryMap = {};
      allEntries.forEach((entry) => {
        if (keys.includes(entry.key)) {
          result[entry.key] = {
            normalized_name: entry.normalized_name,
            category: entry.category,
            canonical_product_id: entry.canonical_product_id,
          };
        }
      });

      return result;
    } catch (fallbackError) {
      console.error("Fallback também falhou:", fallbackError);
      return {};
    }
  }
}

// =========================
// STORAGE STATUS
// =========================

/**
 * Verifica status do storage e conexão
 */
export async function getStorageConnectionStatus(): Promise<{
  supabase: boolean;
  indexedDB: boolean;
  localStorage: boolean;
  storageUsed: "indexeddb" | "localStorage" | "none";
  totalLocalItems: number;
}> {
  const { isSupabaseConfigured } = await import("./supabaseClient");

  const indexedDB = isIndexedDBAvailable();
  const storageStatus = await getStorageStatus();

  return {
    supabase: isSupabaseConfigured,
    indexedDB,
    localStorage:
      typeof window !== "undefined" && !!window.localStorage,
    storageUsed: storageStatus.storageUsed,
    totalLocalItems: storageStatus.totalItems,
  };
}
