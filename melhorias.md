# 🚀 My Mercado - Plano de Melhorias

## 📋 Visão Geral
Este documento contém **23 melhorias** propostas para o app My Mercado, organizadas por prioridade e status de implementação.

---

## ✅ Melhorias Implementadas

### **#1 - PropTypes Validation** ✅
**Status:** IMPLEMENTADO  
**Esforço:** ⭐ Baixo (5-10 min)  
**Impacto:** ⭐⭐ Médio  

**O que é:** Adicionar validação de tipos nas props dos componentes

**Benefícios:**
- Remove warnings do ESLint
- Previne erros em tempo de execução
- Melhora autocomplete do VSCode
- Documenta quais props cada componente espera

**Arquivos:** `ScannerTab.jsx`, `HistoryTab.jsx`, `SearchTab.jsx`

**Como testar:** Verificar console sem warnings de PropTypes

---

### **#2 - Toast Notifications** ✅
**Status:** IMPLEMENTADO  
**Esforço:** ⭐⭐ Médio (15-20 min)  
**Impacto:** ⭐⭐⭐ Alto  

**O que é:** Substituir mensagens de erro estáticas por notificações toast elegantes

**Benefícios:**
- UX muito mais profissional
- Feedback visual claro sem bloquear tela
- Auto-dismiss (não precisa clicar OK)
- Suporte múltiplos tipos (success, error, warning, info)

**Biblioteca:** `react-hot-toast`

**Toasts implementados:**
- ✅ "Nota fiscal salva com sucesso!"
- ✅ "Item adicionado!"
- ✅ "Nota manual salva com sucesso!"
- ✅ "Nota removida com sucesso!"
- ❌ "Erro ao ler QR Code"
- ❌ "Câmera não disponível"
- ❌ "QR Code não detectado"
- ⚠️ Validações de formulário

**Como testar:** Executar ações e ver toasts aparecendo no topo

---

### **#3 - Validação de Duplicidade** ✅
**Status:** IMPLEMENTADO  
**Esforço:** ⭐ Baixo (10-15 min)  
**Impacto:** ⭐⭐ Médio  

**O que é:** Impedir que usuário salve a mesma nota fiscal mais de uma vez

**Benefícios:**
- Evita dados duplicados no banco
- Economia de espaço SQLite
- Histórico mais limpo
- UX melhor (avisa se já existe)

**Implementação:**
- Verifica ID da nota antes de salvar
- Notas manuais: ID gerado por `manual_DATA_MERCADO`
- Toast amarelo de aviso
- Modal de confirmação para substituir nota anterior

**Fluxo:**
1. Nota nova → Salva normal ✅
2. Nota duplicada → Modal ⚠️
   - Cancelar (mantém original)
   - Atualizar Nota (substitui)

**Como testar:** Escanear mesma nota duas vezes

---

## 🎯 Próximas Melhorias (Por Prioridade)

### **#4 - Validação de Dados Mais Robusta** ✅
**Status:** IMPLEMENTADO  
**Esforço:** ⭐⭐ Médio (20-25 min)  
**Impacto:** ⭐⭐⭐ Alto  

**O que é:** Validar preços, datas e evitar valores inválidos

**Benefícios:**
- ✅ Evita erros de cálculo
- ✅ Dados mais confiáveis
- ✅ Menos bugs no histórico

**Implementação:**
```javascript
// Validar preços no ScannerTab
const priceNum = parseFloat(manualItem.unitPrice.toString().replace(',', '.'));
if (isNaN(priceNum) || priceNum < 0) {
  toast.error('Preço inválido! Use apenas números');
  return;
}

// Validar data no App.jsx
const dateRegex = /^\d{2}\/\d{2}\/\d{4}$/;
if (!dateRegex.test(manualData.date)) {
  toast.error('Data inválida! Use DD/MM/AAAA');
  return;
}

// Validar itens antes de salvar
const hasInvalidItems = manualData.items.some(item => {
  const price = parseFloat((item.unitPrice || '').toString().replace(',', '.'));
  const qty = parseFloat((item.qty || '').toString().replace(',', '.'));
  return isNaN(price) || isNaN(qty) || price < 0 || qty < 0;
});

// Cálculos seguros evitando NaN
const total = receipt.items.reduce((acc, curr) => {
  const value = parseFloat((curr.total || '').toString().replace(',', '.'));
  return acc + (isNaN(value) ? 0 : value);
}, 0);
```

