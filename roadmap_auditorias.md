# Roadmap Consolidado das Auditorias

Data: 2026-04-01  
Fontes: `listas.md`, `historico.md`, `precos.md`, `dicionario.md`, `itens_canonicos.md`

---

## 1) Objetivo

Transformar os achados das auditorias em uma sequência única de execução, reduzindo risco de regressão e maximizando ganho de qualidade por sprint.

---

## 2) Estratégia de Execução

Ordem recomendada:

1. **Confiabilidade de dados e segurança de mutações**  
2. **Escalabilidade de listagem/filtros**  
3. **Qualidade analítica e UX avançada**  
4. **Evoluções de produto**

Racional:

- primeiro eliminar riscos estruturais (escopo por usuário, validação, testes críticos);
- depois resolver truncamentos e limites artificiais;
- só então investir em features avançadas e inteligência de produto.

---

## 3) Backlog Unificado Priorizado

## Fase 0 (Fundação Crítica) - P0 Global

1. **Testes de regras centrais**
- Lista: duplicidade, toggle, clear, ordenação.
- Histórico: filtros por período/ordenação/busca.
- Preços: pipeline de filtro + ordenação.
- Canônicos: merge end-to-end.

2. **Validações fortes com schema**
- Restore JSON (histórico) com validação estrutural completa.
- Edição de dicionário (nome/categoria/canônico).
- Criação de canônico (slug, nome, unicidade).

3. **Escopo explícito por usuário nas mutações críticas**
- Revisar updates amplos em `items` e `product_dictionary`.
- Garantir enforcement no backend/políticas + cobertura de teste.

4. **Proteção UX para ações destrutivas pendentes**
- Lista: confirmar `clearAll` e opcional `clearChecked`.

---

## Fase 1 (Escalabilidade e Consistência) - P1 Global

5. **Remover truncamentos silenciosos e padronizar paginação**
- Histórico: substituir `slice(0, 50)` por paginação real.
- Preços: revisar cortes `50/100` e sinalizar limites.
- Dicionário: substituir `slice(0, 100)` por paginação/infinite list.

6. **Evoluir cache para consistência operacional**
- Dicionário: migrar listagem para React Query.
- Consolidar invalidações entre dicionário/canônicos/receipts.

7. **Múltiplas listas de compras**
- modelo de `listas` + `itens por lista`;
- criar/renomear/excluir lista;
- definir lista ativa;
- mover/copiar item entre listas.

8. **Sincronização opcional de listas com nuvem**
- somente após modelo de múltiplas listas estabilizado.

---

## Fase 2 (Qualidade Analítica e Governança) - P2 Global

9. **Gráfico de preços com agregação correta por dia**
- média/mediana por produto-dia;
- reduzir viés de “primeira ocorrência”.

10. **Melhoria de matching**
- lista: fallback de histórico mais preciso (menos `includes` ingênuo);
- preços/canônicos: busca/tokenização com ranking.

11. **Governança de catálogo canônico**
- fila de revisão para auto-criados;
- candidatos a duplicata antes de criar;
- histórico de merge e rastreabilidade.

12. **Observabilidade funcional**
- métricas de cobertura de dicionário;
- métricas de saúde do catálogo canônico;
- sinalização de truncamento/qualidade de dados.

---

## Fase 3 (Evolução de Produto) - P3 Global

13. **Lista compartilhável (família/time)**
14. **Sugestão de recompra automática**
15. **Comparações avançadas de preços (benchmark por período/categoria)**

---

## 4) Dependências Entre Itens

1. `Validações + testes` antes de `paginação/escala`.
2. `Múltiplas listas` antes de `sincronização de listas`.
3. `Governança canônica` antes de expandir automações no pipeline.
4. `Agregação de gráfico` antes de usar métricas para decisão automática.

---

## 5) Plano por Sprint (Sugestão)

### Sprint 1

1. Testes críticos (Lista + Histórico + Merge canônico)
2. Validação restore JSON
3. Confirm dialog nas limpezas da lista

### Sprint 2

1. Validação e regras de slug/canônico
2. Revisão de escopo por usuário nas mutações amplas
3. Dicionário em React Query

### Sprint 3

1. Paginação no histórico
2. Revisão dos limites em Preços e Dicionário
3. Múltiplas listas (MVP local)

### Sprint 4

1. Sincronização de listas (opcional)
2. Gráfico com agregação diária
3. Matching melhorado para histórico/lista

### Sprint 5+

1. Governança canônica avançada
2. Colaboração de listas
3. Recompra automática

---

## 6) Critérios de Pronto (Global)

- Nenhuma operação crítica sem validação de entrada e tratamento de erro claro.
- Nenhum truncamento silencioso sem feedback visual.
- Cobertura de testes para todas as regras de negócio centrais.
- Operações cross-entity (merge/apply) com escopo por usuário comprovado.
- Métricas mínimas para monitorar qualidade dos dados.

