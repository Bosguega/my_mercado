# Auditoria Técnica: Dicionário

Data: 2026-04-01  
Escopo: gestão de entradas do dicionário de produtos, edição, exclusão, limpeza e aplicação retroativa em itens salvos.

---

## 1) Resumo Executivo

O módulo de Dicionário é funcional e cobre o ciclo operacional completo:

- listagem e busca;
- filtro por categoria;
- edição de nome/categoria/vínculo canônico;
- remoção de entradas;
- limpeza total;
- aplicação opcional de correções em itens já salvos.

Pontos fortes:

- UX clara de edição e confirmação para ações destrutivas;
- integração com produtos canônicos;
- mecanismo explícito para propagar ajustes para histórico salvo.

Lacunas principais:

- carregamento do dicionário via estado local (sem React Query);
- ausência de validação forte de campos de edição;
- risco arquitetural em updates amplos sobre `items` sem filtro explícito de usuário na chamada de serviço.

---

## 2) Escopo Auditado

- `src/components/DictionaryTab.tsx`
- `src/components/DictionaryRow.tsx`
- `src/services/dictionaryService.ts`
- `src/hooks/queries/useReceiptsQuery.ts` (refetch e impacto no cache)
- `src/hooks/queries/useCanonicalProductsQuery.ts`
- `src/utils/filters.ts`

---

## 3) Funcionamento Atual (Detalhado)

### 3.1 Carregamento e estado

- `loadDictionary()` chama `getFullDictionaryFromDB()` e popula estado local `dictionary`.
- não há cache React Query dedicado para a lista do dicionário na UI.

### 3.2 Operações principais

1. Editar entrada:
- altera `normalized_name`, `category`, `canonical_product_id`;
- persiste via `updateDictionaryEntryInDB`.

2. Excluir entrada:
- confirmação em `ConfirmDialog`;
- remove via `deleteDictionaryEntryFromDB`.

3. Limpar dicionário:
- confirmação forte;
- executa `clearDictionaryInDB`.

4. Aplicar correção a notas salvas:
- após edição, oferece CTA via toast;
- executa `applyDictionaryEntryToSavedItems(key, normalizedName, category)`;
- chama `refetchReceipts` para atualizar dados visíveis.

### 3.3 Filtro, ordenação e limite

- busca textual em `key` e `normalized_name`;
- filtro por categoria;
- ordenação `recent` (por `created_at`) ou `alpha`;
- limite de exibição em 100 itens.

---

## 4) Diagrama de Fluxo

```text
[DictionaryTab mount]
   |
   '-- loadDictionary()
         '-- getFullDictionaryFromDB()

[User edits entry]
   |
   |-- updateDictionaryEntryInDB(key, normalized, category, canonicalId)
   '-- optional toast action:
         applyDictionaryEntryToSavedItems(key, normalized, category)
             '-- refetchReceipts()

[User deletes/clears]
   |
   |-- ConfirmDialog
   |-- deleteDictionaryEntryFromDB(key)
   '-- clearDictionaryInDB()

[Render list]
   |
   |-- filterBySearch
   |-- filter category
   |-- sortItems(recent|alpha)
   '-- slice(0, 100)
```

---

## 5) Riscos e Lacunas

1. Estado local sem estratégia de cache dedicada
- pode ficar inconsistente com mudanças externas até `loadDictionary` ser reexecutado.

2. Validação fraca em edição
- campos podem receber valores vazios/ruidosos sem sanitização forte no frontend.

3. Update retroativo amplo em `items`
- `applyDictionaryEntryToSavedItems` filtra por `normalized_key`;
- não há filtro explícito de usuário na chamada da app (depende de RLS/políticas).

4. Limite fixo em 100
- pode esconder entradas em bases maiores sem paginação.

---

## 6) Sugestões e Melhorias (Prioridade)

### P0

1. Introduzir schema de validação (Zod) para edição
- normalização de texto, limites de tamanho e defaults consistentes.

2. Adicionar testes de serviço para operações críticas
- update/delete/clear/applyToSaved com cenários de erro.

3. Tornar escopo de atualização retroativa explicitamente por usuário
- reforçar filtro no backend/query ou via política verificável.

### P1

4. Migrar listagem do dicionário para React Query
- cache consistente, invalidação previsível e menos estado manual.

5. Paginação/infinite list para >100 entradas
- sem truncamento silencioso.

6. Auditoria de mudanças
- log local/remoto de "quem alterou o que e quando".

### P2

7. Edição em lote
- selecionar múltiplas chaves para recategorização/vínculo canônico.

8. Métrica de cobertura do dicionário
- percentual de itens de receipt já normalizados.

---

## 7) Conclusão

O Dicionário está funcional e útil no dia a dia operacional.  
Os próximos ganhos estão em robustez de validação, consistência de cache e governança segura das atualizações retroativas.


---

## 8) Status Atualizado (2026-04-01)

### Melhorias ja implementadas

- [x] Migracao da listagem para React Query (`useDictionaryQuery`).
- [x] Paginacao visivel com botao "Carregar mais" (sem truncamento silencioso).
- [x] Escopo explicito por usuario nas mutacoes de dicionario.
- [x] Invalidacao de cache de receipts apos aplicacao retroativa.

### Melhorias ainda pendentes

- [ ] Validacao forte (schema) no formulario de edicao do dicionario.
- [ ] Auditoria de mudancas (log de alteracoes).
- [ ] Edicao em lote.
- [ ] Metricas de cobertura do dicionario.

