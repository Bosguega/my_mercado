# My Mercado - Arquitetura

**Data da última atualização:** 31 de março de 2026  
**Status:** ✅ 0 erros TypeScript | ✅ 0 erros ESLint | ✅ Build OK  
**Versão:** 1.0.0

**My Mercado** é um PWA para gerenciamento de compras de supermercado via escaneamento de QR Code em NFC-e.

**Stack principal:** React 18 + TypeScript + Vite + Supabase + React Query + Zustand  
**Persistência:** Supabase (PostgreSQL) → IndexedDB → localStorage (fallback em camadas)

---

## Índice

1. [Visão Geral](#visão-geral)
2. [Arquitetura](#arquitetura)
3. [Estrutura de Pastas](#estrutura-de-pastas)
4. [Fluxo de Dados](#fluxo-de-dados)
5. [Módulos Principais](#módulos-principais)
6. [Componentes](#componentes)
7. [Qualidade](#qualidade)
8. [Performance](#performance)
9. [Deploy](#deploy)
10. [Comandos](#comandos)

---

## Visão Geral

### Tecnologias

| Categoria | Tecnologias |
|-----------|-------------|
| **Frontend** | React 18, TypeScript 5.9, Vite 6 |
| **Estado** | Zustand (UI), React Query (dados) |
| **Backend** | Supabase (PostgreSQL + Auth + RLS) |
| **UI** | Recharts, Lucide React, React Hot Toast |
| **PWA** | vite-plugin-pwa, Service Worker |
| **Scanner** | html5-qrcode (~100KB) |
| **Validação** | Zod |
| **IA** | Google Gemini / OpenAI (BYOK) |

### Bundle Size

| Chunk | Tamanho | Gzip |
|-------|---------|------|
| **Total** | ~1.04MB | ~250KB |
| vendor-scanner | ~100KB | ~35KB |
| vendor-supabase | ~176KB | ~46KB |
| vendor-framework | ~223KB | ~70KB |
| vendor-charts | ~349KB | ~104KB |

---

## Arquitetura

### Diagrama de Camadas

```
┌─────────────────────────────────────────────────────────┐
│  APRESENTAÇÃO: App, Componentes, ErrorBoundary, PWA    │
├─────────────────────────────────────────────────────────┤
│  ESTADO: Zustand (UI) + React Query (Dados) + Zod      │
├─────────────────────────────────────────────────────────┤
│  DOMÍNIO: Services, Pipeline, Analytics, IA, Utils     │
├─────────────────────────────────────────────────────────┤
│  PERSISTÊNCIA: Supabase → IndexedDB → localStorage     │
└─────────────────────────────────────────────────────────┘
```

### Princípios

1. **React Query = Dados** (fonte única da verdade)
2. **Zustand = UI** (estado de interface apenas)
3. **Services = Domínio** (regras de negócio isoladas)
4. **Utils = Pure functions** (funções reutilizáveis)
5. **Fallback automático** (Supabase → IndexedDB → localStorage)

---

## Estrutura de Pastas

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
│   ├── supabaseTest.ts      # Teste de conexão
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

## Fluxo de Dados

### Escaneamento de NFC-e

```text
1. CAPTURA
   Camera/Upload/Link → useReceiptScanner → Validação (Zod)
                              ↓
2. PROCESSAMENTO
   receiptParser (proxies CORS) → productService (Pipeline)
   - Normalização com IA (retry automático)
   - Categorização
   - Match com dicionário
                              ↓
3. PERSISTÊNCIA
   useSaveReceipt (React Query) → receiptService
   - Supabase (primário)
   - IndexedDB (fallback)
   - localStorage (backup)
                              ↓
4. CACHE & RENDER
   React Query invalidates → Componentes leem
   - useAllReceiptsQuery
   - analytics utils
   - UI atualizada
```

### Sincronização entre Dispositivos

```
┌─────────────┐
│   PC        │
│ (logado)    │
│   ↓         │
│ Supabase    │◄────── Sincroniza ──────►│
└─────────────┘                          │
                                         │
┌─────────────┐                          │
│  Celular    │──────────────────────────┘
│  (logado)   │
│   ↓         │
│ Supabase    │
│   ↑         │
│ localStorage│
└─────────────┘
```

**Importante:** Usuário deve logar com a **mesma conta** em ambos os dispositivos.

---

## Módulos Principais

### Services

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

### Utils

#### stringUtils.ts
```typescript
stripVariableInfo(name, unit, qty)  // Remove peso variável
cleanAIName(name)                    // Limpa nome após IA
toSlug(value)                        // Converte para slug
toTitleCase(str)                     // Capitaliza texto
```

#### filters.ts
```typescript
filterBySearch(receipts, search)           // Filtra por busca
filterByPeriod(receipts, period, ...)      // Filtra por período
sortReceipts(receipts, sortBy, sortOrder)  // Ordena receipts
applyReceiptFilters(receipts, search, ...) // Aplica todos os filtros
```

#### dateUtils.ts
```typescript
normalizeManualDate(value)      // DD/MM/YYYY → YYYYMMDD
isValidBRDate(value)            // Valida data BR
formatDateForDisplay(date)      // Formata exibição
```

#### supabaseTest.ts (NOVO)
```typescript
testSupabaseConnection()  // Testa conexão e autenticação
checkAuthentication()     // Verifica se usuário está logado
isSupabaseConfigured()    // Verifica configuração
```

### Validação (Zod)

```typescript
// Schemas principais
receiptItemSchema
receiptSchema
manualReceiptFormSchema
nfcUrlSchema
apiKeySchema
```

---

## Componentes

### ScannerTab

**Estrutura:**
```
ScannerTab/
├── index.tsx                  # Orquestração
├── ScannerTab.types.ts        # Tipos
├── ScannerTab.hooks.ts        # Hooks (useScannerState)
├── screens/
│   ├── IdleScreen.tsx         # Inicial
│   ├── ScanningScreen.tsx     # Câmera
│   ├── LoadingScreen.tsx      # Loading
│   └── ResultScreen.tsx       # Resultado (formato do histórico)
├── forms/
│   └── ManualReceiptForm.tsx  # Entrada manual
├── views/
│   └── ScannerView.tsx        # View (div para html5-qrcode)
└── modals/
    └── DuplicateModal.tsx     # Nota duplicada
```

**Fluxo:**
1. Usuário clica "Escanear" → `startCamera()`
2. html5-qrcode lê QR Code
3. Parse da NFC-e via proxy CORS
4. Pipeline de normalização
5. Salvamento no Supabase + localStorage
6. ResultScreen exibida (card expansível igual ao histórico)
7. Botão "Confirmar e Concluir"

### HistoryTab

**Estrutura:**
```
HistoryTab/
├── index.tsx
├── HistoryTab.types.ts
├── HeaderSection.tsx
├── SummaryCard.tsx
├── EmptyState.tsx
└── ReceiptList.tsx
```

**Funcionalidades:**
- Filtros por período, mercado, busca
- Ordenação por data, valor, nome
- Expandir/recolher receipts
- Backup/restore JSON
- Export CSV

---

## Qualidade

### Error Handling

**Error Boundary Global:**
- Captura erros em toda aplicação
- UI de fallback com opção de recarregar
- Logs detalhados apenas em desenvolvimento

**Retry Automático:**
- IA: 3 tentativas com exponential backoff
- Supabase: Fallback para IndexedDB/localStorage

### Logs

**Todos os logs são condicionais a `import.meta.env.DEV`:**
```typescript
if (import.meta.env.DEV) {
  console.log('📱 [Scanner] ...');
}
```

**Em produção:**
- ✅ Sem logs no console
- ✅ Mensagens de erro amigáveis para usuário
- ✅ Toast notifications informativos

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

## Performance

### Otimizações

- ✅ **Lazy loading** de abas (React.lazy + Suspense)
- ✅ **Code splitting** por vendor
- ✅ **React Query cache** (staleTime: 5min)
- ✅ **Web Worker** para parser
- ✅ **Virtualização** de listas (react-window)
- ✅ **Memoização** de cálculos (useMemo)

### Code Splitting

```javascript
manualChunks(id) {
  if (id.includes('react')) return 'vendor-framework';
  if (id.includes('@supabase')) return 'vendor-supabase';
  if (id.includes('recharts')) return 'vendor-charts';
  if (id.includes('lucide-react')) return 'vendor-ui';
  if (id.includes('html5-qrcode')) return 'vendor-scanner';
}
```

### PWA

**Configuração:**
- `registerType: 'autoUpdate'`
- `cleanupOutdatedCaches: true`
- `cacheId: 'my-mercado-cache-v2'` (cache busting)

**Runtime Caching:**
- Pages: NetworkFirst
- Assets: StaleWhileRevalidate
- Images: StaleWhileRevalidate

---

## Deploy

### GitHub Pages

**Workflow:** `.github/workflows/deploy.yml`

**Requisitos:**
- `VITE_SUPABASE_URL` (GitHub Secret)
- `VITE_SUPABASE_ANON_KEY` (GitHub Secret)

**Deploy:**
1. Push para `main`
2. GitHub Actions roda build
3. Deploy para GitHub Pages
4. PWA atualiza automaticamente

### Variáveis de Ambiente

```env
VITE_SUPABASE_URL=https://seu-projeto.supabase.co
VITE_SUPABASE_ANON_KEY=sb_publishable_...
```

**Importante:** As mesmas variáveis devem estar:
- `.env` (desenvolvimento local)
- GitHub Secrets (produção)

---

## Comandos

### Desenvolvimento

```bash
npm run dev           # Vite dev server (http://localhost:5173)
npm run dev:https     # Com HTTPS (self-signed)
npm run build         # Build production
npm run preview       # Preview build
```

### Qualidade

```bash
npm run typecheck     # TypeScript (0 erros)
npm run lint          # ESLint (0 erros)
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

## Troubleshooting

### Câmera não funciona no celular

**Causa:** APIs de câmera exigem HTTPS.

**Solução:**
- GitHub Pages já tem HTTPS ✅
- Para localhost: use `npm run dev:https` ou ngrok

### Erro 404 ao buscar do Supabase

**Causa:** Tabelas não existem ou RLS bloqueia.

**Solução:**
1. Execute `supabase/supabase_schema.sql` no SQL Editor
2. Verifique se usuário está logado
3. Aguarde 30s (cache do Supabase)

### PWA com dados antigos

**Causa:** Service Worker cacheou versão antiga.

**Solução:**
1. Limpe cache do app nas configurações
2. Reinstale o PWA
3. O cache busting (`-v2`) força novo SW

### Links de NFC-e não funcionam

**Causa:** Proxies CORS instáveis ou NFC-e de outro estado.

**Solução:**
- Use apenas NFC-e de São Paulo (SP)
- Tente entrada manual
- Use upload de imagem do QR Code

---

## Changelog

### 31 de Março de 2026

**Correções:**
- ✅ Remoção de logs de produção (apenas dev)
- ✅ Adicionado teste de conexão com Supabase
- ✅ Mensagens de erro mais amigáveis
- ✅ Cache busting no PWA (v2)
- ✅ Correção de upload de foto (elemento temporário)

**Melhorias:**
- ✅ ResultScreen com formato do histórico
- ✅ Correção de Zustand no useScannerState
- ✅ Sincronização automática ao logar
- ✅ Fallback automático para localStorage

**Novos Arquivos:**
- `utils/supabaseTest.ts` - Teste de conexão
- `utils/stringUtils.ts` - Manipulação de strings
- `utils/filters.ts` - Filtros e ordenação
- `utils/dateUtils.ts` - Utilitários de data

---

**My Mercado - Documentação Atualizada**

*Última atualização: 31 de março de 2026*
