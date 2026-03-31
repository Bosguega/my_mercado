# Relatório de Auditoria Arquitetural

**Data:** 30 de março de 2026  
**Foco:** Stores (Zustand), Hooks Customizados e React Query  
**Objetivo:** Verificar duplicação de responsabilidades, múltiplas fontes de verdade e estados armazenados na camada errada

---

## 📋 Regras Arquiteturais Validadas

1. **React Query** = Única fonte de verdade para dados de negócio e dados persistentes
2. **Zustand** = Apenas estado de interface e sessão visual
3. **Hooks Customizados** = Orquestração e composição (sem duplicação de dados persistentes)

---

## 🔴 Problemas Encontrados

### 1. Duplicação de Dados Persistentes em Hook Customizado

**Arquivo:** `src/hooks/useInfiniteReceipts.ts` ❌ **REMOVIDO**

**Problema:**
```typescript
// LINHA 28 - VIOLAÇÃO ARQUITETURAL
const [receipts, setReceipts] = useState<Receipt[]>([]);
```

O hook estava armazenando dados de receipts (dados persistentes/de negócio) em `useState`, violando a regra de que React Query deve ser a única fonte de verdade.

**Impactos:**
- Duplicação de cache (React Query já faz cache automático)
- Risco de inconsistência de dados entre estados
- Estado desnecessário que precisava de sincronização manual via useEffect
- O hook reinventava a paginação infinita que o React Query já fornece nativamente via `useInfiniteQuery`

**Solução Aplicada:**
- Hook removido do projeto
- Componentes já estavam usando corretamente `useAllReceiptsQuery` e `useInfiniteReceiptsQuery` do React Query

---

## 🟡 Melhorias de Clareza Semântica

### 1. Renomeação de Store

**Arquivo:** `src/stores/useReceiptsStore.ts` → `src/stores/useReceiptsSessionStore.ts` ✅ **RENOMEADO**

**Motivo:**
O nome `useReceiptsStore` sugeria que armazenava dados de receipts, mas na verdade armazenava apenas:
- `sessionUserId` - ID da sessão do usuário (estado de sessão)
- `error` - estado de erro de UI (estado visual)

**Solução Aplicada:**
- Store renomeado para `useReceiptsSessionStore` para refletir sua real responsabilidade
- Todas as importações atualizadas nos arquivos:
  - `src/App.tsx`
  - `src/components/ScannerTab.tsx`
  - `src/components/ShoppingListTab.tsx`

---

## ✅ Validações Positivas

### Stores (Zustand)

| Store | Status | Responsabilidade |
|-------|--------|------------------|
| `useReceiptsSessionStore` | ✅ CORRETO | Estado de sessão e erro de UI |
| `useScannerStore` | ✅ CORRETO | Estado visual do scanner (zoom, torch, manualData, loading, etc.) |
| `useShoppingListStore` | ✅ CORRETO | Lista de compras local (persistência localStorage) |
| `useUiStore` | ✅ CORRETO | Estado de UI (aba ativa, filtros, busca, ordenação, expandedReceipts) |

### Hooks de Query (React Query)

| Hook | Status | Responsabilidade |
|------|--------|------------------|
| `useReceiptsQuery` | ✅ CORRETO | Fonte de verdade para receipts |
| `useInfiniteReceiptsQuery` | ✅ CORRETO | Paginação infinita de receipts |
| `useAllReceiptsQuery` | ✅ CORRETO | Todos os receipts para analytics/backup |
| `useCanonicalProductsQuery` | ✅ CORRETO | Fonte de verdade para produtos canônicos |
| `useSaveReceipt` | ✅ CORRETO | Mutation para salvar receipt |
| `useDeleteReceipt` | ✅ CORRETO | Mutation para deletar receipt |
| `useRestoreReceipts` | ✅ CORRETO | Mutation para restaurar backup |

### Hooks Customizados

| Hook | Status | Responsabilidade |
|------|--------|------------------|
| `useReceiptScanner` | ✅ CORRETO | Orquestração do scanner (usa Zustand para UI, React Query para dados) |
| `useSupabaseSession` | ✅ CORRETO | Gerenciamento de sessão de autenticação |
| `useApiKey` | ✅ CORRETO | Gerenciamento de chave de API (estado local necessário) |
| `useReceiptParserWorker` | ✅ CORRETO | Orquestração de Web Worker |
| `useCurrency` | ✅ CORRETO | Utilitário de formatação/parsing de moeda |
| `usePWAUpdate` | ✅ CORRETO | Detecção de atualização de PWA |
| `usePerformanceMonitor` | ✅ CORRETO | Monitoramento de métricas de performance |

