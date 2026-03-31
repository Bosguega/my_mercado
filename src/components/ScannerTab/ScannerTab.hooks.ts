import { useState, useCallback, useMemo } from "react";
import { toast } from "react-hot-toast";
import { parseBRL, formatBRL } from "../../utils/currency";
import { validateManualItem } from "../../utils/validation";
import type { Receipt, ReceiptItem } from "../../types/domain";
import type {
  SaveReceiptResponse,
  ManualReceiptData,
  ManualReceiptItemInput,
  ScannerScreen,
} from "./ScannerTab.types";

// =========================
// HOOK: USE SCANNER STATE
// =========================

interface UseScannerStateOptions {
  _saveReceipt: (receipt: Receipt, forceReplace?: boolean) => Promise<SaveReceiptResponse>;
  _tab: string;
}

export function useScannerState({ _saveReceipt, _tab }: UseScannerStateOptions) {
  const [manualMode, setManualMode] = useState(false);
  const [manualData, setManualData] = useState<ManualReceiptData>({
    establishment: "",
    date: "",
    items: [],
  });
  const [manualItem, setManualItem] = useState<ManualReceiptItemInput>({
    name: "",
    qty: "1",
    unitPrice: "",
  });
  const [currentReceipt, setCurrentReceipt] = useState<Receipt | null>(null);
  const [duplicateReceipt, setDuplicateReceipt] = useState<Receipt | null>(null);

  // Determina a tela ativa baseado nos estados
  const activeScreen = useMemo<ScannerScreen>(() => {
    if (manualMode) return "manual";
    if (currentReceipt) return "result";
    return "idle";
  }, [manualMode, currentReceipt]);

  // Handlers
  const handleReset = useCallback(() => {
    setCurrentReceipt(null);
    setManualMode(false);
    setManualData({ establishment: "", date: "", items: [] });
    setManualItem({ name: "", qty: "1", unitPrice: "" });
  }, []);

  const handleSetDuplicateReceipt = useCallback((receipt: Receipt | null) => {
    setDuplicateReceipt(receipt);
  }, []);

  return {
    // Estados
    manualMode,
    manualData,
    manualItem,
    currentReceipt,
    duplicateReceipt,
    activeScreen,

    // Setters
    setManualMode,
    setManualData,
    setManualItem,
    setCurrentReceipt,
    setDuplicateReceipt,

    // Handlers
    handleReset,
    handleSetDuplicateReceipt,
  };
}

// =========================
// HOOK: USE MANUAL RECEIPT
// =========================

interface UseManualReceiptOptions {
  manualData: ManualReceiptData;
  manualItem: ManualReceiptItemInput;
  setManualData: (data: ManualReceiptData) => void;
  setManualItem: (item: ManualReceiptItemInput) => void;
  saveReceipt: (receipt: Receipt, forceReplace?: boolean) => Promise<SaveReceiptResponse>;
  onReset: () => void;
}

export function useManualReceipt({
  manualData,
  manualItem,
  setManualData,
  setManualItem,
  saveReceipt,
  onReset,
}: UseManualReceiptOptions) {
  // Calcula o total do recibo
  const calculateReceiptTotal = useCallback((items: ReceiptItem[]) => {
    return items.reduce((acc: number, curr: ReceiptItem) => {
      if (curr.total != null) return acc + parseBRL(curr.total);
      return acc + parseBRL(curr.price || "0") * parseBRL(String(curr.quantity || curr.qty || 1));
    }, 0);
  }, []);

  // Adiciona um item manual
  const handleAddManualItem = useCallback(() => {
    const { name, unitPrice, qty } = manualItem;

    const validation = validateManualItem({ name, qty, unitPrice });

    if (!validation.success) {
      toast.error(validation.error);
      return;
    }

    const qtyNum = parseFloat(String(validation.data.qty)) || 1;
    const priceNum = parseFloat(String(validation.data.unitPrice));
    const totalNum = qtyNum * priceNum;

    const newItem: ReceiptItem = {
      name: name.trim(),
      qty: qtyNum,
      unitPrice: formatBRL(priceNum),
      total: formatBRL(totalNum),
      quantity: qtyNum,
      price: priceNum,
    };

    setManualData({ ...manualData, items: [newItem, ...manualData.items] });
    setManualItem({ name: "", qty: "1", unitPrice: "" });
    toast.success("Item adicionado!");
  }, [manualItem, manualData, setManualData, setManualItem]);

  // Remove um item da lista
  const handleRemoveManualItem = useCallback((index: number) => {
    setManualData({
      ...manualData,
      items: manualData.items.filter((_, i) => i !== index),
    });
    toast.success("Item removido!");
  }, [manualData, setManualData]);

  // Salva o recibo manual
  const handleSaveManualReceipt = useCallback(async () => {
    if (manualData.items.length === 0) {
      toast.error("Adicione pelo menos um item!");
      return;
    }

    if (!manualData.establishment.trim()) {
      toast.error("Informe o nome do mercado!");
      return;
    }

    if (!manualData.date.trim()) {
      toast.error("Informe a data!");
      return;
    }

    const receipt: Receipt = {
      id: Date.now().toString(),
      establishment: manualData.establishment.trim(),
      date: manualData.date.trim(),
      items: manualData.items,
    };

    try {
      const result = await saveReceipt(receipt);

      if ("success" in result && result.success) {
        toast.success("Nota salva com sucesso!");
        onReset();
      } else if ("duplicate" in result && result.duplicate) {
        toast.error("Nota já existe!");
      } else {
        toast.error("Erro ao salvar nota!");
      }
    } catch (error) {
      console.error("Erro ao salvar nota manual:", error);
      toast.error("Erro técnico ao salvar a nota.");
    }
  }, [manualData, saveReceipt, onReset]);

  return {
    calculateReceiptTotal,
    handleAddManualItem,
    handleRemoveManualItem,
    handleSaveManualReceipt,
  };
}

// =========================
// HOOK: USE URL INPUT
// =========================

interface UseUrlInputOptions {
  handleUrlSubmit: (url: string) => void;
}

export function useUrlInput({ handleUrlSubmit }: UseUrlInputOptions) {
  const [pasteMode, setPasteMode] = useState(false);
  const [pastedUrl, setPastedUrl] = useState("");

  const handleLinkSubmit = useCallback(() => {
    const rawUrl = pastedUrl.trim();
    handleUrlSubmit(rawUrl);
    setPastedUrl("");
    setPasteMode(false);
  }, [pastedUrl, handleUrlSubmit]);

  const handleTogglePasteMode = useCallback(() => {
    setPasteMode((prev) => !prev);
    if (pasteMode) {
      setPastedUrl("");
    }
  }, [pasteMode]);

  return {
    pasteMode,
    pastedUrl,
    setPastedUrl,
    handleLinkSubmit,
    handleTogglePasteMode,
  };
}
