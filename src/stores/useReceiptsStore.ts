import { create } from "zustand";

type ReceiptsUiState = {
  sessionUserId: string | null;
  error: unknown;
  setSessionUserId: (userId: string | null) => void;
  setError: (error: unknown) => void;
  clearError: () => void;
};

export const useReceiptsStore = create<ReceiptsUiState>((set) => ({
  sessionUserId: null,
  error: null,

  setSessionUserId: (userId) => set({ sessionUserId: userId }),

  setError: (error) => set({ error }),

  clearError: () => set({ error: null }),
}));
