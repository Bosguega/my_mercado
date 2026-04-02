# Auditoria Técnica: Listas de Compras (My Mercado)

Data: 2026-04-01  
Escopo: comportamento atual da feature de lista de compras, integração com histórico de notas, riscos, melhorias e plano de evolução.

---

## 1) Resumo Executivo

A funcionalidade de lista de compras está implementada com boa separação entre:

- estado da lista (Zustand + `localStorage`, local-first);
- dados de histórico de compras (React Query via receipts);
- UI de checklist e enriquecimento com preço médio/histórico.

Pontos fortes:

- isolamento por usuário no storage local (`itemsByUser[sessionUserId]`);
- prevenção de duplicidade para itens pendentes;
- sanitização defensiva dos itens antes de renderizar;
- ordenação consistente (pendentes primeiro, mais recentes antes);
- uso do histórico real de notas para sugestões e contexto de preço.

Limitações relevantes:

- coexistencia de dois modelos (local-first legado e colaborativo relacional) aumenta complexidade operacional;
- fallback de matching de histórico por `includes` pode gerar ruído;
- store e componente duplicam parte da lógica de robustez/sanitização;
- ausência de testes específicos para regras críticas da lista.

---

## 2) Escopo Auditado

Arquivos principais analisados:

- `src/components/ShoppingListTab.tsx`
- `src/components/ShoppingListItem.tsx`
- `src/stores/useShoppingListStore.ts`
- `src/hooks/queries/usePurchaseHistory.ts`
- `src/hooks/queries/useSortedShoppingItems.ts`
- `src/utils/shoppingList.ts`
- `src/utils/normalize.ts`
- `src/hooks/queries/useReceiptsQuery.ts`
- `src/services/receiptService.ts`
- `src/App.tsx`
- `src/stores/useReceiptsSessionStore.ts`

---

## 3) Funcionamento Atual (Detalhado)

### 3.1 Arquitetura e Persistência

- A lista de compras usa Zustand com `persist` em `localStorage`.
- Chave de persistência: `@MyMercado:shopping-list`.
- Estrutura: `itemsByUser: Record<string, ShoppingListItem[]>`.
- Não existe persistência remota dessa lista no Supabase.

Impacto prático:

- rápido e resiliente offline;
- no modo local-first, ainda não compartilha entre dispositivos/sessões diferentes do navegador.

### 3.2 Isolamento por Usuário

- `sessionUserId` vem de `useReceiptsSessionStore`.
- `ownerKey` da lista usa `sessionUserId.trim()` ou fallback `__local__`.
- Cada usuario autenticado mantem uma "fatia" propria em `itemsByUser`.

Impacto prático:

- evita mistura de listas entre contas no mesmo navegador;
- ainda depende do mesmo storage local para existir.

### 3.3 Criação e Validação de Item

Ao adicionar item:

1. trim do nome;
2. bloqueia vazio (`reason: "empty"`);
3. normaliza chave com `normalizeKey`;
4. bloqueia duplicado pendente (`normalized_key` igual com `checked = false`);
5. cria item com:
   - `id` (`crypto.randomUUID` com fallback),
   - `name`,
   - `normalized_key`,
   - `quantity` opcional,
   - `checked = false`,
   - `created_at`.
6. insere no início da lista do usuário.

Observação de regra:

- item marcado (`checked=true`) não bloqueia novo item igual (permite recompra).

### 3.4 Checklist e Operações

Operações suportadas:

- `toggleChecked`: alterna check e seta/remove `checked_at`;
- `removeItem`: remove por `id`;
- `clearChecked`: remove apenas marcados;
- `clearAll`: limpa toda a lista do usuário atual.

### 3.5 Sanitização e Ordenação na UI

No componente da aba:

- lê lista bruta de `itemsByUser[ownerKey]`;
- sanitiza via `sanitizeShoppingList` (remove inválidos e corrige shape);
- ordena via `useSortedShoppingItems`:
  - pendentes primeiro;
  - depois por `created_at` desc.

Resultado:

- renderização robusta mesmo com storage antigo/corrompido;
- experiência visual previsível.

### 3.6 Histórico de Compras e Sugestões

`usePurchaseHistory(savedReceipts)`:

- varre todas as notas (`receipts`);
- agrupa por chave normalizada do item;
- ordena histórico por data mais recente;
- monta sugestões por frequência (top 40).

