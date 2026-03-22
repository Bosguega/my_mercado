import { useState, useEffect } from 'react';
import { toast } from 'react-hot-toast';
import { getAllReceiptsFromDB, saveReceiptToDB, deleteReceiptFromDB } from '../services/dbMethods';
import { processItemsPipeline } from '../services/productService';
import { supabase } from '../services/supabaseClient';

export function useReceipts(sessionUser) {
  const [savedReceipts, setSavedReceipts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

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

  const saveReceipt = async (receipt, forceReplace = false) => {
    const receiptId = receipt.id || Date.now().toString();
    const existing = savedReceipts.find(r => r.id === receiptId);
    
    if (existing && !forceReplace) {
      return { duplicate: true, existingReceipt: existing };
    }

    try {
      // 1. Processar itens através do pipeline
      const processedItems = await processItemsPipeline(receipt.items || []);
      
      // 2. Salvar no banco relacional
      const fullReceipt = { ...receipt, id: receiptId, items: processedItems };
      await saveReceiptToDB(fullReceipt, processedItems);
      
      setSavedReceipts((prev) => {
        const filtered = prev.filter((r) => r.id !== receiptId);
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

  const deleteReceipt = async (id) => {
    if (!window.confirm("Certeza que deseja remover esta nota do histórico?")) {
      return false;
    }

    try {
      await deleteReceiptFromDB(id);
      setSavedReceipts((prev) => {
        const newList = prev.filter((r) => r.id !== id);
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