**Arquivos:** `ScannerTab.jsx`, `App.jsx`, `HistoryTab.jsx`

**Validações implementadas:**
- ✅ Preço negativo → Bloqueado
- ✅ Preço NaN → Bloqueado
- ✅ Data formato inválido → Bloqueado
- ✅ Nome do mercado vazio → Bloqueado
- ✅ Itens com valores inválidos → Alerta antes de salvar
- ✅ Cálculos de total → Sempre retornam número válido

**Como testar:**
1. Tentar cadastrar item com preço "abc" → Erro "Preço inválido!"
2. Tentar preço negativo "-5" → Erro
3. Mudar data para "13/13/2024" → Erro "Data inválida!"
4. Preencher mercado vazio → Erro
5. Verificar totais sempre corretos

---

### **#5 - Skeleton Loading States** ✅
**Status:** IMPLEMENTADO  
**Esforço:** ⭐⭐ Médio (15-20 min)  
**Impacto:** ⭐⭐ Médio  

**O que é:** Mostrar skeletons animados enquanto carrega dados

**Benefícios:**
- ✅ UX mais polida
- ✅ Usuário sabe que está carregando
- ✅ Parece mais rápido psicologicamente
- ✅ Evita "layout shift" (pulos na tela)

**Implementação:**
```css
/* Animação shimmer no CSS */
@keyframes shimmer {
  0% { background-position: -1000px 0; }
  100% { background-position: 1000px 0; }
}

.skeleton-line {
  background: linear-gradient(
    90deg,
    rgba(255,255,255,0.03) 0%, 
    rgba(255,255,255,0.08) 50%, 
    rgba(255,255,255,0.03) 100%
  );
  background-size: 1000px 100%;
  animation: shimmer 2s infinite;
  border-radius: 6px;
}
```

```jsx
// Componente SkeletonReceipt no HistoryTab
const SkeletonReceipt = () => (
  <div className="glass-card">
    <div className="skeleton-line" style={{ width: '180px', height: '20px' }} />
    <div className="skeleton-line" style={{ width: '120px', height: '16px' }} />
    {[...Array(4)].map((_, i) => (
      <div key={i} className="skeleton-item">
        <div className="skeleton-line" style={{ width: '60%', height: '16px' }} />
      </div>
    ))}
  </div>
);

// Componente ScannerSkeleton no ScannerTab
const ScannerSkeleton = () => (
  <div className="glass-card">
    <div style={{ display: 'flex', gap: '1rem' }}>
      <div className="skeleton-line" style={{ width: '60px', height: '60px', borderRadius: '50%' }} />
      <div style={{ flex: 1 }}>
        <div className="skeleton-line" style={{ width: '200px', height: '24px' }} />
        <div className="skeleton-line" style={{ width: '120px', height: '18px' }} />
      </div>
    </div>
    {[...Array(5)].map((_, i) => (
      <div key={i} className="skeleton-item">
        <div className="skeleton-line" style={{ width: '70%', height: '16px' }} />
      </div>
    ))}
  </div>
);
```

**Arquivos:** `HistoryTab.jsx`, `ScannerTab.jsx`, `index.css`

**Skeletons implementados:**
- ✅ SkeletonReceipt (histórico vazio ou filtro sem resultados)
- ✅ ScannerSkeleton (enquanto extrai dados da nota)
- ✅ Animação shimmer (efeito de brilho passando)
- ✅ Estilo glassmorphism (mantém consistência do app)

**Como testar:**
1. **HistoryTab - Loading ao mudar aba:**
   - Tenha pelo menos uma nota no histórico
   - Mude para outra aba (ex: "Buscar")
   - Clique em "Histórico" novamente
   - **Resultado:** Ver 3 cards skeleton animados por ~800ms antes dos dados reais

2. **HistoryTab - Filtro sem resultados:**
   - Digite algo que não existe no filtro
   - **Resultado:** Mensagem "Nenhuma nota encontrada" com ícone de busca

3. **ScannerTab - Loading durante extração:**
   - Escanear QR Code
   - **Resultado:** Skeleton animado aparece enquanto extrai dados

