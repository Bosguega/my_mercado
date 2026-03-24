import type { Receipt, SessionUser } from "./domain";

export type AppTab = "scan" | "history" | "search" | "dictionary";
export type SortDirection = "asc" | "desc";

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
  sortOrder: string; // TODO: type
  setSortOrder: (value: string) => void; // TODO: type
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
