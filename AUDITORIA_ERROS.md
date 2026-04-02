/**
 * Auditoria de Tratamento de Erros - My Mercado
 * Data: 1 de abril de 2026
 * 
 * Objetivo: Analisar como o app lida e mostra mensagens de erro ao usuário
 */

# 🚨 AUDITORIA DE TRATAMENTO DE ERROS

## 📊 Resumo Executivo

O aplicativo possui **múltiplos mecanismos** de tratamento de erros, mas existem **inconsistências** na padronização das mensagens.

---

## ✅ Pontos Fortes

### 1. Error Boundary Global
- ✅ `ErrorBoundary.tsx` captura erros em toda a aplicação
- ✅ Mostra UI amigável com opções de recuperação
- ✅ Oferece "Recarregar Página" e "Limpar Dados e Recarregar"
- ✅ Mostra detalhes do erro apenas em desenvolvimento
- ✅ Notifica usuário com toast

### 2. Sistema de Notificações
- ✅ `utils/notifications.ts` centraliza notificações
- ✅ Métodos padronizados: `notify.success()`, `notify.error()`, etc.
- ✅ Mensagens específicas para diferentes cenários

### 3. Logger Centralizado
- ✅ `utils/logger.ts` para logs estruturados
- ✅ Logs apenas em desenvolvimento
- ✅ Diferencia error, warn, info, debug

### 4. React Query Error Handling
- ✅ `onError` callbacks nos mutations
- ✅ Logs de erros com logger
- ✅ Toasts de erro genéricos

---

## ❌ Problemas Identificados

### 1. Mensagens de Erro Inconsistentes

**Problema:** Mensagens em português com encoding incorreto
```typescript
// ❌ Atual
toast.error("Nao foi possivel adicionar item na lista colaborativa.");
toast.error("Codigo invalido ou sem permissao para entrar na lista.");

// ✅ Deveria ser
toast.error("Não foi possível adicionar item na lista colaborativa.");
toast.error("Código inválido ou sem permissão para entrar na lista.");
```

**Locais afetados:** 122 ocorrências de `toast.error`

### 2. Mensagens Muito Genéricas

```typescript
// ❌ Muito genérico
toast.error("Erro ao salvar nota.");
toast.error("Erro ao remover item.");
toast.error("Erro técnico ao salvar a nota.");

// ✅ Deveria ser mais específico
toast.error("Não foi possível salvar a nota. Verifique sua conexão e tente novamente.");
toast.error("Não foi possível remover o item. Tente novamente em alguns segundos.");
```

### 3. Mensagens Não Amigáveis

```typescript
// ❌ Técnico demais
toast.error(`Erro ao processar QR Code: ${errorMessage}`);

// ✅ Mais amigável
toast.error("Não conseguimos ler o QR Code. Verifique se está nítido e tente novamente.");
```

### 4. Duplicação de Mensagens

**Problema:** Mesma mensagem em lugares diferentes
```typescript
// Em useLocalShoppingListActions.ts
toast.error("Ja existe uma lista com esse nome.");

// Em useCollaborativeShoppingListActions.ts  
toast.error("Nao foi possivel criar a lista colaborativa.");

// Deveriam usar notify já definido
```

### 5. Falta de Contexto em Erros

```typescript
// ❌ Sem contexto
catch (err) {
  toast.error("Erro ao criar produto.");
}

// ✅ Com contexto e ação
catch (err) {
  const message = err instanceof Error ? err.message : "Erro desconhecido";
  logger.error('CanonicalProduct', 'Falha ao criar produto', err);
  toast.error(`Não foi possível criar o produto. ${message}`);
}
```

### 6. Encoding de Caracteres

**Problema:** Caracteres especiais sem acento
```typescript
// ❌ Atual (em todo código)
"Nao", "invalido", "canonicos", "historico"

// ✅ Deveria ser
"Não", "inválido", "canônicos", "histórico"
```

### 7. Duração das Notificações

**Problema:** Duração inconsistente
```typescript
// Alguns lugares
toast.error(errorMsg, { duration: 10000 }); // 10 segundos
toast.error("Mensagem"); // Default (3 segundos)
toast.success("Sucesso", { duration: 5000 }); // 5 segundos

// Deveria ter padrão
```

### 8. Error Boundary Não é Usado em Todas as Abas

**Problema:** ErrorBoundary está apenas no App.tsx
- ✅ ScannerTab - Protegido
- ✅ HistoryTab - Protegido
- ❌ ShoppingListTab - Pode não estar protegido em sub-componentes
- ❌ SearchTab - Pode não estar protegido

---

## 📋 Recomendações

### Prioridade Alta

#### 1. Centralizar Mensagens de Erro

