import type { SessionUser } from "./domain";
import type { ReceiptItem } from "./domain";

export type AppTab = "scan" | "history" | "search" | "dictionary" | "products" | "settings";
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

export interface ConfirmDialogProps {
  isOpen: boolean;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  danger?: boolean;
  busy?: boolean;
  onConfirm: () => void | Promise<void>;
  onCancel: () => void;
}

export interface ConfirmDialogConfig {
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  danger?: boolean;
  onConfirm: () => void | Promise<void>;
  onCancel?: () => void;
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
