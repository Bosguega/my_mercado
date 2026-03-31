# My Mercado - Contexto do Projeto

## Visão Geral

**My Mercado** é um PWA (Progressive Web App) para gerenciamento de compras de supermercado. O aplicativo permite escanear QR Codes de NFC-e, acompanhar histórico de compras, comparar preços e economizar dinheiro.

**Status da arquitetura:** ✅ Conforme  
**Última auditoria:** 31 de março de 2026

### Funcionalidades Principais

| Funcionalidade | Descrição |
|----------------|-----------|
| **Scanner** | Escaneie QR Code de NFC-e com câmera, upload ou URL |
| **Histórico** | Visualize todas as compras organizadas com filtros |
| **Busca** | Encontre produtos e compare preços ao longo do tempo |
| **Dicionário** | Gerencie categorias e normalização de produtos |
| **Produtos Canônicos** | Agrupe variações do mesmo produto |
| **Backup** | Exporte/importe dados em CSV ou JSON |

---

## Stack Tecnológico

### Frontend
- **React 18.3** + **TypeScript 5.9** (strict mode)
- **Vite 6** - Build tool e dev server
- **vite-plugin-pwa** - Service Worker e PWA
- **Zustand 5** - Estado global (apenas UI)
- **React Query (TanStack Query 5)** - Cache e sincronização de dados
- **Recharts** - Gráficos e visualização de dados
- **Lucide React** - Ícones
- **React Hot Toast** - Notificações
- **react-window** - Virtualização de listas

### Backend / Persistência
- **Supabase** - PostgreSQL + Auth + RLS (Row Level Security)
- **IndexedDB** - Storage local primário
- **localStorage** - Fallback para offline

### Scanner e Processamento
- **html5-qrcode** - Leitura de QR Code (~100KB)
- **Web Worker** - Parsing de NFC-e em thread separada
- **DOMParser** - Parsing HTML da Sefaz

### Validação e IA
- **Zod** - Validação type-safe de formulários
- **Google Gemini / OpenAI** - IA para normalização (BYOK - Bring Your Own Key)

### Utilitários
- **currency.js** - Formatação monetária
- **date-fns** - Manipulação de datas

---

## Estrutura do Projeto

```
my_mercado/
├── src/
│   ├── components/          # Componentes React
│   │   ├── ScannerTab/      # Scanner reestruturado
│   │   ├── HistoryTab/      # Histórico reestruturado
│   │   ├── SearchTab.tsx
│   │   ├── SettingsTab.tsx
│   │   ├── ShoppingListTab.tsx
│   │   ├── ErrorBoundary.tsx
│   │   └── PWAUpdateNotification.tsx
│   │
│   ├── hooks/               # Hooks personalizados
│   │   ├── queries/         # React Query hooks
│   │   │   ├── useReceiptsQuery.ts
│   │   │   └── useCanonicalProductsQuery.ts
│   │   ├── useReceiptScanner.ts
│   │   └── useSupabaseSession.ts
│   │
│   ├── stores/              # Zustand stores (apenas UI)
│   │   ├── useUiStore.ts
│   │   ├── useScannerStore.ts
│   │   └── useReceiptsSessionStore.ts
│   │
│   ├── services/            # Lógica de negócio
│   │   ├── receiptService.ts
│   │   ├── receiptParser.ts
│   │   ├── productService.ts
│   │   ├── dictionaryService.ts
│   │   ├── canonicalProductService.ts
│   │   ├── storageFallbackService.ts
│   │   └── syncService.ts
│   │
│   ├── utils/               # Funções utilitárias
│   │   ├── validation.ts    # Schemas Zod
│   │   ├── storage.ts       # Storage unificado
│   │   ├── aiClient.ts      # Cliente de IA
│   │   ├── analytics/       # Analytics engine
│   │   ├── filters.ts       # Filtros centralizados
│   │   ├── stringUtils.ts
│   │   └── dateUtils.ts
│   │
│   ├── providers/
│   │   └── QueryProvider.tsx
│   │
│   ├── workers/
│   │   └── receiptParser.worker.ts
│   │
│   ├── types/
│   │   └── domain.ts
│   │
│   ├── App.tsx
│   ├── main.tsx
│   └── config.ts
│
├── supabase/
│   └── migrations/
│       ├── 20260328050000_base_schema.sql
│       ├── 20260328051000_dictionary_rebuild_indexes.sql
│       └── 20260328052000_canonical_products.sql
│
├── scripts/
│   ├── dev.mjs
│   └── testPerformance.js
│
├── public/                  # Assets estáticos
├── .env.example
├── package.json
├── tsconfig.json
├── vite.config.js
└── vitest.config.ts
```

