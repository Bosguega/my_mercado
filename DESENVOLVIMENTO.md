# 🛠️ Guia de Desenvolvimento - My Mercado

Este documento fornece informações técnicas para desenvolvedores que trabalham no My Mercado.

## 📋 Índice

- [Arquitetura](#arquitetura)
- [Estrutura de Pastas](#estrutura-de-pastas)
- [Fluxo de Dados](#fluxo-de-dados)
- [Como Adicionar...](#como-adicionar)
- [Debugging](#debugging)
- [Performance](#performance)

---

## 🏗️ Arquitetura

### Camadas

```
┌─────────────────────────────────────────┐
│         APRESENTAÇÃO (Components)       │
│  - Componentes React                    │
│  - Error Boundaries                     │
│  - A11y (Acessibilidade)                │
├─────────────────────────────────────────┤
│           ESTADO (Hooks/Stores)         │
│  - Zustand (UI state)                   │
│  - React Query (Server state)           │
│  - Validação (Zod)                      │
├─────────────────────────────────────────┤
│         LÓGICA (Services/Utils)         │
│  - Services (Regras de negócio)         │
│  - Utils (Funções puras)                │
│  - IA Client                            │
├─────────────────────────────────────────┤
│         PERSISTÊNCIA (Data)             │
│  - Supabase (PostgreSQL + Auth)         │
│  - IndexedDB (Offline)                  │
│  - localStorage (Fallback)              │
└─────────────────────────────────────────┘
```

### Princípios

1. **React Query = Dados** - Fonte única de verdade para dados remotos
2. **Zustand = UI** - Apenas estado de interface
3. **Hooks = Orquestração** - Coordenam services e stores
4. **Services = Lógica** - Funções de negócio
5. **Utils = Funções** - Funções utilitárias reutilizáveis
6. **Fallback em Camadas** - Supabase → IndexedDB → localStorage

---

## 📁 Estrutura de Pastas

```
my_mercado/
├── .github/                    # GitHub Actions, templates
│   ├── workflows/
│   │   ├── ci-cd.yml          # Pipeline CI/CD
│   │   └── audit.yml          # Auditoria semanal
│   ├── ISSUE_TEMPLATE.md
│   └── PULL_REQUEST_TEMPLATE.md
│
├── .husky/                     # Git hooks
│   ├── pre-commit
│   └── commit-msg
│
├── src/
│   ├── components/             # Componentes React
│   │   ├── ShoppingListTab/   # Componentes da lista
│   │   ├── HistoryTab/        # Componentes do histórico
│   │   ├── ScannerTab/        # Componentes do scanner
│   │   └── *.tsx              # Outros componentes
│   │
│   ├── hooks/                  # Hooks personalizados
│   │   ├── queries/           # React Query hooks
│   │   ├── shoppingList/      # Hooks da lista
│   │   ├── canonicalProduct/  # Hooks de produtos
│   │   └── *.ts               # Outros hooks
│   │
│   ├── services/               # Lógica de negócio
│   │   ├── receiptService.ts
│   │   ├── productService.ts
│   │   ├── dictionaryService.ts
│   │   └── *.ts
│   │
│   ├── stores/                 # Zustand stores (UI only)
│   │   ├── useUiStore.ts
│   │   ├── useScannerStore.ts
│   │   └── useShoppingListStore.ts
│   │
│   ├── utils/                  # Funções utilitárias
│   │   ├── ai/                # AI clients
│   │   ├── analytics/         # Analytics
│   │   ├── validation/        # Schemas Zod
│   │   └── *.ts
│   │
│   ├── types/                  # Tipos TypeScript
│   │   ├── domain.ts
│   │   ├── ui.ts
│   │   ├── history.ts
│   │   └── scanner.ts
│   │
│   ├── providers/              # React providers
│   │   └── QueryProvider.tsx
│   │
│   ├── workers/                # Web Workers
│   │   └── receiptParser.worker.ts
│   │
│   ├── constants/              # Constantes
│   │   └── domain.ts
│   │
│   ├── App.tsx                 # Componente raiz
│   └── main.tsx                # Entry point
│
├── supabase/
│   └── migrations/             # Scripts SQL
│
├── scripts/                    # Scripts de dev
│
├── public/                     # Assets estáticos
│
└── *.md                        # Documentação
```

---

## 🔄 Fluxo de Dados

### 1. CAPTURA (Scanner)

```
Camera/Upload/Link
    ↓
useReceiptScanner (hook)
    ↓
Validação (Zod)
```

### 2. PROCESSAMENTO

```
receiptParser (Web Worker)
    ↓
productService (Pipeline + IA)
    ↓
Dicionário + Produtos Canônicos
```

### 3. PERSISTÊNCIA

```
useSaveReceipt (React Query mutation)
    ↓
receiptService
    ↓
Supabase (primário)
    ↓
IndexedDB (fallback)
```

### 4. CACHE & RENDER

```
React Query invalidates
    ↓
Componentes leem dados
    ↓
UI atualizada
```

---

## ➕ Como Adicionar...

### Nova Feature

1. Crie tipos em `types/`
2. Crie service em `services/`
3. Crie hook em `hooks/`
4. Crie componente em `components/`
5. Adicione testes
6. Atualize documentação

### Novo Hook React Query

```typescript
// hooks/queries/useNewItemQuery.ts
import { useQuery } from "@tanstack/react-query";
import { getNewItem } from "../../services";

export const newItemKeys = {
  all: ["newItem"] as const,
  list: (id: string) => [...newItemKeys.all, id] as const,
};

export function useNewItemQuery(id: string) {
  return useQuery({
    queryKey: newItemKeys.list(id),
    queryFn: () => getNewItem(id),
    staleTime: 5 * 60 * 1000,
  });
}

// Adicione export em hooks/queries/index.ts
```

### Novo Service

```typescript
// services/newItemService.ts
import { supabase } from "./supabaseClient";
import { logger } from "../utils/logger";
import type { NewItem } from "../types/domain";

export async function getNewItem(id: string): Promise<NewItem> {
  try {
    const { data, error } = await supabase
      .from("new_items")
      .select("*")
      .eq("id", id)
      .single();
    
    if (error) throw error;
    return data as NewItem;
  } catch (error) {
    logger.error("NewItemService", "Erro ao buscar item", error);
    throw error;
  }
}
```

### Novo Componente

```tsx
// components/NewComponent.tsx
import { useState } from "react";
import { useNewItemQuery } from "../hooks/queries/useNewItemQuery";

interface Props {
  itemId: string;
}

export function NewComponent({ itemId }: Props) {
  const { data, isLoading, error } = useNewItemQuery(itemId);
  const [localState, setLocalState] = useState("");

  if (isLoading) return <div>Carregando...</div>;
  if (error) return <div>Erro: {error.message}</div>;

  return (
    <div>
      <h2>{data.name}</h2>
      {/* Render content */}
    </div>
  );
}
```

### Novo Tipo

```typescript
// types/newItem.ts
export interface NewItem {
  id: string;
  name: string;
  createdAt: string;
}

// Exporte em types/index.ts se for público
```

---

## 🐛 Debugging

### Logger

```typescript
import { logger } from "../utils/logger";

// Em desenvolvimento
logger.debug("Context", "Mensagem", dados);
logger.info("Context", "Mensagem");
logger.warn("Context", "Mensagem");
logger.error("Context", "Mensagem", erro);

// Em produção: nenhum log é exibido
```

### React Query DevTools

Instale a extensão do navegador:
- [Chrome](https://chrome.google.com/webstore/detail/react-query-devtools)
- [Firefox](https://addons.mozilla.org/en-US/firefox/addon/react-query-devtools)

### Debug de Database

```typescript
// No console do navegador
await window.debugDB();
```

### Debug de PWA

```typescript
// No console do navegador
await window.getPWADebugInfo();
```

---

## ⚡ Performance

### Otimizações Implementadas

- **Lazy Loading**: Abas carregadas sob demanda
- **Code Splitting**: Chunks separados por vendor
- **Virtualização**: Listas longas com react-window
- **Cache**: React Query com staleTime configurado
- **Web Worker**: Parsing pesado em thread separada
- **PWA**: Service Worker para cache de assets

### Bundle Size

| Categoria | Tamanho |
|-----------|---------|
| React + DOM | ~225KB |
| Recharts | ~349KB |
| Supabase | ~176KB |
| React Query | ~83KB |
| Scanner | ~100KB |
| **Total** | **~1.04MB** (gzip: ~250KB) |

### Análise de Bundle

```bash
npm run analyze
```

### Performance Testing

```bash
# Lighthouse local
npm run lighthouse

# Build + Lighthouse
npm run test:perf

# Automático
npm run test:perf:auto
```

---

## 🧪 Testes

### Estrutura de Testes

```typescript
import { describe, it, expect, beforeEach } from "vitest";

describe("feature", () => {
  beforeEach(() => {
    // Setup
  });

  it("deve fazer algo", () => {
    // Test
    expect(result).toBe(expected);
  });
});
```

### Comandos

```bash
# Watch mode
npm run test

# Single run
npm run test:run

# Coverage
npm run test:coverage

# UI mode
npm run test:ui
```

---

## 📊 Métricas

### Type Check

```bash
npm run typecheck
```

### Lint

```bash
npm run lint
npm run lint:fix  # Auto-fix
```

### Testes

```bash
npm run test:run
```

### Build

```bash
npm run build
```

---

## 🔐 Variáveis de Ambiente

```bash
# .env
VITE_SUPABASE_URL=https://xxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJxxx

# SSL (opcional para dev)
VITE_SSL_CERT_PATH=caminho/para/cert.pem
VITE_SSL_KEY_PATH=caminho/para/key.pem
VITE_BASIC_SSL=true
```

---

## 📞 Suporte

- **Issues**: GitHub Issues
- **Documentação**: QWEN.md, ARCHITECTURE.md
- **Discord/Slack**: [link se houver]

---

**Happy coding!** 🚀
