# Plano de Migração: Zustand → React Query

## Problema Atual

### Duplicações Identificadas

| Funcionalidade | Zustand (useReceiptsStore) | React Query (useReceiptsQuery) |
|----------------|---------------------------|-------------------------------|
| Estado de receipts | `savedReceipts: Receipt[]` | Cache do React Query |
| Carregar receipts | `loadReceipts()` | `useReceiptsQuery()` / `useInfiniteReceiptsQuery()` |
| Salvar receipt | `saveReceipt()` | `useSaveReceipt()` |
| Deletar receipt | `deleteReceipt()` | `useDeleteReceipt()` |
| localStorage sync | Manual em cada ação | Não implementado |

### Riscos
1. **Duplicação de estado** - Dois caches independentes
2. **Inconsistência** - UI pode mostrar dados desatualizados
3. **Complexidade** - Manter dois sistemas sincronizados

## Solução Proposta

### React Query = Fonte única da verdade para dados remotos
### Zustand = Apenas estado de UI

## Arquitetura Final

### Zustand (useReceiptsStore.ts) - APENAS UI
```typescript
type ReceiptsUiState = {
  sessionUserId: string | null;
  setSessionUserId: (userId: string | null) => void;
  error: unknown;
  clearError: () => void;
};
```

### React Query (useReceiptsQuery.ts) - DADOS
```typescript
// Queries
useReceiptsQuery() - Lista paginada
useInfiniteReceiptsQuery() - Lista infinita
useAllReceiptsQuery() - Todos os receipts (para analytics)

// Mutations
useSaveReceipt() - Salvar com detecção de duplicata
useDeleteReceipt() - Deletar
useRestoreReceipts() - Restaurar backup

// Utilities
usePrefetchReceipt() - Prefetch de receipt específico
```

## Migração Passo a Passo

### Fase 1: Preparação
- [x] Criar hook `useAllReceiptsQuery` para analytics (SearchTab, HistoryTab)
- [x] Adicionar lógica de detecção de duplicata em `useSaveReceipt`
- [x] Adicionar fallback localStorage no React Query
- [x] Adicionar invalidação de cache após mutations

### Fase 2: Migração de Componentes
- [x] **App.tsx** - Remover loadReceipts, usar prefetch do React Query
- [x] **HistoryTab.tsx** - Usar useInfiniteReceiptsQuery + mutations
- [x] **ScannerTab.tsx** - Usar useSaveReceipt mutation
- [x] **SearchTab.tsx** - Usar useAllReceiptsQuery
- [x] **DictionaryTab.tsx** - Usar mutations do React Query

### Fase 3: Limpeza
- [x] Remover `savedReceipts` do Zustand
- [x] Remover `loadReceipts`, `saveReceipt`, `deleteReceipt` do Zustand
- [x] Remover `setSavedReceipts` do Zustand
- [x] Remover localStorage manual do Zustand
- [x] Atualizar tipos do Zustand

### Fase 4: Validação
- [x] Testar build da aplicação (npm run build)
- [ ] Testar fluxo de escaneamento
- [ ] Testar histórico com filtros
- [ ] Testar busca de preços
- [ ] Testar dicionário
- [ ] Testar backup/restore
- [ ] Testar offline/online sync

## Benefícios Esperados

1. **Single Source of Truth** - React Query gerencia cache de dados
2. **Cache Inteligente** - Stale time, refetch on focus, etc.
3. **Optimistic Updates** - UI mais responsiva
4. **Menos Código** - Remove ~100 linhas de lógica duplicada
5. **Melhor DX** - DevTools do React Query

## Riscos e Mitigações

| Risco | Mitigação |
|-------|-----------|
| Perda de dados offline | Manter localStorage como fallback no React Query |
| Performance em listas grandes | Usar paginação infinita já implementada |
| Complexidade de cache | Usar query keys bem estruturadas |

## Rollback Plan

Se algo falhar:
1. Reverter para commit anterior
2. Manter Zustand como backup temporário
3. Investigar e corrigir antes de nova tentação