---

## 📁 Arquivos Alterados

| Arquivo | Ação | Motivo |
|---------|------|--------|
| `src/hooks/useInfiniteReceipts.ts` | ❌ Removido | Duplicação de dados persistentes em useState |
| `src/stores/useReceiptsStore.ts` | ✏️ Renomeado | Clareza semântica → `useReceiptsSessionStore.ts` |
| `src/stores/useReceiptsSessionStore.ts` | ✅ Criado | Novo nome semanticamente correto |
| `src/App.tsx` | 🔄 Atualizado | Importação e uso do store renomeado |
| `src/components/ScannerTab.tsx` | 🔄 Atualizado | Importação e uso do store renomeado |
| `src/components/ShoppingListTab.tsx` | 🔄 Atualizado | Importação e uso do store renomeado |
| `src/components/HistoryTab.tsx` | 🔄 Limpo | Remoção de import comentado morto |

---

## 🏗️ Impacto Arquitetural

### Antes
```
┌─────────────────────────────────────────────────────────────┐
│                    CAMADA DE DADOS                          │
├─────────────────────────────────────────────────────────────┤
│  React Query (useReceiptsQuery) ✅                          │
│  useState em useInfiniteReceipts ❌ ← DUPLICAÇÃO            │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│                    CAMADA DE UI                             │
├─────────────────────────────────────────────────────────────┤
│  Zustand (useReceiptsStore) ← NOME CONFUSO                  │
│  Zustand (useScannerStore, useUiStore) ✅                   │
└─────────────────────────────────────────────────────────────┘
```

### Depois
```
┌─────────────────────────────────────────────────────────────┐
│                    CAMADA DE DADOS                          │
├─────────────────────────────────────────────────────────────┤
│  React Query (useReceiptsQuery, useAllReceiptsQuery) ✅     │
│  React Query (useCanonicalProductsQuery) ✅                 │
│  → ÚNICA FONTE DE VERDADE PARA DADOS DE NEGÓCIO             │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│                    CAMADA DE UI                             │
├─────────────────────────────────────────────────────────────┤
│  Zustand (useReceiptsSessionStore) ✅ ← NOME CLARO          │
│  Zustand (useScannerStore) ✅                               │
│  Zustand (useShoppingListStore) ✅                          │
│  Zustand (useUiStore) ✅                                    │
│  → APENAS ESTADO DE INTERFACE E SESSÃO                      │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│                    CAMADA DE ORQUESTRAÇÃO                   │
├─────────────────────────────────────────────────────────────┤
│  Hooks Customizados (useReceiptScanner, etc.) ✅            │
│  → COMPOSIÇÃO SEM DUPLICAÇÃO DE DADOS                       │
└─────────────────────────────────────────────────────────────┘
```

---

## 📊 Resumo da Conformidade

| Princípio | Status |
|-----------|--------|
| React Query como única fonte de verdade para dados persistentes | ✅ CONFORME |
| Zustand apenas para estado de UI e sessão | ✅ CONFORME |
| Hooks customizados sem duplicação de dados | ✅ CONFORME |
| Sem useEffect sincronizando query.data para outro estado | ✅ CONFORME |
| Sem cache duplicado | ✅ CONFORME |
| Nomes semanticamente corretos | ✅ CONFORME |

---

## ✅ Build

Build executado com sucesso sem erros:
```
✓ 3645 modules transformed.
✓ built in 10.06s
```

---

## 🎯 Conclusão

A arquitetura do projeto está **CONFORME** com as regras estabelecidas:

1. **React Query** é a única fonte de verdade para dados de negócio (receipts, canonical products)
2. **Zustand** armazena apenas estado de UI e sessão
3. **Hooks customizados** atuam como orquestração sem duplicar dados persistentes

A única violação encontrada (`useInfiniteReceipts.ts`) foi **removida**, e a renomeação do store (`useReceiptsSessionStore`) melhora a clareza semântica do código.

O projeto segue as melhores práticas de separação de responsabilidades entre camadas de dados, UI e orquestração.