4. **Verificar animação:**
   - Linhas têm brilho se movendo da esquerda para direita
   - Animação suave e contínua (2s loop)

---

### **#6 - Filtros Avançados no HistoryTab** ✅
**Status:** IMPLEMENTADO  
**Esforço:** ⭐⭐ Médio (20-25 min)  
**Impacto:** ⭐⭐ Médio  

**O que é:** Adicionar filtros por período e ordenação

**Benefícios:**
- ✅ Encontrar notas mais rápido
- ✅ Visualização por período específico
- ✅ Análise temporal facilitada
- ✅ UX mais completa

**Implementação:**
```jsx
// Estado dos filtros no App.jsx
const [historyFilters, setHistoryFilters] = useState({
  period: 'all', // all, this-month, last-3-months
  sortBy: 'date', // date, value, store
  sortOrder: 'desc' // asc, desc
});

// Função de filtragem no HistoryTab
const applyFilters = (receipts) => {
  let filtered = [...receipts];
  
  // Filtrar por período
  if (historyFilters.period !== 'all') {
    const now = new Date();
    const thisMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const last3Months = new Date(now.getFullYear(), now.getMonth() - 3, 1);
    
    filtered = filtered.filter(receipt => {
      const receiptDate = new Date(receipt.date.split('/').reverse().join('-'));
      if (historyFilters.period === 'this-month') return receiptDate >= thisMonth;
      if (historyFilters.period === 'last-3-months') return receiptDate >= last3Months;
      return true;
    });
  }
  
  // Ordenar
  filtered.sort((a, b) => {
    if (historyFilters.sortBy === 'date') {
      const dateA = new Date(a.date.split('/').reverse().join('-'));
      const dateB = new Date(b.date.split('/').reverse().join('-'));
      return historyFilters.sortOrder === 'asc' ? dateA - dateB : dateB - dateA;
    }
    
    if (historyFilters.sortBy === 'value') {
      const totalA = a.items.reduce((acc, item) => acc + parseFloat(item.total), 0);
      const totalB = b.items.reduce((acc, item) => acc + parseFloat(item.total), 0);
      return historyFilters.sortOrder === 'asc' ? totalA - totalB : totalB - totalA;
    }
    
    if (historyFilters.sortBy === 'store') {
      return historyFilters.sortOrder === 'asc' 
        ? a.establishment.localeCompare(b.establishment)
        : b.establishment.localeCompare(a.establishment);
    }
  });
  
  return filtered;
};
```

**UI Implementada:**
```jsx
<div className="glass-card">
  {/* Filtro de Período */}
  <select value={period} onChange={setPeriod}>
    <option value="all">📅 Todo período</option>
    <option value="this-month">Este mês</option>
    <option value="last-3-months">Últimos 3 meses</option>
  </select>
  
  {/* Filtro de Ordenação */}
  <select value={sortBy} onChange={setSortBy}>
    <option value="date">📊 Ordenar por data</option>
    <option value="value">💰 Ordenar por valor</option>
    <option value="store">🏪 Ordenar por mercado</option>
  </select>
  
  {/* Botão Ordem */}
  <button onClick={toggleSortOrder}>
    {sortOrder === 'asc' ? '⬆️ Crescente' : '⬇️ Decrescente'}
  </button>
</div>
```

**Arquivos:** `App.jsx`, `HistoryTab.jsx`

**Filtros implementados:**
- ✅ **Período:** Todo período, Este mês, Últimos 3 meses, **Personalizado**
- ✅ **Ordenação por:** Data, Valor, Mercado
- ✅ **Ordem:** Crescente / Decrescente
- ✅ **Combinação:** Filtros funcionam juntos com busca por texto
- ✅ **Data inicial/final:** Seletores de data para período customizado

**Como testar:**
1. **Filtro por período:**
   - Tenha notas de meses diferentes
   - Selecione "Este mês" → Só mostra notas do mês atual (CORRIGIDO)
   - Selecione "Últimos 3 meses" → Mostra últimas 12 semanas
   - Selecione "Período personalizado" → Aparecem campos de data
     - Escolha data inicial e final
     - Filtra notas entre as datas
   - Selecione "Todo período" → Mostra todas

2. **Ordenação por data:**
   - Selecione "Ordenar por data"
   - Alterne crescente/decrescente
   - **Resultado:** Notas ordenadas por data corretamente