Na `ShoppingListTab`:

- `datalist` usa sugestões;
- para cada item, busca histórico exato por chave;
- se não achar exato, usa fallback por `includes`;
- limita exibição a 3 entradas;
- `ShoppingListItem` mostra última compra e média recente de preço unitário.

### 3.7 Dependência com Receipts (nuvem/local)

- receipts vêm de `useAllReceiptsQuery`:
  - tenta Supabase quando possível;
  - fallback para `localStorage` (`@MyMercado:receipts`).
- a qualidade de sugestões/histórico da lista depende diretamente da qualidade dos receipts.

---

## 4) Diagrama de Fluxo (Ponta a Ponta)

```text
[App inicia]
   |
   |-- useSupabaseSession -> sessionUser
   |-- setSessionUserId(sessionUser?.id)
   |
   +--> [Aba "Lista" aberta]
           |
           |-- useAllReceiptsQuery()
           |      |-- tenta Supabase
           |      '-- fallback localStorage receipts
           |
           |-- usePurchaseHistory(savedReceipts)
           |      |-- historyByKey (Map<normalized_key, entradas>)
           |      '-- suggestions (top 40 por frequência)
           |
           '-- useShoppingListStore(itemsByUser[ownerKey])
                  |-- sanitizeShoppingList(rawItems)
                  '-- useSortedShoppingItems()
                         |-- pendentes primeiro
                         '-- mais recentes primeiro

[Usuário adiciona item]
   |
   '-- addItem(sessionUserId, name, qty)
          |-- valida vazio
          |-- normalizeKey(name)
          |-- bloqueia duplicado pendente
          '-- persiste em localStorage (@MyMercado:shopping-list)

[Usuário marca/desmarca]
   |
   '-- toggleChecked(...)
          |-- checked = !checked
          '-- checked_at = now | undefined

[Usuário limpa/remover]
   |
   |-- removeItem(id)
   |-- clearChecked()
   '-- clearAll()

[Render do card de item]
   |
   '-- getRecentHistory(item.normalized_key)
          |-- match exato em historyByKey
          '-- fallback por includes (chave parcial)
                -> exibe últimas compras + média unitária
```

---

## 5) Riscos e Lacunas

1. Coexistencia de modelo local e colaborativo
- modo local continua sujeito a perda em troca de dispositivo/navegador/limpeza de storage;
- modo colaborativo resolve compartilhamento/tempo real, mas adiciona governanca de membros e RLS.

2. Matching parcial no fallback de histórico
- `includes` pode aproximar itens diferentes com chaves semelhantes.
- Pode poluir média e últimas compras exibidas.

3. Duplicação de robustez em camadas
- Parte da sanitização ocorre na store (`coerceItem`) e novamente na UI (`sanitizeShoppingList`).
- Custo cognitivo e risco de divergência futura.

4. Sem suíte dedicada de testes da lista
- Regras críticas (duplicidade, ordenação, fallback de histórico) sem cobertura explícita.

5. UX de confirmação
- ações destrutivas (`clearAll`, `clearChecked`) acontecem sem confirmação.

---

## 6) Sugestões e Melhorias (Prioridade)

### P0 (alto impacto, baixo/médio esforço)

1. Adicionar testes unitários da regra da lista
- Cobrir: `addItem`, duplicidade pendente, toggle, clear, ordenação, sanitização.

2. Confirm dialog para ações destrutivas
- Confirmar `clearAll` e opcionalmente `clearChecked`.

3. Ajustar fallback de histórico para matching mais seguro
- Preferir score/token matching em vez de `includes` direto.

### P1 (alto impacto, médio esforço)

4. Suporte a múltiplas listas de compras
- Modelo atual é lista única por usuário; evoluir para `listas` + `itens por lista`.
- Exemplos de uso: "mensal", "hortifruti", "festa", "farmacia".
- Requisitos mínimos:
  - criar/renomear/excluir lista;
  - definir lista ativa;
  - mover/copiar item entre listas.

5. Sincronização opcional da lista com Supabase
- Tabela `shopping_list_items` por usuário;
- modo offline-first com merge no login;
- fallback local mantido.

6. Unificar estratégia de sanitização
- Definir ponto único de coerção (store ou util compartilhado);
- reduzir duplicidade entre UI e store.

7. Métrica simples de precisão de histórico
- Exibir indicador "match aproximado" quando cair no fallback.