---

## Comandos de Desenvolvimento

### Instalação
```bash
npm install
```

### Desenvolvimento
```bash
npm run dev          # Servidor de desenvolvimento (HTTP)
npm run dev:https    # Servidor de desenvolvimento (HTTPS)
```

### Build e Preview
```bash
npm run build        # Build de produção
npm run preview      # Preview do build
npm run analyze      # Análise do bundle
```

### Type Check e Lint
```bash
npm run typecheck    # Verificação de tipos TypeScript
npm run lint         # ESLint
```

### Testes
```bash
npm run test         # Vitest (watch mode)
npm run test:ui      # Vitest com UI
npm run test:run     # Vitest (single run)
npm run test:perf    # Teste de performance com Lighthouse
```

---

## Configuração

### Variáveis de Ambiente

Copie `.env.example` para `.env` e configure:

```bash
# Supabase (obrigatório para produção)
VITE_SUPABASE_URL=sua_url_aqui
VITE_SUPABASE_ANON_KEY=sua_chave_aqui

# SSL para desenvolvimento (opcional)
VITE_SSL_CERT_PATH=caminho/para/cert.pem
VITE_SSL_KEY_PATH=caminho/para/key.pem
VITE_BASIC_SSL=true
```

### Setup do Supabase

1. Crie uma conta em [supabase.com](https://supabase.com/)
2. Crie um novo projeto
3. Execute o script de migração no SQL Editor:
   ```bash
   # Execute os arquivos em ordem:
   supabase/migrations/20260328050000_base_schema.sql
   supabase/migrations/20260328051000_dictionary_rebuild_indexes.sql
   supabase/migrations/20260328052000_canonical_products.sql
   ```
4. Copie as credenciais para `.env`

### Configuração de IA (Opcional)

O app usa IA para normalização de produtos. Configure via UI:
- Acesse a aba "Ajustes"
- Clique em "Configurar API Key"
- Insira sua chave (Google Gemini ou OpenAI)
- A chave é salva em `sessionStorage`

---

## Arquitetura

### Camadas da Aplicação

```
┌─────────────────────────────────────────────────────────┐
│                    APRESENTAÇÃO                         │
│  App.tsx + Componentes + Error Boundary + A11y         │
├─────────────────────────────────────────────────────────┤
│                      ESTADO                             │
│  Zustand (UI) + React Query (Dados) + Validação (Zod)  │
├─────────────────────────────────────────────────────────┤
│                   LÓGICA DE DOMÍNIO                     │
│  Services + Pipeline + Analytics + IA + Utils          │
├─────────────────────────────────────────────────────────┤
│                    PERSISTÊNCIA                         │
│  Supabase → IndexedDB → localStorage (Fallback)        │
└─────────────────────────────────────────────────────────┘
```

### Princípios de Arquitetura

1. **React Query = Dados** - Fonte única de verdade para dados remotos
2. **Zustand = UI** - Apenas estado de interface (abas, filtros, modais)
3. **Hooks = Orquestração** - Hooks coordenam services e stores
4. **Services = Lógica** - Funções puras de negócio
5. **Utils = Funções** - Funções utilitárias reutilizáveis
6. **Fallback em Camadas** - Supabase → IndexedDB → localStorage
7. **Type-Safe** - TypeScript strict em todo o código
8. **Validação** - Zod schemas para todos os formulários

### Fluxo de Dados Principal

```
1. CAPTURA
   Camera/Upload/Link → useReceiptScanner → Validação (Zod)
                              ↓
2. PROCESSAMENTO
   receiptParser (Web Worker) → productService (Pipeline + IA)
                              ↓
3. PERSISTÊNCIA
   useSaveReceipt (React Query) → receiptService
   → Supabase (primário) → IndexedDB (fallback)
                              ↓
4. CACHE & RENDER
   React Query invalidates → Componentes leem → UI atualizada
```

### Matriz de Dependências

| Quero alterar | Arquivo principal | Arquivos de apoio |
|---------------|-------------------|-------------------|
| Escaneamento | `hooks/useReceiptScanner.ts` | `stores/useScannerStore.ts`, `utils/validation.ts` |
| CRUD de notas | `hooks/queries/useReceiptsQuery.ts` | `services/receiptService.ts`, `services/storageFallbackService.ts` |
| Estado de UI | `stores/useUiStore.ts` | Componentes `*Tab.tsx` |
| Filtros HistoryTab | `hooks/queries/useHistoryReceipts.ts` | `utils/filters.ts`, `stores/useUiStore.ts` |
| Filtros SearchTab | `components/SearchTab.tsx` | `utils/filters.ts`, `stores/useUiStore.ts` |
| Dicionário | `components/DictionaryTab.tsx` | `services/dictionaryService.ts` |
| Produtos canônicos | `hooks/queries/useCanonicalProductsQuery.ts` | `services/canonicalProductService.ts` |
| Filtros/Ordenação | `utils/filters.ts` | `components/HistoryTab/`, `components/SearchTab.tsx` |
| Validação | `utils/validation.ts` | Schemas Zod |
| IA | `utils/aiClient.ts` | `services/productService.ts` |
| PWA Update | `hooks/usePWAUpdate.ts` | Service Worker |

---

## Modelo de Dados

### Tabelas Principais (Supabase)

#### `receipts` - Notas Fiscais
```sql
id: text (PK)
establishment: text
date: timestamp
user_id: uuid (FK → auth.users)
created_at: timestamp
```

#### `items` - Itens da Nota
```sql
id: uuid (PK)
receipt_id: text (FK → receipts)
name: text (original SEFAZ)
normalized_key: text
normalized_name: text
category: text
canonical_product_id: uuid (FK → canonical_products)
quantity: numeric
unit: text
price: numeric
```

#### `product_dictionary` - Dicionário de Produtos
```sql
user_id: uuid (FK)
key: text (PK com user_id)
normalized_name: text
category: text
canonical_product_id: uuid (FK)
```

#### `canonical_products` - Produtos Canônicos
```sql
id: uuid (PK)
slug: text (unique)
name: text
category: text
brand: text
user_id: uuid (FK)
merge_count: integer
```

### Row Level Security (RLS)

Todas as tabelas têm RLS habilitado. Políticas garantem que:
- Usuários veem apenas seus próprios dados
- Operações de CRUD são restritas ao `user_id` do usuário autenticado

---

## Convenções de Desenvolvimento

### TypeScript

- **Strict mode** habilitado no `tsconfig.json`
- Tipos explícitos para props de componentes
- Interfaces em `types/domain.ts` e `types/ui.ts`
- Generics para funções utilitárias

### Estilo de Código

- **ESLint** com configurações para React e TypeScript
- Variáveis não utilizadas com prefixo `_` são ignoradas
- Arrow functions para componentes e hooks
- Nomes descritivos e em inglês para código

### Componentes

```tsx
// Estrutura padrão
interface Props {
  // props tipadas
}

export function ComponentName({ prop1, prop2 }: Props) {
  // Hooks primeiro
  // Lógica depois
  // Render por último
  return <div>...</div>;
}
```

### Hooks Personalizados

```typescript
// Prefixo "use" para hooks
// Retorno tipado
export function useCustomHook(param: string): ReturnType {
  // Lógica
  return { data, loading, error };
}
```

### Services

```typescript
// Funções puras sempre que possível
// Tratamento de erro no caller
export async function serviceFunction(param: Type): Promise<Result> {
  // Lógica de negócio
  // Sem efeitos colaterais de UI
}
```

### Testes

- **Vitest** como framework de testes
- Arquivos de teste com sufixo `.test.ts`
- Testes unitários para utils e services
- Testes de integração para hooks críticos

---

## Error Handling

### Error Boundary Global

`ErrorBoundary.tsx` captura erros em toda a aplicação:
- Renderiza fallback amigável
- Loga erros em desenvolvimento
- Permite recuperação sem reload

### Retry Automático

- **React Query**: Retry configurável para falhas de rede
- **IA Client**: Retry automático com backoff exponencial
- **Storage Fallback**: Degradação graciosa para offline

### Logs

```typescript
// Apenas em desenvolvimento
if (import.meta.env.DEV) {
  console.log('Debug info:', data);
}
```

---

## Performance

### Otimizações Implementadas

- **Lazy Loading**: Abas carregadas sob demanda
- **Code Splitting**: Chunks separados por vendor
- **Virtualização**: Listas longas com react-window
- **Cache**: React Query com staleTime configurado
- **Web Worker**: Parsing pesado em thread separada
- **PWA**: Service Worker para cache de assets

### Bundle Size

| Categoria | Tamanho (aprox.) |
|-----------|------------------|
| React + DOM | ~225KB |
| Recharts | ~349KB |
| Supabase | ~176KB |
| React Query | ~83KB |
| Scanner | ~100KB |
| **Total** | **~1.04MB** (gzip: ~250KB) |

### PWA e Service Worker

- **Cache busting v2** - Versão do cache no `vite.config.js`
- **NetworkFirst** para navegação
- **StaleWhileRevalidate** para assets
- **Atualização automática** com notificação ao usuário

---

## Acessibilidade (A11y)

- **ARIA labels** em botões e navegação
- **aria-current** para navegação ativa
- **Navegação por teclado** em todos os elementos
- **Focus management** em modais e dialogs
- **Contraste de cores** adequado

---

## Deploy

### GitHub Pages

1. Configure `VITE_SUPABASE_*` como **secrets** do repositório
2. Workflow automático em `.github/workflows/`
3. Build publicado em `gh-pages` branch

### Variáveis para Deploy

```yaml
# GitHub Actions → Secrets
VITE_SUPABASE_URL: https://xxx.supabase.co
VITE_SUPABASE_ANON_KEY: eyJxxx
```

---

## Troubleshooting

### App em branco no GitHub Pages

1. Verifique secrets configurados
2. Aguarde workflow completar
3. Limpe cache do navegador (Application → Clear storage)

### Erro de autenticação

- Verifique credenciais do Supabase
- Confirme RLS policies configuradas
- Execute migrations no SQL Editor

### Dados não sincronizam

- Verifique conexão com internet
- Dados são salvos localmente (IndexedDB)
- Sincronização ocorre quando online

### Scanner não funciona

- Requer HTTPS (exceto localhost)
- Permissão de câmera necessária
- Use `npm run dev:https` para testes

---

## Arquivos de Documentação

| Arquivo | Descrição |
|---------|-----------|
| `README.md` | Visão geral e guia rápido |
| `ARCHITECTURE.md` | Documentação técnica detalhada (2059 linhas) |
| `AUDIT_REPORT.md` | Relatórios de auditoria de código |
| `QWEN.md` | Este arquivo - contexto para IA |

---

## Links Úteis

- **Repositório**: https://github.com/Bosguega/my_mercado
- **Supabase**: https://supabase.com
- **React Query**: https://tanstack.com/query
- **Zustand**: https://zustand-demo.pmnd.rs
- **Vite PWA**: https://vite-pwa-org.netlify.app

---

## Resumo para IA

Ao ajudar com este projeto:

1. **Sempre verifique** `ARCHITECTURE.md` para detalhes de implementação
2. **Respeite a separação**: React Query (dados) vs Zustand (UI)
3. **Use TypeScript strict** - sem `any` implícitos
4. **Valide com Zod** - formulários e inputs externos
5. **Considere offline** - fallback em camadas
6. **Teste mudanças** - execute `typecheck` e `lint`
7. **Mantenha A11y** - ARIA labels e navegação por teclado
8. **Performance importa** - lazy loading e code splitting