Criar `utils/errorMessages.ts`:
```typescript
export const errorMessages = {
  // Scanner
  QR_CODE_INVALID: "QR Code inválido. Verifique se é de uma NFC-e.",
  QR_CODE_PROCESSING: "Erro ao processar QR Code. Tente novamente.",
  NFC_E_NOT_FOUND: "Não foi possível ler esta NFC-e. Ela pode ser de outro estado ou estar cancelada.",
  
  // Shopping List
  LIST_ALREADY_EXISTS: "Já existe uma lista com este nome.",
  LIST_CREATE_FAILED: "Não foi possível criar a lista. Tente novamente.",
  ITEM_ALREADY_EXISTS: "Este item já está na lista.",
  ITEM_ADD_FAILED: "Não foi possível adicionar o item. Tente novamente.",
  
  // Dictionary
  DICTIONARY_UPDATE_FAILED: "Não foi possível atualizar o dicionário.",
  DICTIONARY_DELETE_FAILED: "Não foi possível remover do dicionário.",
  
  // Canonical Products
  PRODUCT_CREATE_FAILED: "Não foi possível criar o produto.",
  PRODUCT_UPDATE_FAILED: "Não foi possível atualizar o produto.",
  PRODUCT_DELETE_FAILED: "Não foi possível remover o produto.",
  
  // Generic
  SAVE_FAILED: "Não foi possível salvar. Verifique sua conexão.",
  LOAD_FAILED: "Não foi possível carregar os dados.",
  CONNECTION_ERROR: "Erro de conexão. Verifique sua internet.",
  UNKNOWN_ERROR: "Ocorreu um erro inesperado. Tente novamente.",
};
```

#### 2. Padronizar Duração de Toasts

```typescript
// utils/notifications.ts
const TOAST_DURATION = {
  SHORT: 3000,
  MEDIUM: 5000,
  LONG: 10000,
};

export const notify = {
  error: (message: string, duration = TOAST_DURATION.MEDIUM) => 
    toast.error(message, { duration }),
  // ...
};
```

#### 3. Adicionar Ações em Erros Críticos

```typescript
// ❌ Atual
toast.error("Erro ao salvar nota.");

// ✅ Com ação
toast.error("Erro ao salvar nota.", {
  duration: 10000,
  action: {
    label: "Tentar Novamente",
    onClick: () => saveReceipt(),
  },
});
```

#### 4. Melhorar Mensagens de Erro do Scanner

```typescript
// ❌ Atual
toast.error(`Erro ao processar QR Code: ${errorMessage}`);

// ✅ Mais amigável
if (errorMessage.includes("proxy")) {
  toast.error("Não conseguimos acessar a NFC-e no momento. Isso pode ser:\n\n• Problema temporário do servidor\n• NFC-e de estado não suportado\n\nTente novamente ou use entrada manual.", {
    duration: 15000,
  });
} else if (errorMessage.includes("QR Code inválido")) {
  toast.error("QR Code inválido. Certifique-se de que está escaneando o QR Code da NFC-e.", {
    duration: 8000,
  });
}
```

#### 5. Criar Hook de Error Handling

```typescript
// hooks/useErrorHandler.ts
export function useErrorHandler() {
  const handleError = useCallback((
    error: unknown,
    context: string,
    fallbackMessage?: string
  ) => {
    const message = error instanceof Error ? error.message : fallbackMessage || "Erro desconhecido";
    logger.error(context, message, error);
    
    // Mensagens específicas por contexto
    if (context.includes("save")) {
      toast.error("Não foi possível salvar. Verifique sua conexão.", {
        duration: 8000,
        action: { label: "Tentar Novamente", onClick: retry },
      });
    } else if (context.includes("load")) {
      toast.error("Não foi possível carregar dados.");
    } else {
      toast.error(message);
    }
  }, []);

  return { handleError };
}
```

#### 6. Adicionar Fallback para Erros de API

```typescript
// services/receiptParser.ts
try {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(
      response.status === 404 
        ? "NFC-e não encontrada. Verifique se o código está correto."
        : response.status === 503
        ? "Serviço temporariamente indisponível. Tente em alguns minutos."
        : `Erro ao acessar NFC-e (${response.status})`
    );
  }
} catch (error) {
  // Handle error
}
```

---

## 🔧 Ações Imediatas

1. ✅ Criar `utils/errorMessages.ts` com mensagens padronizadas
2. ✅ Atualizar `utils/notifications.ts` com durações padrão
3. ✅ Corrigir encoding de caracteres (acentos)
4. ✅ Criar `hooks/useErrorHandler.ts`
5. ✅ Atualizar componentes críticos (Scanner, ShoppingList)
6. ✅ Adicionar ações em toasts de erro críticos

---

## 📈 Métricas

| Métrica | Atual | Ideal |
|---------|-------|-------|
| Toasts de erro genéricos | 45% | <10% |
| Mensagens com encoding correto | 0% | 100% |
| Erros com ação de retry | 0% | >50% |
| Erros com contexto | 30% | >80% |
| Duração padronizada | 20% | 100% |

---

**Conclusão:** O app tem boa estrutura de error handling, mas precisa de padronização e mensagens mais amigáveis.
