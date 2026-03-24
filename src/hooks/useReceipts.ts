import { useState, useEffect } from 'react';
import { toast } from 'react-hot-toast';
import { getAllReceiptsFromDB, saveReceiptToDB, deleteReceiptFromDB } from '../services/dbMethods';
import { processItemsPipeline } from '../services/productService';
import { getReceiptIdCandidates, toUserScopedReceiptId } from '../utils/receiptId';
import type { Receipt, SessionUser } from '../types/domain';

export function useReceipts(sessionUser: SessionUser | null) {
  const [savedReceipts, setSavedReceipts] = useState<Receipt[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<any>(null); // TODO: type

  const loadReceipts = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getAllReceiptsFromDB();
      if (Array.isArray(data)) {
        setSavedReceipts(data);
        localStorage.setItem("@MyMercado:receipts", JSON.stringify(data));
      }
    } catch (err) {
      console.error("Erro ao carregar notas:", err);
      setError(err);
      const stored = localStorage.getItem("@MyMercado:receipts");
      if (stored) {
        try {
          setSavedReceipts(JSON.parse(stored));
        } catch (parseErr) {
          console.error("Erro ao ler localStorage:", parseErr);
        }
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (sessionUser) {
      loadReceipts();
    } else {
      setSavedReceipts([]);
    }
  }, [sessionUser]);

  const saveReceipt = async (receipt: any, forceReplace = false) => { // TODO: type
    const rawReceiptId = receipt.id || Date.now().toString();
    const receiptId = toUserScopedReceiptId(rawReceiptId, sessionUser?.id);
    const idCandidates = new Set(getReceiptIdCandidates(rawReceiptId, sessionUser?.id));
    const existing = savedReceipts.find((r: Receipt) => idCandidates.has(String(r.id)));
    
    if (existing && !forceReplace) {
      return { duplicate: true, existingReceipt: existing };
    }

    try {
      // Migração progressiva de IDs legados (sem escopo de usuário)
      if (existing && forceReplace && existing.id !== receiptId) {
        await deleteReceiptFromDB(existing.id);
      }

      // 1. Processar itens através do pipeline
      const processedItems = await processItemsPipeline(receipt.items || []);
      
      // 2. Salvar no banco relacional
      const fullReceipt = { ...receipt, id: receiptId, items: processedItems };
      await saveReceiptToDB(fullReceipt, processedItems);
      
      setSavedReceipts((prev: Receipt[]) => {
        const idsToReplace = new Set(idCandidates);
        if (existing?.id) idsToReplace.add(String(existing.id));

        const filtered = prev.filter((r: Receipt) => !idsToReplace.has(String(r.id)));
        const newList = [fullReceipt, ...filtered];
        localStorage.setItem("@MyMercado:receipts", JSON.stringify(newList));
        return newList;
      });

      return { success: true, receipt: fullReceipt };
    } catch (err) {
      console.error("Erro ao salvar nota:", err);
      toast.error("Erro técnico ao salvar a nota.");
      return { success: false, error: err };
    }
  };

  const deleteReceipt = async (id: string) => {
    if (!window.confirm("Certeza que deseja remover esta nota do histórico?")) {
      return false;
    }

    try {
      await deleteReceiptFromDB(id);
      setSavedReceipts((prev: Receipt[]) => {
        const newList = prev.filter((r: Receipt) => r.id !== id);
        localStorage.setItem("@MyMercado:receipts", JSON.stringify(newList));
        return newList;
      });
      toast.success("Nota removida com sucesso!");
      return true;
    } catch (err) {
      console.error("Erro ao remover nota:", err);
      toast.error("Erro ao remover nota no banco remoto.");
      return false;
    }
  };

  return {
    savedReceipts,
    setSavedReceipts,
    loading,
    error,
    loadReceipts,
    saveReceipt,
    deleteReceipt
  };
}
