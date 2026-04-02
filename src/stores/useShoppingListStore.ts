import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import { normalizeKey } from "../utils/normalize";
import { generateId } from "../utils/idGenerator";
import type {
  ShoppingListItem,
  ShoppingListMeta,
  ShoppingListsCloudSnapshot,
} from "../types/ui";

/**
 * Shopping List Store - Gerencia o estado das listas de compras
 * 
 * Arquitetura:
 * - Armazena dados por usuário (ownerKey) para suportar múltiplos usuários
 * - Persiste em localStorage com migrate automático de versão
 * - Fornece operações CRUD completas para listas e itens
 * 
 * @example
 * // Obter listas de um usuário
 * const lists = useShoppingListStore((state) => state.getLists(userId));
 * 
 * // Adicionar item
 * const result = addItem(userId, "Arroz", "5kg");
 * if (result.ok) { /* result.item * / }
 */

const FALLBACK_OWNER_KEY = "__local__";
const DEFAULT_LIST_NAME = "Lista Principal";

/**
 * Retorna a chave do proprietário (userId ou fallback para anônimo)
 */
function getOwnerKey(userId: string | null | undefined): string {
  const trimmed = (userId || "").trim();
  return trimmed || FALLBACK_OWNER_KEY;
}

/**
 * Cria metadados para uma nova lista
 */
function createListMeta(name: string): ShoppingListMeta {
  const now = new Date().toISOString();
  return {
    id: generateId(),
    name: name.trim(),
    created_at: now,
    updated_at: now,
  };
}

/**
 * Cria um novo item para a lista de compras
 */
