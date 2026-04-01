# Auditoria Técnica: Preços (Busca de Itens)

Data: 2026-04-01  
Escopo: aba de preços (`SearchTab`), busca, filtros, ordenação, visualização por lista e gráfico de tendência.

---

## 1) Resumo Executivo

A aba de preços está organizada em pipeline claro:

- flatten de receipts para itens de compra;
- enriquecimento com produto canônico;
- filtros por período e busca textual;
- ordenação por preço/recência;
- modo gráfico lazy-loaded.

Pontos fortes:

- boa separação em hooks (`useSearchItems`, `useFilteredSearchItems`, `useSearchChartData`);
- integração com produtos canônicos para agrupamento mais inteligente;
- custo de bundle controlado com lazy load do gráfico.

Lacunas principais:

- limite fixo de itens e cortes antecipados (50/100) podem distorcer percepção;
- gráfico usa “primeira ocorrência por data” em vez de agregação;
- estado de loading inferido por `receipts.length === 0` em hook de busca.

---

## 2) Escopo Auditado

- `src/components/SearchTab.tsx`
- `src/components/SearchItemRow.tsx`
- `src/components/PriceChart.tsx`
- `src/hooks/queries/useSearchItems.ts`
- `src/hooks/queries/useFilteredSearchItems.ts`
- `src/hooks/queries/useSearchChartData.ts`
- `src/utils/filters.ts`
- `src/hooks/queries/useReceiptsQuery.ts`
- `src/hooks/queries/useCanonicalProductsQuery.ts`

---

## 3) Funcionamento Atual (Detalhado)

### 3.1 Pipeline de dados

1. `useAllReceiptsQuery` carrega receipts.
2. `useCanonicalProductsQuery` carrega catálogo canônico.
3. `useSearchItems`:
   - faz flatten de receipts -> itens;
   - injeta `purchasedAt`, `store` e `canonical_name`.
4. `useFilteredSearchItems`:
   - filtra por período;
   - filtra por query;
   - ordena;
   - aplica limites.
5. `useSearchChartData` (quando gráfico ativo):
   - agrupa itens por chave de exibição;
   - monta série temporal por data.

### 3.2 Regras de filtro/ordenação

- Sem busca (`searchQuery` vazio), o hook corta cedo para 50 itens (`baseItems.slice(0, 50)`).
- Com busca, aplica filtro textual em `name`, `normalized_name`, `category`, `canonical_name`.
- Após ordenar, retorno final é `slice(0, 100)`.

### 3.3 Regras do gráfico

Agrupamento:

- se há `canonical_product_id`, usa nome canônico (prefixado com ícone textual);
- senão usa `normalized_name` ou `name`.

Série:

- coleta datas únicas;
- para cada produto e data, pega o primeiro match (`find`) e usa seu preço.

### 3.4 UX e renderização

- `UniversalSearchBar` com seleção de ordem e período;
- botão “Gráfico” visível quando há query e resultados;
- `PriceChart` carregado sob demanda (`lazy` + `Suspense`).

---

## 4) Diagrama de Fluxo

```text
[SearchTab mount]
   |
   |-- useAllReceiptsQuery() -> receipts
   |-- useCanonicalProductsQuery() -> canonicalProducts
   |
   '-- useSearchItems(receipts, canonicalProducts)
         '-- allItems (flatten + metadata)

[Filtering pipeline]
   |
   '-- useFilteredSearchItems(allItems, query, sort, period)
         |-- filterItemsByPeriod
         |-- filterBySearch (if query)
         |-- sortItems (price/recent)
         '-- slice(0, 100)

[Chart mode]
   |
   '-- useSearchChartData(filteredItems, canonicalProducts, showChart=true)
         |-- groupBy product key
         |-- collect unique dates
         '-- map series by date/product

[Render]
   |
   |-- List mode -> SearchItemRow[]
   '-- Chart mode -> PriceChart
```

---

## 5) Riscos e Lacunas

1. Truncamento em duas etapas (50 antes da busca vazia, 100 no final)
- pode esconder itens relevantes;
- dificulta diagnóstico de “não apareceu na busca” dependendo do caminho.

2. Série temporal sem agregação por dia
- múltiplas compras no mesmo dia podem ser representadas por um valor arbitrário (primeiro match).

3. Estado de loading em `useSearchItems`
- `isLoading` inferido por `receipts.length === 0`, não pelo estado real de query;
- pode confundir vazio legítimo com carregamento.

4. Busca textual por `includes` simples
- sem tokenização/fuzzy;
- baixa precisão em variações de escrita.

---

## 6) Sugestões e Melhorias (Prioridade)

### P0

1. Remover cortes antecipados inconsistentes
- adotar paginação clara ou limite único com sinalização.

2. Corrigir semântica de loading
- propagar `isLoading` real de `useAllReceiptsQuery`.

3. Testes de regressão do pipeline de filtro/ordenação
- períodos, busca vazia, sort por preço/recência.

### P1

4. Agregação de preço por dia no gráfico
- média/mediana por produto-dia em vez de “primeira ocorrência”.

5. Métrica de dispersão de preço
- adicionar min/max/variação no período para cada grupo.

6. Busca avançada
- normalização, tokenização e ranking por relevância.

### P2

7. Drill-down no gráfico
- clicar na série para abrir receipts que compõem o ponto.

8. Comparação lado a lado entre produtos/categorias
- modo benchmark por período.

---

## 7) Conclusão

A base do módulo de preços é boa e modular.  
O maior ganho imediato está em corrigir truncamentos e melhorar a fidelidade da série temporal no gráfico.

