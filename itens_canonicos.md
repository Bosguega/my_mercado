# Auditoria Técnica: Itens Canônicos (Produtos Canônicos)

Data: 2026-04-01  
Escopo: cadastro e manutenção de produtos canônicos, merge entre produtos e impactos nas associações de itens/dicionário.

---

## 1) Resumo Executivo

O módulo de Itens Canônicos está bem encaminhado para governança de catálogo:

- CRUD de produtos canônicos;
- merge operacional (primário/secundário);
- associação indireta com dicionário e itens de notas;
- cache com React Query e atualização otimista parcial.

Pontos fortes:

- separação em hooks de mutação por ação;
- regra de bloqueio de delete quando existem itens associados;
- merge já atualiza `items` e `product_dictionary`.

Lacunas principais:

- ausência de validações fortes de `slug`/unicidade no frontend;
- chamadas amplas de update sem filtro explícito de usuário em alguns pontos de serviço;
- carregamento do dicionário dentro da aba por `useEffect` acoplado a mudanças de `products`.

---

## 2) Escopo Auditado

- `src/components/CanonicalProductsTab.tsx`
- `src/hooks/queries/useCanonicalProductsQuery.ts`
- `src/services/canonicalProductService.ts`
- `src/services/dictionaryService.ts` (integração de vínculo)
- `src/services/productService.ts` (auto-criação e auto-vínculo no pipeline)

---

## 3) Funcionamento Atual (Detalhado)

### 3.1 Query e mutações

Leitura:

- `useCanonicalProductsQuery` -> lista completa (`staleTime` 5min).

Mutações:

- `useCreateCanonicalProduct`
- `useUpdateCanonicalProduct`
- `useDeleteCanonicalProduct`
- `useMergeCanonicalProducts`

O cache é atualizado otimisticamente e/ou invalidado conforme ação.

### 3.2 Fluxo de criação e edição

Criação:

- exige `slug` e `name`;
- `slug` normalizado para lower/underscore;
- categoria/marca opcionais.

Edição:

- altera `name`, `category`, `brand`;
- persiste via update service.

### 3.3 Fluxo de merge

1. usuário define produto primário;
2. seleciona secundário em modo merge;
3. confirma operação;
4. serviço:
   - move associações de `items` para o primário;
   - move associações de `product_dictionary` para o primário;
   - incrementa `merge_count` no primário;
   - remove o secundário.

### 3.4 Integração com pipeline automático

No `processItemsPipeline`:

- tenta match de item normalizado com canônico existente;
- se não existir e IA retornar `slug + normalized_name`, pode criar produto canônico automaticamente;
- persiste atualização no dicionário.

Isso acelera cobertura, mas aumenta necessidade de governança de qualidade do catálogo.

---

## 4) Diagrama de Fluxo

```text
[CanonicalProductsTab mount]
   |
   |-- useCanonicalProductsQuery() -> products
   '-- load dictionary aliases (getFullDictionaryFromDB)

[Create product]
   |
   '-- useCreateCanonicalProduct.mutate()
         '-- createCanonicalProduct() -> cache update

[Edit product]
   |
   '-- useUpdateCanonicalProduct.mutate()
         '-- updateCanonicalProduct() -> cache patch

[Delete product]
   |
   '-- useDeleteCanonicalProduct.mutate()
         |-- check associated items count
         '-- deleteCanonicalProduct()

[Merge products]
   |
   '-- useMergeCanonicalProducts.mutate(primary, secondary)
         |-- update items canonical_product_id
         |-- update dictionary canonical_product_id
         |-- increment merge_count
         '-- delete secondary product

[Scanner/Pipeline side effect]
   |
   '-- processItemsPipeline()
         |-- lookup canonical products
         |-- auto-match or auto-create canonical
         '-- updateDictionary(aiResults)
```

---

## 5) Riscos e Lacunas

1. Governança de catálogo insuficiente para crescimento
- criação automática pelo pipeline pode gerar duplicatas sem revisão humana.

2. Ausência de validação forte de slug
- não há verificação frontend de formato final, colisão, tamanho e convenções.

3. Atualizações amplas em merge
- updates em `items`/`product_dictionary` por `canonical_product_id` sem filtro explícito de usuário na app query (dependência de RLS).

4. Recarregamento de dicionário acoplado a `products`
- `useEffect` com dependência `products` pode gerar custo extra e ruído.

---

## 6) Sugestões e Melhorias (Prioridade)

### P0

1. Regras de validação e unicidade de slug
- validação pré-submit + mensagem clara de conflito.

2. Testes de merge end-to-end de serviço
- validar movimentação de associações e remoção do secundário.

3. Revisão de segurança/escopo de updates
- garantir escopo por usuário em todas as mutações críticas.

### P1

4. "Fila de revisao" para produtos auto-criados
- pipeline cria em estado "pendente" ate confirmacao.

5. Detecção de duplicados candidatos antes de criar
- fuzzy match por nome/slug/categoria/marca.

6. Histórico de merges e desfazer controlado
- log de operação para rastreabilidade.

### P2

7. Ferramenta de bulk merge
- selecionar múltiplos secundários para um primário.

8. Painel de saúde do catálogo
- cobertura, duplicidade, merges recentes e itens órfãos.

---

## 7) Conclusão

O módulo de Itens Canônicos é uma base forte para padronização de produtos.  
A próxima etapa é elevar governança e segurança operacional, especialmente nos fluxos automáticos e de merge.


---

## 8) Status Atualizado (2026-04-01)

### Melhorias ja implementadas

- [x] Validacao forte de criacao/edicao (slug/nome/categoria/marca).
- [x] Teste de merge end-to-end de servico.
- [x] Escopo por usuario reforcado em mutacoes amplas (`items` e `product_dictionary`).

### Melhorias ainda pendentes

- [ ] Fila de revisao para auto-criados no pipeline.
- [ ] Deteccao preventiva de duplicados candidatos.
- [ ] Historico/rastreabilidade de merges com possibilidade de desfazer controlado.
- [ ] Ferramentas bulk de governanca.