function createListItem(name: string, quantity?: string): ShoppingListItem {
  const now = new Date().toISOString();
  return {
    id: generateId(),
    name: name.trim(),
    normalized_key: normalizeKey(name),
    quantity: quantity?.trim() || undefined,
    checked: false,
    created_at: now,
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function coerceItem(raw: unknown): ShoppingListItem | null {
  if (!isRecord(raw)) return null;
  const name = String(raw.name || "").trim();
  if (!name) return null;

  const id = String(raw.id || "").trim() || generateId();
  const normalized_key = String(raw.normalized_key || "").trim() || normalizeKey(name);

  return {
    id,
    name,
    normalized_key,
    quantity: raw.quantity ? String(raw.quantity).trim() : undefined,
    checked: Boolean(raw.checked),
    created_at: raw.created_at ? String(raw.created_at) : new Date().toISOString(),
    checked_at: raw.checked_at ? String(raw.checked_at) : undefined,
  };
}

type UserShoppingLists = {
  lists: ShoppingListMeta[];
  activeListId: string;
  itemsByList: Record<string, ShoppingListItem[]>;
  updatedAt: string;
};

const defaultUserDataByOwner = new Map<string, UserShoppingLists>();

function createDefaultUserData(initialItems: ShoppingListItem[] = []): UserShoppingLists {
  const list = createListMeta(DEFAULT_LIST_NAME);
  const now = new Date().toISOString();
  return {
    lists: [list],
    activeListId: list.id,
    itemsByList: { [list.id]: initialItems },
    updatedAt: now,
  };
}

function getDefaultUserDataForOwner(ownerKey: string): UserShoppingLists {
  const cached = defaultUserDataByOwner.get(ownerKey);
  if (cached) return cached;

  const created = createDefaultUserData();
  defaultUserDataByOwner.set(ownerKey, created);
  return created;
}

function hasUserData(
  dataByUser: unknown,
  ownerKey: string,
): dataByUser is Record<string, UserShoppingLists> {
  return isRecord(dataByUser) && isRecord(dataByUser[ownerKey]);
}

function getUserDataFromState(
  dataByUser: unknown,
  userId: string | null | undefined,
): UserShoppingLists {
  const ownerKey = getOwnerKey(userId);
  if (hasUserData(dataByUser, ownerKey)) {
    return dataByUser[ownerKey];
  }
  return getDefaultUserDataForOwner(ownerKey);
}

function sanitizeItems(items: unknown): ShoppingListItem[] {
  if (!Array.isArray(items)) return [];
  return items
    .map((entry) => coerceItem(entry))
    .filter((entry): entry is ShoppingListItem => Boolean(entry));
}

function getUserDataSafe(
  dataByUser: unknown,
  userId: string | null | undefined,
): UserShoppingLists {
  if (!isRecord(dataByUser)) return createDefaultUserData();
  const ownerKey = getOwnerKey(userId);
  const rawUser = dataByUser[ownerKey];
  if (!isRecord(rawUser)) return createDefaultUserData();

  const rawLists = Array.isArray(rawUser.lists) ? rawUser.lists : [];
  const lists: ShoppingListMeta[] = rawLists
    .map((entry) => {
      if (!isRecord(entry)) return null;
      const name = String(entry.name || "").trim();
      const id = String(entry.id || "").trim();
      if (!name || !id) return null;
      return {
        id,
        name,
        created_at: String(entry.created_at || new Date().toISOString()),
        updated_at: String(entry.updated_at || new Date().toISOString()),
      };
    })
    .filter((entry): entry is ShoppingListMeta => Boolean(entry));

  const normalizedLists = lists.length ? lists : [createListMeta(DEFAULT_LIST_NAME)];
  const rawItemsByList = isRecord(rawUser.itemsByList) ? rawUser.itemsByList : {};
  const itemsByList: Record<string, ShoppingListItem[]> = {};
  for (const list of normalizedLists) {
    itemsByList[list.id] = sanitizeItems(rawItemsByList[list.id]);
  }

  const rawActive = String(rawUser.activeListId || "").trim();
  const activeListId = normalizedLists.some((l) => l.id === rawActive)
    ? rawActive
    : normalizedLists[0].id;

  return {
    lists: normalizedLists,
    activeListId,
    itemsByList,
    updatedAt: String(rawUser.updatedAt || rawUser.updated_at || new Date().toISOString()),
  };
}

function touchUserData(
  current: UserShoppingLists,
  overrides: Partial<Omit<UserShoppingLists, "updatedAt">>,
): UserShoppingLists {
  return {
    ...current,
    ...overrides,
    updatedAt: new Date().toISOString(),
  };
}

function bumpListUpdatedAt(
  lists: ShoppingListMeta[],
  listIds: string[],
  now: string = new Date().toISOString(),
): ShoppingListMeta[] {
  const targets = new Set(listIds);
  return lists.map((list) =>
    targets.has(list.id) ? { ...list, updated_at: now } : list,
  );
}

function toCloudSnapshot(userData: UserShoppingLists): ShoppingListsCloudSnapshot {
  return {
    version: 1,
    updated_at: userData.updatedAt,
    lists: userData.lists,
    active_list_id: userData.activeListId,
    items_by_list: userData.itemsByList,
  };
}

function fromCloudSnapshot(raw: unknown): UserShoppingLists | null {
  if (!isRecord(raw)) return null;

  const rawLists = Array.isArray(raw.lists) ? raw.lists : [];
  const lists: ShoppingListMeta[] = rawLists
    .map((entry) => {
      if (!isRecord(entry)) return null;
      const name = String(entry.name || "").trim();
      const id = String(entry.id || "").trim();
      if (!name || !id) return null;

      return {
        id,
        name,
        created_at: String(entry.created_at || new Date().toISOString()),
        updated_at: String(entry.updated_at || new Date().toISOString()),
      };
    })
    .filter((entry): entry is ShoppingListMeta => Boolean(entry));

  if (!lists.length) return null;

  const rawItemsByList = isRecord(raw.items_by_list) ? raw.items_by_list : {};
  const itemsByList: Record<string, ShoppingListItem[]> = {};
  for (const list of lists) {
    itemsByList[list.id] = sanitizeItems(rawItemsByList[list.id]);
  }

  const requestedActiveListId = String(raw.active_list_id || "").trim();
  const activeListId = lists.some((list) => list.id === requestedActiveListId)
    ? requestedActiveListId
    : lists[0].id;

  return {
    lists,
    activeListId,
    itemsByList,
    updatedAt: String(raw.updated_at || new Date().toISOString()),
  };
}

function getItemsForList(
  userData: UserShoppingLists,
  listId?: string,
): ShoppingListItem[] {
  const safeListId = listId && userData.itemsByList[listId] ? listId : userData.activeListId;
  return userData.itemsByList[safeListId] || [];
}

type AddItemResult =
  | { ok: true; item: ShoppingListItem }
  | { ok: false; reason: "empty" | "duplicate" };

type ListOperationResult =
  | { ok: true; listId: string }
  | { ok: false; reason: "empty" | "duplicate" | "not_found" | "last_list" };

type MoveOrCopyResult =
  | { ok: true; item: ShoppingListItem }
  | { ok: false; reason: "not_found" | "same_list" | "duplicate" };

/**
 * Estado e operações do Shopping List Store
 * 
 * @remarks
 * Todas as operações são scoped por userId para suportar múltiplos usuários
 * Operações retornam resultados tipados com discriminated unions
 */
type ShoppingListState = {
  /** Dados brutos por usuário - não usar diretamente */
  dataByUser: Record<string, UserShoppingLists>;
  
  /** @returns Lista de metadados das listas do usuário */
  getLists: (userId: string | null | undefined) => ShoppingListMeta[];
  
  /** @returns ID da lista ativa do usuário */
  getActiveListId: (userId: string | null | undefined) => string;
  
  /** 
   * @returns Itens de uma lista específica ou da lista ativa
   * @param listId - ID da lista (opcional, usa ativa se não fornecido)
   */
  getItems: (userId: string | null | undefined, listId?: string) => ShoppingListItem[];
  
  /** Define a lista ativa do usuário */
  setActiveList: (userId: string | null | undefined, listId: string) => void;
  
  /** 
   * Cria nova lista
   * @returns Falha se nome vazio ou duplicado
   */
  createList: (userId: string | null | undefined, name: string) => ListOperationResult;
  
  /** 
   * Renomeia lista existente
   * @returns Falha se nome vazio, duplicado ou lista não encontrada
   */
  renameList: (
    userId: string | null | undefined,
    listId: string,
    name: string,
  ) => ListOperationResult;
  
  /** 
   * Exclui lista
   * @returns Falha se for a última lista ou não encontrada
   */
  deleteList: (userId: string | null | undefined, listId: string) => ListOperationResult;
  
  /** 
   * Adiciona item à lista
   * @returns Falha se nome vazio ou item duplicado (mesma key normalizada)
   */
  addItem: (
    userId: string | null | undefined,
    name: string,
    quantity?: string,
    listId?: string,
  ) => AddItemResult;
  
  /** Alterna status checked/unchecked de um item */
  toggleChecked: (
    userId: string | null | undefined,
    itemId: string,
    listId?: string,
  ) => void;
  
  /** Remove um item da lista */
  removeItem: (
    userId: string | null | undefined,
    itemId: string,
    listId?: string,
  ) => void;
  
  /** Remove todos os itens marcados como comprados */
  clearChecked: (userId: string | null | undefined, listId?: string) => void;
  
  /** Remove todos os itens da lista */
  clearAll: (userId: string | null | undefined, listId?: string) => void;
  
  /** 
   * Move item para outra lista
   * @returns Falha se mesma lista, item não encontrado ou duplicado na destino
   */
  moveItemToList: (
    userId: string | null | undefined,
    itemId: string,
    targetListId: string,
    sourceListId?: string,
  ) => MoveOrCopyResult;
  
  /** 
   * Copia item para outra lista (cria novo item com novo ID)
   * @returns Falha se mesma lista, item não encontrado ou duplicado na destino
   */
  copyItemToList: (
    userId: string | null | undefined,
    itemId: string,
    targetListId: string,
    sourceListId?: string,
  ) => MoveOrCopyResult;
  
  /** 
   * @returns Snapshot para sincronização com cloud (ou null se sem dados)
   */
  getCloudSnapshot: (
    userId: string | null | undefined,
  ) => ShoppingListsCloudSnapshot | null;
  
  /** 
   * Aplica snapshot vindo da cloud
   * @returns false se snapshot inválido
   */
  applyCloudSnapshot: (
    userId: string | null | undefined,
    snapshot: unknown,
  ) => boolean;
};

export const useShoppingListStore = create<ShoppingListState>()(
  persist(
    (set, get) => {
      const ensureUserData = (
        userId: string | null | undefined,
      ): { ownerKey: string; userData: UserShoppingLists } => {
        const ownerKey = getOwnerKey(userId);
        const state = get();
        if (hasUserData(state.dataByUser, ownerKey)) {
          return {
            ownerKey,
            userData: state.dataByUser[ownerKey],
          };
        }

        const initialized = getDefaultUserDataForOwner(ownerKey);
        set((prev) => ({
          dataByUser: {
            ...(isRecord(prev.dataByUser) ? prev.dataByUser : {}),
            [ownerKey]: initialized,
          },
        }));

        return { ownerKey, userData: initialized };
      };

      return {
        dataByUser: {},
        getLists: (userId) => getUserDataFromState(get().dataByUser, userId).lists,
        getActiveListId: (userId) => getUserDataFromState(get().dataByUser, userId).activeListId,
        getItems: (userId, listId) =>
          getItemsForList(getUserDataFromState(get().dataByUser, userId), listId),
        setActiveList: (userId, listId) => {
        const { ownerKey, userData: current } = ensureUserData(userId);
        if (!current.lists.some((list) => list.id === listId)) return;

        set((state) => ({
          dataByUser: {
            ...(isRecord(state.dataByUser) ? state.dataByUser : {}),
            [ownerKey]: touchUserData(current, { activeListId: listId }),
          },
        }));
      },
      createList: (userId, name) => {
        const trimmed = name.trim();
        if (!trimmed) return { ok: false, reason: "empty" };

        const { ownerKey, userData: current } = ensureUserData(userId);
        const duplicated = current.lists.some(
          (list) => list.name.toLowerCase() === trimmed.toLowerCase(),
        );
        if (duplicated) return { ok: false, reason: "duplicate" };

        const created = createListMeta(trimmed);
        set((state) => ({
          dataByUser: {
            ...(isRecord(state.dataByUser) ? state.dataByUser : {}),
            [ownerKey]: touchUserData(current, {
              lists: [...current.lists, created],
              activeListId: created.id,
              itemsByList: {
                ...current.itemsByList,
                [created.id]: [],
              },
            }),
          },
        }));

        return { ok: true, listId: created.id };
      },
      renameList: (userId, listId, name) => {
        const trimmed = name.trim();
        if (!trimmed) return { ok: false, reason: "empty" };

        const { ownerKey, userData: current } = ensureUserData(userId);
        const target = current.lists.find((list) => list.id === listId);
        if (!target) return { ok: false, reason: "not_found" };

        const duplicated = current.lists.some(
          (list) =>
            list.id !== listId &&
            list.name.toLowerCase() === trimmed.toLowerCase(),
        );
        if (duplicated) return { ok: false, reason: "duplicate" };

        const now = new Date().toISOString();
        set((state) => ({
          dataByUser: {
            ...(isRecord(state.dataByUser) ? state.dataByUser : {}),
            [ownerKey]: touchUserData(current, {
              lists: current.lists.map((list) =>
                list.id === listId ? { ...list, name: trimmed, updated_at: now } : list,
              ),
            }),
          },
        }));

        return { ok: true, listId };
      },
      deleteList: (userId, listId) => {
        const { ownerKey, userData: current } = ensureUserData(userId);
        if (current.lists.length <= 1) return { ok: false, reason: "last_list" };
        if (!current.lists.some((list) => list.id === listId)) {
          return { ok: false, reason: "not_found" };
        }

        const remainingLists = current.lists.filter((list) => list.id !== listId);
        const nextActive =
          current.activeListId === listId ? remainingLists[0].id : current.activeListId;
        const nextItemsByList = { ...current.itemsByList };
        delete nextItemsByList[listId];

        set((state) => ({
          dataByUser: {
            ...(isRecord(state.dataByUser) ? state.dataByUser : {}),
            [ownerKey]: touchUserData(current, {
              lists: remainingLists,
              activeListId: nextActive,
              itemsByList: nextItemsByList,
            }),
          },
        }));

        return { ok: true, listId: nextActive };
      },
      addItem: (userId, name, quantity, listId) => {
        const trimmed = name.trim();
        if (!trimmed) return { ok: false, reason: "empty" };

        const { ownerKey, userData: current } = ensureUserData(userId);
        const safeListId =
          listId && current.itemsByList[listId] ? listId : current.activeListId;
        const normalized = normalizeKey(trimmed);
        const currentItems = getItemsForList(current, safeListId);
        const hasDuplicate = currentItems.some(
          (item) => item.normalized_key === normalized && !item.checked,
        );
        if (hasDuplicate) return { ok: false, reason: "duplicate" };

        const newItem = createListItem(trimmed, quantity);
        const now = new Date().toISOString();
        set((state) => ({
          dataByUser: {
            ...(isRecord(state.dataByUser) ? state.dataByUser : {}),
            [ownerKey]: touchUserData(current, {
              lists: bumpListUpdatedAt(current.lists, [safeListId], now),
              itemsByList: {
                ...current.itemsByList,
                [safeListId]: [newItem, ...currentItems],
              },
            }),
          },
        }));

        return { ok: true, item: newItem };
      },
      toggleChecked: (userId, itemId, listId) => {
        const { ownerKey, userData: current } = ensureUserData(userId);
        const safeListId =
          listId && current.itemsByList[listId] ? listId : current.activeListId;
        const currentItems = getItemsForList(current, safeListId);
        const now = new Date().toISOString();

        set((state) => ({
          dataByUser: {
            ...(isRecord(state.dataByUser) ? state.dataByUser : {}),
            [ownerKey]: touchUserData(current, {
              lists: bumpListUpdatedAt(current.lists, [safeListId], now),
              itemsByList: {
                ...current.itemsByList,
                [safeListId]: currentItems.map((item) =>
                  item.id === itemId
                    ? {
                        ...item,
                        checked: !item.checked,
                        checked_at: !item.checked ? new Date().toISOString() : undefined,
                      }
                    : item,
                ),
              },
            }),
          },
        }));
      },
      removeItem: (userId, itemId, listId) => {
        const { ownerKey, userData: current } = ensureUserData(userId);
        const safeListId =
          listId && current.itemsByList[listId] ? listId : current.activeListId;
        const currentItems = getItemsForList(current, safeListId);
        const now = new Date().toISOString();

        set((state) => ({
          dataByUser: {
            ...(isRecord(state.dataByUser) ? state.dataByUser : {}),
            [ownerKey]: touchUserData(current, {
              lists: bumpListUpdatedAt(current.lists, [safeListId], now),
              itemsByList: {
                ...current.itemsByList,
                [safeListId]: currentItems.filter((item) => item.id !== itemId),
              },
            }),
          },
        }));
      },
      clearChecked: (userId, listId) => {
        const { ownerKey, userData: current } = ensureUserData(userId);
        const safeListId =
          listId && current.itemsByList[listId] ? listId : current.activeListId;
        const currentItems = getItemsForList(current, safeListId);
        const now = new Date().toISOString();

        set((state) => ({
          dataByUser: {
            ...(isRecord(state.dataByUser) ? state.dataByUser : {}),
            [ownerKey]: touchUserData(current, {
              lists: bumpListUpdatedAt(current.lists, [safeListId], now),
              itemsByList: {
                ...current.itemsByList,
                [safeListId]: currentItems.filter((item) => !item.checked),
              },
            }),
          },
        }));
      },
      clearAll: (userId, listId) => {
        const { ownerKey, userData: current } = ensureUserData(userId);
        const safeListId =
          listId && current.itemsByList[listId] ? listId : current.activeListId;
        const now = new Date().toISOString();

        set((state) => ({
          dataByUser: {
            ...(isRecord(state.dataByUser) ? state.dataByUser : {}),
            [ownerKey]: touchUserData(current, {
              lists: bumpListUpdatedAt(current.lists, [safeListId], now),
              itemsByList: {
                ...current.itemsByList,
                [safeListId]: [],
              },
            }),
          },
        }));
      },
      moveItemToList: (userId, itemId, targetListId, sourceListId) => {
        const { ownerKey, userData: current } = ensureUserData(userId);
        const safeSourceListId =
          sourceListId && current.itemsByList[sourceListId]
            ? sourceListId
            : current.activeListId;
        if (!current.itemsByList[targetListId]) return { ok: false, reason: "not_found" };
        if (targetListId === safeSourceListId) return { ok: false, reason: "same_list" };

        const sourceItems = current.itemsByList[safeSourceListId] || [];
        const targetItems = current.itemsByList[targetListId] || [];
        const sourceItem = sourceItems.find((item) => item.id === itemId);
        if (!sourceItem) return { ok: false, reason: "not_found" };

        const hasDuplicate = targetItems.some(
          (item) =>
            item.normalized_key === sourceItem.normalized_key &&
            !item.checked,
        );
        if (hasDuplicate) return { ok: false, reason: "duplicate" };
        const now = new Date().toISOString();

        set((state) => ({
          dataByUser: {
            ...(isRecord(state.dataByUser) ? state.dataByUser : {}),
            [ownerKey]: touchUserData(current, {
              lists: bumpListUpdatedAt(current.lists, [safeSourceListId, targetListId], now),
              itemsByList: {
                ...current.itemsByList,
                [safeSourceListId]: sourceItems.filter((item) => item.id !== itemId),
                [targetListId]: [sourceItem, ...targetItems],
              },
            }),
          },
        }));

        return { ok: true, item: sourceItem };
      },
      copyItemToList: (userId, itemId, targetListId, sourceListId) => {
        const { ownerKey, userData: current } = ensureUserData(userId);
        const safeSourceListId =
          sourceListId && current.itemsByList[sourceListId]
            ? sourceListId
            : current.activeListId;
        if (!current.itemsByList[targetListId]) return { ok: false, reason: "not_found" };
        if (targetListId === safeSourceListId) return { ok: false, reason: "same_list" };

        const sourceItems = current.itemsByList[safeSourceListId] || [];
        const targetItems = current.itemsByList[targetListId] || [];
        const sourceItem = sourceItems.find((item) => item.id === itemId);
        if (!sourceItem) return { ok: false, reason: "not_found" };

        const hasDuplicate = targetItems.some(
          (item) =>
            item.normalized_key === sourceItem.normalized_key &&
            !item.checked,
        );
        if (hasDuplicate) return { ok: false, reason: "duplicate" };

        const copied: ShoppingListItem = {
          ...sourceItem,
          id: generateId(),
          checked: false,
          checked_at: undefined,
          created_at: new Date().toISOString(),
        };
        const now = new Date().toISOString();

        set((state) => ({
          dataByUser: {
            ...(isRecord(state.dataByUser) ? state.dataByUser : {}),
            [ownerKey]: touchUserData(current, {
              lists: bumpListUpdatedAt(current.lists, [targetListId], now),
              itemsByList: {
                ...current.itemsByList,
                [targetListId]: [copied, ...targetItems],
              },
            }),
          },
        }));

        return { ok: true, item: copied };
      },
      getCloudSnapshot: (userId) => {
        const ownerKey = getOwnerKey(userId);
        const state = get();
        if (!hasUserData(state.dataByUser, ownerKey)) return null;
        const current = state.dataByUser[ownerKey];
        return toCloudSnapshot(current);
      },
      applyCloudSnapshot: (userId, snapshot) => {
        const parsed = fromCloudSnapshot(snapshot);
        if (!parsed) return false;

        const ownerKey = getOwnerKey(userId);
        set((state) => ({
          dataByUser: {
            ...(isRecord(state.dataByUser) ? state.dataByUser : {}),
            [ownerKey]: parsed,
          },
        }));

        return true;
      },
    };
    },
    {
      name: "@MyMercado:shopping-list",
      version: 3,
      storage: createJSONStorage(() => localStorage),
      migrate: (persistedState, version) => {
        if (version >= 3) return persistedState as ShoppingListState;

        if (version === 2) {
          const stateV2 = persistedState as { dataByUser?: Record<string, unknown> };
          const rawDataByUser = isRecord(stateV2?.dataByUser) ? stateV2.dataByUser : {};
          const dataByUser: Record<string, UserShoppingLists> = {};

          for (const [ownerKey, rawUserData] of Object.entries(rawDataByUser)) {
            const parsed = getUserDataSafe({ [ownerKey]: rawUserData }, ownerKey);
            dataByUser[ownerKey] = parsed;
          }

          return { dataByUser } as ShoppingListState;
        }

        const oldState = persistedState as { itemsByUser?: Record<string, unknown> };
        const oldItemsByUser = isRecord(oldState?.itemsByUser) ? oldState.itemsByUser : {};
        const dataByUser: Record<string, UserShoppingLists> = {};

        for (const [ownerKey, rawItems] of Object.entries(oldItemsByUser)) {
          dataByUser[ownerKey] = createDefaultUserData(sanitizeItems(rawItems));
        }

        return { dataByUser } as ShoppingListState;
      },
    },
  ),
);
