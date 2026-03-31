// Auth
export {
  requireSupabase,
  getUserOrThrow,
  isAuthenticated,
  getUserOrNull,
} from "./authService";

// Receipts
export {
  getReceiptsPaginated,
  getAllReceiptsFromDB,
  restoreReceiptsToDB,
  saveReceiptToDB,
  deleteReceiptFromDB,
  clearReceiptsAndItemsFromDB,
  type GetReceiptsFilters,
  type GetReceiptsResult,
} from "./receiptService";

// Dictionary
export {
  getFullDictionaryFromDB,
  updateDictionaryEntryInDB,
  applyDictionaryEntryToSavedItems,
  deleteDictionaryEntryFromDB,
  clearDictionaryInDB,
  getDictionary,
  updateDictionary,
  associateDictionaryToCanonicalProduct,
  type DictionaryUpdateEntry,
} from "./dictionaryService";

// Canonical Products
export {
  getCanonicalProducts,
  getCanonicalProduct,
  createCanonicalProduct,
  updateCanonicalProduct,
  deleteCanonicalProduct,
  mergeCanonicalProducts,
  clearCanonicalProductsInDB,
  associateItemToCanonicalProduct,
} from "./canonicalProductService";

// Storage Fallback
export {
  getAllReceiptsFromDBWithFallback,
  saveReceiptToDBWithFallback,
  getDictionaryWithFallback,
  getStorageConnectionStatus,
} from "./storageFallbackService";

// Sync
export { syncLocalStorageWithSupabase } from "./syncService";
