# My Mercado - Arquitetura

**Data da última atualização:** 31 de março de 2026  
**Status:** ✅ 0 erros TypeScript | ✅ 0 erros ESLint | ✅ Build OK  
**Última auditoria:** [Ver relatório completo](#auditoria-técnica)

**My Mercado** é um PWA para gerenciamento de compras de supermercado via escaneamento de QR Code em NFC-e.

**Stack principal:** React 18 + TypeScript + Vite + Supabase + React Query + Zustand  
**Persistência:** Supabase (PostgreSQL) → IndexedDB → localStorage (fallback em camadas)

---

## Índice Rápido

1. [Arquitetura](#arquitetura)
2. [Estrutura](#estrutura)
3. [Serviços](#serviços)
4. [Hooks](#hooks)
5. [Utils](#utils)
6. [Qualidade](#qualidade)
7. [Comandos](#comandos)

---

## Arquitetura

### Diagrama de Camadas

```
┌─────────────────────────────────────────────────────────┐
│  APRESENTAÇÃO: App, Componentes, ErrorBoundary, PWA    │
├─────────────────────────────────────────────────────────┤
│  ESTADO: Zustand (UI) + React Query (Dados) + Zod      │
├─────────────────────────────────────────────────────────┤
│  DOMÍNIO: Services, Pipeline, Analytics, IA            │
├─────────────────────────────────────────────────────────┤
│  PERSISTÊNCIA: Supabase → IndexedDB → localStorage     │
└─────────────────────────────────────────────────────────┘
```

### Regras de Arquitetura

| Camada | Tecnologia | Responsabilidade |
|--------|------------|------------------|
| **Dados** | React Query | Cache, sincronização, queries |
| **UI** | Zustand | Estado de interface (abas, filtros, scanner) |
| **Validação** | Zod | Schemas de formulários |
| **Domínio** | Services | Regras de negócio |
| **Persistência** | Supabase + IndexedDB | Storage em camadas |

### Princípios

1. **React Query = Dados** (fonte única da verdade)
2. **Zustand = UI** (estado de interface apenas)
3. **Services = Domínio** (regras de negócio isoladas)
4. **Utils = Pure functions** (funções reutilizáveis)
5. **Fallback automático** (Supabase → IndexedDB → localStorage)

---

## Estrutura

```
src/
├── components/
│   ├── ScannerTab/          # Escaneamento de NFC-e
│   │   ├── index.tsx
│   │   ├── ScannerTab.types.ts
│   │   ├── ScannerTab.hooks.ts
│   │   ├── screens/         # Idle, Scanning, Loading, Result
│   │   ├── forms/           # ManualReceiptForm
│   │   ├── views/           # ScannerView
│   │   └── modals/          # DuplicateModal
│   ├── HistoryTab/          # Histórico de compras
│   │   ├── index.tsx
│   │   ├── HistoryTab.types.ts
│   │   ├── HeaderSection.tsx
│   │   ├── SummaryCard.tsx
│   │   ├── EmptyState.tsx
│   │   └── ReceiptList.tsx
│   ├── SearchTab.tsx        # Busca e tendência de preços
│   ├── ShoppingListTab.tsx  # Lista de compras
│   ├── SettingsTab.tsx      # Configurações (API Key, backup)
│   ├── CanonicalProductsTab.tsx  # Produtos canônicos
│   ├── DictionaryTab.tsx    # Dicionário de produtos
│   ├── Login.tsx            # Autenticação
│   ├── ErrorBoundary.tsx    # Captura erros globais
│   └── PWAUpdateNotification.tsx
├── hooks/
│   ├── queries/             # React Query hooks
│   │   ├── useReceiptsQuery.ts
│   │   └── useCanonicalProductsQuery.ts
│   ├── useReceiptScanner.ts # Scanner orchestration
│   ├── usePWAUpdate.ts
│   ├── useCurrency.ts
│   └── useSupabaseSession.ts
├── stores/
│   ├── useUiStore.ts        # Abas, filtros, busca
│   ├── useScannerStore.ts   # Estado do scanner
│   ├── useShoppingListStore.ts
│   └── useReceiptsSessionStore.ts
├── services/
│   ├── index.ts             # Export unificado
│   ├── authService.ts       # Autenticação
│   ├── receiptService.ts    # CRUD de receipts
│   ├── dictionaryService.ts # CRUD de dicionário
│   ├── canonicalProductService.ts  # Produtos canônicos
│   ├── storageFallbackService.ts   # Fallback local
│   ├── syncService.ts       # Sincronização
│   ├── productService.ts    # Pipeline de normalização
│   ├── receiptParser.ts     # Parse de NFC-e
│   └── supabaseClient.ts
├── utils/
│   ├── stringUtils.ts       # Manipulação de strings
│   ├── filters.ts           # Filtros e ordenação
│   ├── dateUtils.ts         # Utilitários de data
│   ├── validation.ts        # Schemas Zod
│   ├── storage.ts           # Storage unificado
│   ├── aiClient.ts          # IA (Gemini/OpenAI)
│   ├── analytics/           # Agregação e análise
│   ├── currency.ts
│   ├── normalize.ts
│   └── receiptId.ts
├── types/
│   ├── domain.ts
│   ├── ui.ts
│   └── ai.ts
├── workers/
│   └── receiptParser.worker.ts
├── providers/
│   └── QueryProvider.tsx
├── App.tsx
└── main.tsx
```

---

## Serviços

### Visão Geral

| Serviço | Responsabilidade | Funções Principais |
|---------|------------------|-------------------|
| **authService** | Autenticação | `requireSupabase()`, `getUserOrThrow()` |
| **receiptService** | CRUD receipts | `saveReceiptToDB()`, `getReceiptsPaginated()` |
| **dictionaryService** | Dicionário | `getDictionary()`, `updateDictionary()` |
| **canonicalProductService** | Produtos VIP | `createCanonicalProduct()`, `mergeCanonicalProducts()` |
| **storageFallbackService** | Fallback | `getAllReceiptsFromDBWithFallback()` |
| **syncService** | Sincronização | `syncLocalStorageWithSupabase()` |
| **productService** | Pipeline | `processItemsPipeline()` |
| **receiptParser** | Parse NFC-e | `parseNFCeSP()` |

### Exemplo de Uso

```typescript
import { saveReceiptToDB, getDictionary } from "./services";

// Salvar receipt
const receipt = await saveReceiptToDB(receiptData, items);

// Buscar dicionário
const dictionary = await getDictionary(keys);
```

---

## Hooks

### React Query (Dados)

```typescript
// Receipts
const { data: receipts = [] } = useAllReceiptsQuery();
const saveMutation = useSaveReceipt();
const deleteMutation = useDeleteReceipt();

// Produtos Canônicos
const { data: products = [] } = useCanonicalProductsQuery();
const createMutation = useCreateCanonicalProduct();
```

### Zustand (UI)

```typescript
// UI Store
const tab = useUiStore((state) => state.tab);
const setTab = useUiStore((state) => state.setTab);

// Scanner Store
const scanning = useScannerStore((state) => state.scanning);
const resetScanner = useScannerStore((state) => state.resetScannerState);
```

### Custom Hooks

| Hook | Responsabilidade |
|------|------------------|
| `useReceiptScanner` | Orquestração do scanner (câmera, upload, parse) |
| `useCurrency` | Formatação monetária (currency.js) |
| `usePWAUpdate` | Detecta updates do Service Worker |
| `useSupabaseSession` | Gerencia sessão de autenticação |
| `useApiKey` | Gerencia API Key de IA |

---

## Utils

### stringUtils.ts

```typescript
stripVariableInfo(name, unit, qty)  // Remove peso variável
cleanAIName(name)                    // Limpa nome após IA
toSlug(value)                        # Converte para slug
toTitleCase(str)                     # Capitaliza texto
removeAccents(str)                   # Remove acentos
truncate(str, length)                # Trunca string
```

### filters.ts

```typescript
filterBySearch(receipts, search)           # Filtra por busca
filterByPeriod(receipts, period, ...)      # Filtra por período
sortReceipts(receipts, sortBy, sortOrder)  # Ordena receipts
applyReceiptFilters(receipts, search, filters)  # Aplica tudo
filterItemsBySearch(items, search, fields) # Filtra items genéricos
sortItems(items, sortBy, direction)        # Ordena items
```

### dateUtils.ts

```typescript
normalizeManualDate(value)      # DD/MM/YYYY → YYYYMMDD
isValidBRDate(value)            # Valida data BR
formatDateForDisplay(date)      # Formata exibição
getCurrentDateBR()              # Data atual
extractYearMonth(isoDate)       # Extrai ano/mês
```

### validation.ts (Zod)

```typescript
validateManualReceiptForm(data)  # Valida formulário manual
validateReceiptItem(data)        # Valida item
validateNfcUrl(url)              # Valida URL NFC-e
validateApiKey(key)              # Valida API Key
```

---

## Qualidade

### Error Handling

**Error Boundary Global** (`ErrorBoundary.tsx`):
- Captura erros em toda aplicação
- UI de fallback com opção de recarregar
- Logs detalhados em desenvolvimento

**Retry Automático**:
- IA: 3 tentativas com exponential backoff
- Supabase: Fallback para IndexedDB/localStorage

### Validação

**Zod schemas** para todos os formulários:

```typescript
import { validateManualReceiptForm } from "./utils/validation";

const validation = validateManualReceiptForm(formData);
if (!validation.success) {
  validation.errors.forEach(err => toast.error(err));
  return;
}
// validation.data tem tipos corretos
```

### Testes

```bash
# Watch mode
npm run test

# CI mode
npm run test:run

# Com coverage
npm run test:run -- --coverage
```

**Arquivos testados:**
- `utils/currency.test.ts` - 100% coverage
- `utils/normalize.test.ts` - 100% coverage

---

## Comandos

### Desenvolvimento

```bash
npm run dev           # Vite dev server
npm run dev:https     # Com HTTPS
npm run build         # Build production
npm run preview       # Preview build
```

### Qualidade

```bash
npm run typecheck     # TypeScript (✅ 0 erros)
npm run lint          # ESLint (✅ 0 erros)
npm run test          # Vitest watch
npm run test:run      # Vitest CI
```

### Performance

```bash
npm run analyze       # Bundle analyzer
npm run lighthouse    # Lighthouse report
npm run test:perf     # Performance test
```

---

## Matriz de Tarefas

| Quero alterar | Arquivo principal | Apoio |
|---------------|-------------------|-------|
| Escaneamento | `hooks/useReceiptScanner.ts` | `stores/useScannerStore.ts` |
| CRUD receipts | `hooks/queries/useReceiptsQuery.ts` | `services/receiptService.ts` |
| Estado de UI | `stores/useUiStore.ts` | Componentes |
| Filtros | `utils/filters.ts` | `components/HistoryTab/` |
| Dicionário | `services/dictionaryService.ts` | `components/DictionaryTab.tsx` |
| Produtos VIP | `services/canonicalProductService.ts` | `hooks/queries/useCanonicalProductsQuery.ts` |
| IA | `utils/aiClient.ts` | `services/productService.ts` |
| Validação | `utils/validation.ts` | Formulários |
| Storage | `utils/storage.ts` | `services/storageFallbackService.ts` |

---

## Auditoria Técnica

### 31 de Março de 2026 - Melhorias Realizadas

#### Correções Críticas (Prioridade 1) ✅

| Problema | Solução | Status |
|----------|---------|--------|
| 6 erros TypeScript | Corrigir imports e tipos | ✅ |
| 15 erros ESLint | Remover código morto | ✅ |
| Props não utilizadas | Remover ou usar | ✅ |
| Imports quebrados | Corrigir paths | ✅ |

#### Melhorias Estruturais (Prioridade 2) ✅

| Ação | Resultado |
|------|-----------|
| Criar `utils/stringUtils.ts` | Centralizar manipulação de strings |
| Criar `utils/filters.ts` | Centralizar filtros e ordenação |
| Criar `utils/dateUtils.ts` | Centralizar utilitários de data |
| Refatorar `productService.ts` | Usar utils centralizados |
| Refatorar `HistoryTab/index.tsx` | Usar `applyReceiptFilters` |

#### Métricas de Qualidade

| Métrica | Antes | Depois |
|---------|-------|--------|
| Erros TypeScript | 6 | **0** |
| Erros ESLint | 15 | **0** |
| Build | ❌ Falhava | ✅ OK |
| Código duplicado | 3 blocos | **Centralizado** |

#### Arquivos Modificados

- `ScannerTab.types.ts` - Import path
- `ScanningScreen.tsx` - Props interface
- `HistoryTab.types.ts` - Tipos e imports
- `HeaderSection.tsx` - Import path
- `EmptyState.tsx` - Remover prop
- `ScannerTab.hooks.ts` - Params prefix
- `ScannerTab/index.tsx` - Imports e props
- `HistoryTab/index.tsx` - Usa filters centralizados
- `receiptService.ts` - Remove import
- `canonicalProductService.ts` - Remove import
- `dictionaryService.ts` - Remove interface vazia
- `productService.ts` - Usa stringUtils

#### Arquivos Criados

- `utils/stringUtils.ts` - Manipulação de strings
- `utils/filters.ts` - Filtros e ordenação
- `utils/dateUtils.ts` - Utilitários de data

---

## Changelog

### Março 2026

**31/03/2026 - Refatoração Geral**
- ✅ Correção de 6 erros TypeScript
- ✅ Correção de 15 erros ESLint
- ✅ Criação de utils centralizados (stringUtils, filters, dateUtils)
- ✅ Remoção de código duplicado
- ✅ Build validado sem erros

**Refatorações Anteriores**
- ✅ Serviços modularizados (6 arquivos especializados)
- ✅ ScannerTab reestruturado em subcomponentes
- ✅ HistoryTab reestruturado em seções
- ✅ Separação React Query (dados) vs Zustand (UI)

---

## Links Úteis

- [README.md](README.md) - Visão geral do projeto
- [ARCHITECTURE.md](ARCHITECTURE.md) - Este arquivo
- [Supabase Dashboard](https://supabase.com/dashboard) - Banco de dados
- [Vite Docs](https://vitejs.dev/) - Build tool
- [React Query Docs](https://tanstack.com/query) - Cache de dados
- [Zustand Docs](https://zustand-demo.pmnd.rs/) - Estado global