### P2 (médio impacto, médio esforço)

8. Feature "reabrir item comprado"
- ação para desmarcar e atualizar posição/ordenação sem perder contexto.

9. Quantidade estruturada (número + unidade)
- hoje quantidade é string livre;
- estrutura tipada melhora cálculo e comparações futuras.

10. Auto-complete mais inteligente
- ranking por recência + frequência + sazonalidade local.

### P3 (evolução de produto)

11. Lista compartilhável
- compartilhar lista entre membros/família.

12. Sugestao automatica "comprar de novo"
- sugerir itens com base em intervalo médio de recompra.

---

## 7) Plano de Implementação Recomendado

Fase 1 (rápida):

- testes unitários das regras atuais;
- confirmação de limpeza;
- melhoria de fallback de histórico.

Fase 2 (estrutura):

- desenho de sincronização remota da lista;
- migração incremental mantendo backward compatibility local.

Fase 3 (produto):

- recomendações de recompra;
- colaboração/compartilhamento.

---

## 8) Checklist de Verificação Pós-Melhoria

- [ ] Adição de item vazio continua bloqueada.
- [ ] Duplicado pendente continua bloqueado.
- [ ] Duplicado marcado continua permitido (se regra de negócio mantida).
- [ ] Ordenação pendente/checado estável.
- [ ] Histórico não mistura itens não equivalentes.
- [ ] `clearAll` e `clearChecked` têm proteção UX.
- [ ] Persistência funciona offline.
- [ ] (se implementado) sincronização multi-dispositivo consistente.

---

## 9) Conclusão

A implementação atual é sólida para um modelo local-first e já entrega valor real com histórico e sugestões.  
O maior gap de produto é a ausência de sincronização da lista.  
O maior gap técnico é a falta de cobertura automatizada das regras centrais.

Com o pacote P0 + P1, a feature evolui de "boa e pratica" para "confiavel em escala de uso real".

---

## 10) Status Atualizado (2026-04-01)

### Melhorias ja implementadas

- [x] Confirmacao para `clearAll` e `clearChecked`.
- [x] Testes de regras centrais da lista (store + ordenacao + matching/historico).
- [x] Evolucao para multiplas listas (criar/renomear/excluir/ativa).
- [x] Mover e copiar item entre listas.
- [x] Sincronizacao opcional com nuvem (toggle + sync manual + sync no login).
- [x] Autosync em background com debounce e protecao contra concorrencia.
- [x] Resolucao de conflito em sync evoluida para merge estrutural por lista.
- [x] Matching de historico melhorado (token-score) com badge de confianca (`Exato`/`Aproximado`).
- [x] Lista colaborativa com tabelas dedicadas no Supabase (`shopping_lists`, `shopping_list_members`, `shopping_list_items`).
- [x] Entrada em lista colaborativa por codigo de compartilhamento.
- [x] Realtime de itens da lista colaborativa (marcar/desmarcar/adicionar/remover entre contas).
- [x] Gestao de membros pelo owner (papel `editor`/`viewer` e remocao).
- [x] Acao "Sair da lista" para membros nao-owner.
- [x] Transferencia de ownership para outro membro.
- [x] Exibicao de "quem marcou" item comprado (`checked_by_user_id`).

### Pontos ainda pendentes

- [ ] Estrategia de merge por item dentro da mesma lista (quando dois dispositivos alteram a mesma lista em paralelo).
- [ ] Quantidade estruturada (`valor` + `unidade`) em vez de string livre.
- [ ] Perfil publico de membro (nome/email) para exibir colaborador sem mostrar ID tecnico.
- [ ] Convite por link com expiracao/revogacao (alem do codigo simples).
- [ ] Sugestao automatica de recompra.

### Observacao de arquitetura

A arquitetura atual nao e mais "lista unica em `itemsByUser`".
Hoje o modelo persistido e por usuario com:

- multiplas listas (`lists`),
- lista ativa (`activeListId`),
- itens por lista (`itemsByList`),
- carimbo de atualizacao (`updatedAt`) para suporte ao sync.

Para colaboracao em tempo real, agora existe tambem o modelo relacional no Supabase:

- `shopping_lists`,
- `shopping_list_members`,
- `shopping_list_items`,
- RLS por membro/papel e RPCs para entrada por codigo e transferencia de ownership.