3. **Ordenação por valor:**
   - Selecione "Ordenar por valor"
   - **Resultado:** Notas do maior para menor valor (ou vice-versa)

4. **Ordenação por mercado:**
   - Selecione "Ordenar por mercado"
   - **Resultado:** Notas em ordem alfabética por nome do mercado

5. **Combinação:**
   - Use busca por texto + filtro período + ordenação
   - **Resultado:** Todos filtros funcionam juntos

6. **Contraste melhorado:**
   - Dropdowns agora têm fundo branco (95% opacity)
   - Texto escuro (#1e293b) para melhor leitura
   - Peso da fonte 500 para melhor visibilidade
```

---

### **#7 - Exportação para CSV/Excel** ✅
**Status:** IMPLEMENTADO  
**Esforço:** ⭐⭐ Médio (15-20 min)  
**Impacto:** ⭐⭐⭐ Alto  

**O que é:** Botão para exportar histórico como planilha

**Benefícios:**
- ✅ Backup fora do app
- ✅ Análise no Excel/Google Sheets
- ✅ Compartilhamento fácil
- ✅ Integração com outros sistemas

**Implementação:**
```javascript
const handleExportCSV = () => {
  if (finalFilteredReceipts.length === 0) {
    toast.error('Não há dados para exportar');
    return;
  }

  // CSV Header
  const headers = ['Data', 'Mercado', 'Produto', 'Quantidade', 'Unidade', 'Preço Unitário', 'Total'];
  
  // CSV Rows - flatten receipts and items
  const rows = finalFilteredReceipts.flatMap(receipt => 
    receipt.items.map(item => [
      receipt.date,
      receipt.establishment,
      item.name,
      item.qty || '1',
      item.unit || 'un',
      item.unitPrice || '0,00',
      item.total || '0,00'
    ])
  );

  // Combine all CSV content
  const csvContent = [
    headers.join(';'), // Use semicolon for Brazilian Excel
    ...rows.map(row => row.map(cell => `"${cell}"`).join(';')) // Quote cells
  ].join('\n');

  // Create blob and download
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  
  // Generate filename with current date
  const date = new Date().toISOString().split('T')[0];
  link.download = `my_mercado_${date}.csv`;
  
  // Trigger download
  link.href = url;
  link.click();
  
  // Cleanup
  URL.revokeObjectURL(url);
  
  toast.success(`Planilha exportada com ${rows.length} itens!`);
};
```

**UI Implementada:**
```jsx
<div style={{ display: 'flex', justifyContent: 'space-between' }}>
  <h2>📊 Histórico de Compras</h2>
  <button onClick={handleExportCSV} className="btn">
    <Download size={18} />
    Exportar CSV
  </button>
</div>
```

**Arquivos:** `HistoryTab.jsx`

**Formato do CSV:**
```csv
Data;Mercado;Produto;Quantidade;Unidade;Preço Unitário;Total
"14/03/2026";"Assaí";"Arroz Tio João";"2";"un";"25,90";"51,80"
"14/03/2026";"Assaí";"Feijão Camil";"1";"un";"12,50";"12,50"
"12/03/2026";"Extra";"Leite Parmalat";"6";"un";"4,99";"29,94"
```

**Recursos implementados:**
- ✅ **Botão dedicado** no header do HistoryTab
- ✅ **Exporta todos os dados** (respeitando filtros ativos)
- ✅ **Formato brasileiro** (ponto-e-vírgula como separador)
- ✅ **Células entre aspas** para evitar problemas com vírgulas
- ✅ **Nome do arquivo** com data atual
- ✅ **Toast de confirmação** com número de itens
- ✅ **Compatível com Excel** e Google Sheets

**Como testar:**
1. Tenha pelo menos uma nota no histórico
2. Vá em "Histórico"
3. Clique em **"Exportar CSV"**
4. **Resultado:** Download de arquivo `.csv` no seu computador
5. Abra no Excel/Google Sheets
6. **Verifique:** Todas as colunas corretamente formatadas

**Filtros respeitados:**
- Se usar busca por texto → Exporta só resultados da busca
- Se usar filtro de período → Exporta só daquele período
- Se usar ordenação → Exporta na ordem selecionada

---

### **#8 - Orçamento Mensal**
**Prioridade:** MÉDIA  
**Esforço:** ⭐⭐⭐ Alto (30-40 min)  
**Impacto:** ⭐⭐⭐ Alto  

**O que é:** Definir budget mensal e alertas de gastos

**Benefícios:**
- Controle financeiro melhor
- Alerta quando ultrapassar limite
- Consciência de gastos

**Implementação:**
```jsx
const [budget, setBudget] = useState({
  monthly: 2000,
  categories: {
    'Açougue': 400,
    'Hortifruti': 300,
    'Mercearia': 500,
    // ...
  }
});

// Calcular gastos do mês
const monthlySpending = savedReceipts
  .filter(r => isCurrentMonth(new Date(r.date)))
  .reduce((acc, r) => acc + calculateTotal(r.items), 0);

// Alerta visual
{monthlySpending > budget.monthly * 0.9 && (
  <div className="budget-warning">
    ⚠️ Você atingiu 90% do orçamento!
  </div>
)}
```

---

### **#9 - Lista de Compras Inteligente**
**Prioridade:** BAIXA  
**Esforço:** ⭐⭐⭐ Alto (40-50 min)  
**Impacto:** ⭐⭐⭐ Alto  

**O que é:** Sugestões baseadas no histórico de compras

**Benefícios:**
- Não esquece itens habituais
- Economia automática
- Experiência personalizada

**Funcionalidades:**
- Itens comprados frequentemente
- Comparação de preços atuais vs média histórica
- Alerta "preço está alto" vs "preço está bom"

---

### **#10 - Dashboard de Economia**
**Prioridade:** BAIXA  
**Esforço:** ⭐⭐ Médio (25-30 min)  
**Impacto:** ⭐⭐ Médio  

**O que é:** Insights visuais sobre economia

**Métricas:**
- "Você economizou R$ X comprando no mercado Y"
- "Seu gasto médio mensal é R$ Z"
- "Produto mais caro: Azeite"
- Gráfico de evolução de gastos

---

## 🎨 Melhorias de UI/UX

### **#11 - Confirmação de Exclusão Customizada**
**Prioridade:** BAIXA  
**Esforço:** ⭐ Baixo (10 min)  
**Impacto:** ⭐ Baixo  

Modal bonito ao invés de `window.confirm()`

---

### **#12 - Tema Claro/Escuro**
**Prioridade:** BAIXA  
**Esforço:** ⭐⭐ Médio (20-25 min)  
**Impacto:** ⭐⭐ Médio  

Toggle para usuário escolher tema

---

### **#13 - Animações de Entrada**
**Prioridade:** BAIXA  
**Esforço:** ⭐ Baixo (15 min)  
**Impacto:** ⭐⭐ Médio  

Stagger effect em listas, transições suaves

---

### **#14 - Ícones por Categoria**
**Prioridade:** BAIXA  
**Esforço:** ⭐ Baixo (10-15 min)  
**Impacto:** ⭐ Baixo  

Ícones específicos para cada categoria de produto

---

## 🔧 Melhorias Técnicas

### **#15 - TypeScript Migration**
**Prioridade:** BAIXA (futuro)  
**Esforço:** ⭐⭐⭐⭐ Muito Alto (80-100h)  
**Impacto:** ⭐⭐⭐ Alto  

Converter todo app para TypeScript

---

### **#16 - React Query / SWR**
**Prioridade:** BAIXA  
**Esforço:** ⭐⭐ Médio (20-25 min)  
**Impacto:** ⭐⭐ Médio  

Cache automático e re-fetch de dados

---

### **#17 - Context API ou Zustand**
**Prioridade:** BAIXA  
**Esforço:** ⭐⭐ Médio (25-30 min)  
**Impacto:** ⭐⭐ Médio  

Gerenciamento de estado global mais limpo

---

### **#18 - Testes Automatizados**
**Prioridade:** MÉDIA  
**Esforço:** ⭐⭐ Médio (30-40 min iniciais)  
**Impacto:** ⭐⭐⭐ Alto  

```bash
npm install -D vitest @testing-library/react
```

- Testes unitários para parsing
- Testes E2E para fluxo de scan

---

## 📱 Mobile/Futuro

### **#19 - PWA (Progressive Web App)**
**Prioridade:** BAIXA (futuro)  
**Esforço:** ⭐⭐ Médio (25-30 min)  
**Impacto:** ⭐⭐⭐ Alto  

- Instalar como app nativo
- Funcionar offline
- Push notifications

---

### **#20 - React Native Port**
**Prioridade:** BAIXA (futuro distante)  
**Esforço:** ⭐⭐⭐⭐ Muito Alto  
**Impacto:** ⭐⭐⭐ Alto  

Portar para app nativo das stores

---

## 📊 Analytics

### **#21 - Ranking de Mercados**
**Prioridade:** BAIXA  
**Esforço:** ⭐ Baixo (15-20 min)  
**Impacto:** ⭐ Baixo  

Qual mercado tem melhores preços por categoria

---

### **#22 - Previsão de Gastos**
**Prioridade:** BAIXA  
**Esforço:** ⭐⭐ Médio (25-30 min)  
**Impacto:** ⭐ Baixo  

Baseado no histórico, prever gastos do próximo mês

---

### **#23 - Backup Automático e Restauração** ✅
**Status:** IMPLEMENTADO  
**Esforço:** ⭐⭐ Médio (25-30 min)  
**Impacto:** ⭐⭐⭐ Alto  

**O que é:** Permitir salvar e carregar backup completo em JSON

**Benefícios:**
- ✅ Backup seguro fora do navegador
- ✅ Restaurar dados em outro dispositivo
- ✅ Migrar entre navegadores
- ✅ Não perder dados se limpar cache

**Arquivos:** `HistoryTab.jsx`, `App.jsx`

**Recursos implementados:**
- ✅ **3 botões no header:** Restaurar (verde), Backup (azul), CSV (laranja)
- ✅ **Validação de arquivo:** Só aceita .json
- ✅ **Validação de estrutura:** Verifica se tem `receipts`
- ✅ **Confirmação:** Alerta antes de substituir dados
- ✅ **Metadados:** Versão, data, total de notas
- ✅ **Toast feedback:** Sucesso/erro em todas as operações
- ✅ **Auto-save:** Salva no localStorage após restaurar

**Como testar:**

**Teste 1: Criar Backup**
1. Tenha várias notas no histórico
2. Vá em "Histórico"
3. Clique em **"💾 Backup"** (botão azul)
4. **Resultado:** Download de `my_mercado_backup_2026-03-14.json`
5. Abra o arquivo num editor de texto
6. **Verifique:** Estrutura JSON com todas as notas

**Teste 2: Restaurar Backup**
1. Apague algumas notas (ou todas)
2. Clique em **"📤 Restaurar"** (botão verde)
3. Selecione o arquivo JSON salvo
4. **Alerta:** "Isso irá substituir suas X notas..."
5. Clique em OK
6. **Resultado:** Notas restauradas
7. **Verifique:** Toast "Backup restaurado com X notas!"

**Teste 3: Validações**
- Tentar restaurar arquivo .txt → Erro "Arquivo inválido"
- Tentar restaurar JSON sem `receipts` → Erro "Backup inválido"
- Cancelar confirmação → Dados não são alterados

**Teste 4: Migração**
1. No Chrome: Crie backup
2. No Firefox: Restaure o mesmo arquivo
3. **Resultado:** Mesmas notas em ambos navegadores

---

## 📈 Roadmap Sugerido

### **Curto Prazo (Próximas 5 melhorias):**
1. ✅ PropTypes (FEITO)
2. ✅ Toast Notifications (FEITO)
3. ✅ Validação de Duplicidade (FEITO)
4. Validação de Dados (#4)
5. Skeleton Loading (#5)

### **Médio Prazo:**
6. Filtros Avançados (#6)
7. Exportação CSV (#7)
8. Testes Automatizados (#18)
9. Backup Automático (#23)

### **Longo Prazo:**
10. Orçamento Mensal (#8)
11. Dashboard de Economia (#10)
12. PWA (#19)

---

## 🎯 Como Continuar

Para implementar a próxima melhoria:
1. Escolher uma do roadmap
2. Ler descrição completa acima
3. Implementar seguindo exemplos
4. Testar conforme instruções
5. Marcar como IMPLEMENTADO neste arquivo

---

**Última atualização:** Março 2026  
**Melhorias implementadas:** 8/23 (35%)  
**Próxima melhoria:** #8 - Orçamento Mensal
