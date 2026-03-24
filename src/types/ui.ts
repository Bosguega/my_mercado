import type { Receipt, SessionUser } from "./domain";
import type { ReceiptItem } from "./domain";
import type { ChangeEvent, Dispatch, SetStateAction } from "react";

export type AppTab = "scan" | "history" | "search" | "dictionary";
export type SortDirection = "asc" | "desc";
export type SearchSortBy = "recent" | "price";

export interface HistoryFilters {
  period: "all" | "this-month" | "last-3-months" | "custom";
  sortBy: "date" | "value" | "store";
  sortOrder: SortDirection;
  startDate: string;
  endDate: string;
}

export interface LoginProps {
  setSessionUser: (user: SessionUser | null) => void;
}

export interface ApiKeyModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentKey?: string;
  onSave: (key: string) => void;
}

export interface SearchTabProps {
  savedReceipts: Receipt[];
  searchQuery: string;
  setSearchQuery: (value: string) => void;
  sortOrder: SearchSortBy;
  setSortOrder: (value: SearchSortBy) => void;
  sortDirection: SortDirection;
  setSortDirection: (value: SortDirection) => void;
  loading: boolean;
}

export interface HistoryTabProps {
  savedReceipts: Receipt[];
  setSavedReceipts: (value: Receipt[] | ((prev: Receipt[]) => Receipt[])) => void;
  historyFilter: string;
  setHistoryFilter: (value: string) => void;
  historyFilters: HistoryFilters;
  setHistoryFilters: (
    value: HistoryFilters | ((prev: HistoryFilters) => HistoryFilters)
  ) => void;
  expandedReceipts: string[];
  setExpandedReceipts: (value: string[] | ((prev: string[]) => string[])) => void;
  deleteReceipt: (id: string) => Promise<boolean>;
  loading: boolean;
  loadReceipts: () => Promise<void>;
}

export interface DictionaryTabProps {
  setSavedReceipts?: (value: Receipt[] | ((prev: Receipt[]) => Receipt[])) => void;
  loadReceipts?: () => Promise<void>;
}

export interface PurchasedItem extends ReceiptItem {
  purchasedAt?: string;
  store?: string;
}

export interface ScannerManualData {
  establishment: string;
  date: string;
  items: ReceiptItem[];
}

export interface ScannerManualItem {
  name: string;
  qty: string;
  unitPrice: string;
}

export interface ScannerTabProps {
  manualMode: boolean;
  setManualMode: Dispatch<SetStateAction<boolean>>;
  manualData: ScannerManualData;
  setManualData: Dispatch<SetStateAction<ScannerManualData>>;
  manualItem: ScannerManualItem;
  setManualItem: Dispatch<SetStateAction<ScannerManualItem>>;
  handleSaveManualReceipt: () => Promise<void>;
  startCamera: () => Promise<void>;
  stopCamera: () => void;
  handleFileUpload: (event: ChangeEvent<HTMLInputElement>) => Promise<void>;
  loading: boolean;
  scanning: boolean;
  error: string | null;
  currentReceipt: Receipt | null;
  setCurrentReceipt: Dispatch<SetStateAction<Receipt | null>>;
  handleUrlSubmit: (decodedText: string) => Promise<void>;
  zoom: number;
  zoomSupported: boolean;
  applyZoom: (value: number) => Promise<void>;
  torch: boolean;
  torchSupported: boolean;
  applyTorch: (on: boolean) => Promise<void>;
}
