import { create } from "zustand";
import type { Receipt } from "../types/domain";
import type { ScannerManualData, ScannerManualItem } from "../types/ui";

type ScannerState = {
  currentReceipt: Receipt | null;
  setCurrentReceipt: (
    value: Receipt | null | ((prev: Receipt | null) => Receipt | null),
  ) => void;
  loading: boolean;
  setLoading: (value: boolean) => void;
  scanning: boolean;
  setScanning: (value: boolean) => void;
  error: string | null;
  setError: (value: string | null) => void;
  duplicateReceipt: Receipt | null;
  setDuplicateReceipt: (value: Receipt | null) => void;
  manualMode: boolean;
  setManualMode: (value: boolean) => void;
  manualData: ScannerManualData;
  setManualData: (
    value:
      | ScannerManualData
      | ((prev: ScannerManualData) => ScannerManualData),
  ) => void;
  manualItem: ScannerManualItem;
  setManualItem: (
    value:
      | ScannerManualItem
      | ((prev: ScannerManualItem) => ScannerManualItem),
  ) => void;
  zoom: number;
  setZoom: (value: number) => void;
  zoomSupported: boolean;
  setZoomSupported: (value: boolean) => void;
  torch: boolean;
  setTorch: (value: boolean) => void;
  torchSupported: boolean;
  setTorchSupported: (value: boolean) => void;
};

const defaultManualData: ScannerManualData = {
  establishment: "",
  date: new Date().toLocaleDateString("pt-BR"),
  items: [],
};

const defaultManualItem: ScannerManualItem = {
  name: "",
  qty: "1",
  unitPrice: "",
};

export const useScannerStore = create<ScannerState>()((set) => ({
  currentReceipt: null,
  setCurrentReceipt: (value) =>
    set((state) => ({
      currentReceipt:
        typeof value === "function" ? value(state.currentReceipt) : value,
    })),
  loading: false,
  setLoading: (value) => set({ loading: value }),
  scanning: false,
  setScanning: (value) => set({ scanning: value }),
  error: null,
  setError: (value) => set({ error: value }),
  duplicateReceipt: null,
  setDuplicateReceipt: (value) => set({ duplicateReceipt: value }),
  manualMode: false,
  setManualMode: (value) => set({ manualMode: value }),
  manualData: defaultManualData,
  setManualData: (value) =>
    set((state) => ({
      manualData: typeof value === "function" ? value(state.manualData) : value,
    })),
  manualItem: defaultManualItem,
  setManualItem: (value) =>
    set((state) => ({
      manualItem: typeof value === "function" ? value(state.manualItem) : value,
    })),
  zoom: 1,
  setZoom: (value) => set({ zoom: value }),
  zoomSupported: false,
  setZoomSupported: (value) => set({ zoomSupported: value }),
  torch: false,
  setTorch: (value) => set({ torch: value }),
  torchSupported: false,
  setTorchSupported: (value) => set({ torchSupported: value }),
}));