---

## 7) Resultado Esperado

Com esse roadmap, a aplicação evolui de “funcional e prática” para “confiável, escalável e governável”, sem sacrificar a velocidade de entrega.


---

## 8) Sprint 1 - Plano Tecnico Executavel

Objetivo da sprint:

- aumentar confiabilidade sem alterar arquitetura macro;
- entregar cobertura de regras criticas + validacao forte de restore + protecao UX destrutiva na lista.

### 8.1 PR-1: Testes criticos de regras de negocio

Escopo:

1. Lista de compras
- `addItem`: vazio, duplicado pendente, item valido.
- `toggleChecked`: alternancia e `checked_at`.
- `clearChecked` e `clearAll`.
- ordenacao em `useSortedShoppingItems`.

2. Historico
- `applyReceiptFilters`: busca, periodo, ordenacao.
- casos de periodo custom invalido (`start > end`).

3. Canonicos (merge)
- teste de servico cobrindo:
  - move de `items`,
  - move de `product_dictionary`,
  - incremento de `merge_count`,
  - remocao do secundario.

Arquivos-alvo sugeridos:

- `src/stores/useShoppingListStore.ts`
- `src/hooks/queries/useSortedShoppingItems.ts`
- `src/utils/filters.ts`
- `src/services/canonicalProductService.ts`
- `src/**/*.test.ts` (novos testes)

Checklist de aceite:

- [x] testes de lista cobrindo fluxos principal e edge cases.
- [x] testes de filtros do historico cobrindo todos os `sortBy`.
- [x] teste de merge canonico validando efeitos colaterais esperados.
- [x] sem quebra em testes existentes.

---

### 8.2 PR-2: Validacao forte do restore JSON

Escopo:

1. Criar schema de backup (Zod):
- metadados (`version`, `exportDate`, `totalReceipts`);
- `receipts[]` com validacao de campos essenciais;
- `items[]` com tipos obrigatorios.

2. Aplicar schema em `HistoryTab` no fluxo de restore:
- substituir validacao superficial por parse seguro;
- mensagens de erro claras para arquivo invalido.

Arquivos-alvo sugeridos:

- `src/components/HistoryTab/index.tsx`
- `src/types/domain.ts` (se precisar ajustar tipos)
- `src/utils/validation/backupSchema.ts` (novo)

Checklist de aceite:

- [x] restore aceita somente payload compativel.
- [x] erros de shape retornam feedback legivel ao usuario.
- [x] restore de backup valido continua funcionando sem regressao.

---

### 8.3 PR-3: Confirmacao para limpeza da lista

Escopo:

1. Incluir confirmacao para `clearAll` na `ShoppingListTab`.
2. Opcional recomendado: confirmacao para `clearChecked`.
3. Manter toasts e disabled states atuais.

Arquivos-alvo sugeridos:

- `src/components/ShoppingListTab.tsx`
- `src/components/ConfirmDialog.tsx` (somente se ajuste for necessario)

Checklist de aceite:

- [x] `clearAll` nao executa sem confirmacao explicita.
- [x] botoes continuam desabilitando corretamente.
- [x] fluxo de cancelar nao altera estado da lista.

---

### 8.4 Sequencia de execucao recomendada

1. PR-1 (testes)  
2. PR-2 (schema de restore)  
3. PR-3 (confirmacao de limpeza da lista)

Racional:

- testes primeiro para reduzir risco de regressao;
- validacao forte em seguida;
- ajuste de UX por ultimo com rede de seguranca de teste ja ativa.

---

### 8.5 Comandos de verificacao da sprint

1. `npm run test`
2. `npm run build`
3. `npm run lint` (se aplicavel no fluxo do projeto)

Criterio final de pronto da Sprint 1:

- [x] todos os itens dos checklists 8.1, 8.2 e 8.3 marcados.
- [x] build/test sem erros.
- [x] sem regressao visivel nos fluxos de Lista e Historico.


---

## 9) Status de Execucao Atual

### Sprint 4.1 - Sincronizacao opcional de listas (entregue)

Implementado:

- toggle de "sincronizar listas de compras com nuvem" em Configuracoes;
- acao manual "sincronizar listas agora";
- sincronizacao automatica no login quando toggle estiver ativo;
- mecanismo de pull/push com base em `updated_at` entre local e nuvem.

Implementacao tecnica:

- persistencia em `user_metadata` do Supabase (`mymercado_shopping_lists_v1`);
- snapshot versionado (`version: 1`) com listas, lista ativa e itens por lista;
- store de listas com suporte a export/import de snapshot de nuvem.

Limitacoes conhecidas deste MVP:

- armazenamento em `user_metadata` (nao ideal para payloads muito grandes);
- estrategia atual de resolucao de conflito e "mais recente vence";
- sincronizacao automatica ocorre no login e tambem em background com debounce apos alteracoes locais.
