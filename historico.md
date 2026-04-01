# Auditoria Técnica: Histórico

Data: 2026-04-01  
Escopo: aba de histórico (`HistoryTab`), filtros, backup/restore, exportação e operações de deleção/sincronização de notas.

---

## 1) Resumo Executivo

O módulo de Histórico está bem estruturado com:

- orquestração central via `useHistoryReceipts`;
- filtros de período/busca/ordenação reutilizáveis;
- operações de backup JSON, restore e export CSV;
- confirmação para ações destrutivas (delete e restore).

Pontos fortes:

- separação boa entre UI, hook de domínio e utilitários;
- filtros e ordenação determinísticos;
- UX robusta para backup/restore com confirmação.

Lacunas principais:

- `refetch` manual no header (sincronização não automática em todos os cenários);
- paginação hard-limit no cliente (`slice(0, 50)`) no fluxo filtrado;
- restore substitui cache inteiro e depende da consistência do payload.

---

## 2) Escopo Auditado

- `src/components/HistoryTab/index.tsx`
- `src/components/HistoryTab/HeaderSection.tsx`
- `src/components/HistoryTab/ReceiptList.tsx`
- `src/components/HistoryTab/SummaryCard.tsx`
- `src/hooks/queries/useHistoryReceipts.ts`
- `src/hooks/queries/useReceiptsQuery.ts`
- `src/utils/filters.ts`
- `src/utils/backupRegistry.ts`

---

## 3) Funcionamento Atual (Detalhado)

### 3.1 Orquestração do módulo

`HistoryTab` consome `useHistoryReceipts`, que:

1. busca receipts via `useAllReceiptsQuery`;
2. lê filtros e busca da `useUiStore`;
3. aplica `applyReceiptFilters`;
4. retorna lista pronta para render.

### 3.2 Filtros e ordenação

`applyReceiptFilters` aplica, nessa ordem:

1. busca por estabelecimento (`filterReceiptsBySearch`);
2. filtro de período (`filterByPeriod`);
3. ordenação (`sortReceipts`);
4. limite final de render (`items: filtered.slice(0, 50)`).

Ordenação suportada:

- `date`
- `value` (somatório de `price * quantity`)
- `store`

### 3.3 Ações do usuário

No header:

- sincronizar (`refetch`);
- restaurar backup JSON (upload + confirmação);
- backup JSON;
- export CSV.

Na lista:

- expandir/recolher receipt;
- excluir receipt com confirmação.

### 3.4 Backup e restore

Backup:

- gera JSON com metadados (`version`, `exportDate`, `totalReceipts`).

Restore:

- valida extensão e shape básico (`backupData.receipts`);
- abre confirmação;
- aplica via `useRestoreReceipts` (persistindo DB + cache local).

### 3.5 Cálculos de resumo

`SummaryCard` usa `calculateTotalSpent(filteredItems, parseBRL)` e `filteredCount`.

---

## 4) Diagrama de Fluxo

```text
[HistoryTab mount]
   |
   '-- useHistoryReceipts()
         |-- useAllReceiptsQuery() -> receipts
         |-- useUiStore(historyFilters, historyFilter)
         '-- applyReceiptFilters(receipts, search, filters)
                |-- filter by market
                |-- filter by period
                |-- sort (date/value/store)
                '-- slice(0, 50)

[Header actions]
   |
   |-- Sync -> refetch()
   |-- Backup -> backupToJSON(receipts)
   |-- Export CSV -> exportToCSV(filteredReceipts)
   '-- Restore JSON
         |-- FileReader + parse
         |-- ConfirmDialog
         '-- useRestoreReceipts.mutateAsync()

[List actions]
   |
   |-- Toggle expand -> useUiStore.expandedReceipts
   '-- Delete receipt
         |-- ConfirmDialog
         '-- useDeleteReceipt.mutateAsync(id)
```

---

## 5) Riscos e Lacunas

1. Limite fixo no cliente (`50`) no resultado final do histórico
- pode ocultar dados em bases grandes;
- pode induzir percepcao de "sumico" sem sinalizacao clara.

2. Restore aceita payloads sem validação profunda
- valida apenas presença de array `receipts`;
- sem validação estrita de campos críticos por receipt/item.

3. Dependência de refetch manual para visibilidade imediata em alguns fluxos
- parte das mutacoes ja invalida cache, mas ainda existe acao manual de "Sincronizar".

4. CSV exporta valores formatados (string BRL), não números crus
- reduz utilidade analítica direta em algumas ferramentas.

---

## 6) Sugestões e Melhorias (Prioridade)

### P0

1. Validação forte no restore
- schema com Zod para backup (version, receipts, items, tipos).

2. Feedback explícito quando houver truncamento por limite
- mensagem: "Exibindo 50 de N notas".

3. Cobertura de testes para `applyReceiptFilters`
- casos de período custom inválido, ordenação por valor e busca vazia.

### P1

4. Paginação/infinite scroll real no histórico
- eliminar `slice(0, 50)` fixo no cliente.

5. Export CSV com opcao "numerico cru"
- `price`/`total` como decimal sem formatação visual.

6. Restore com modo merge opcional
- hoje o comportamento é substituição forte.

### P2

7. Métricas de qualidade de dados no histórico
- notas sem itens, datas inválidas, mercados sem nome.

8. Filtros salvos por usuário
- presets para consultas frequentes.

---

## 7) Conclusão

O módulo de Histórico está funcionalmente sólido e com boa UX básica.  
Os principais ganhos de maturidade estão em validação forte do restore e escalabilidade de listagem sem truncamento fixo.


---

## 8) Status Atualizado (2026-04-01)

### Melhorias ja implementadas

- [x] Validacao forte do restore com schema dedicado.
- [x] Cobertura de testes para filtros centrais de historico.
- [x] Remocao de truncamento silencioso fixo no hook de filtros.
- [x] Paginacao visivel no Historico ("Carregar mais").

### Melhorias ainda pendentes

- [ ] Export CSV com opcao numerica crua.
- [ ] Restore com modo merge opcional.
- [ ] Metricas de qualidade de dados no historico.
- [ ] Presets de filtros por usuario.

