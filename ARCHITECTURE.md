# My Mercado — Arquitetura

**My Mercado** é um PWA (Progressive Web App) para gerenciamento de compras de supermercado.
O usuário escaneia o QR Code de notas fiscais eletrônicas brasileiras (NFC-e), consulta o histórico de compras e compara preços de produtos ao longo do tempo. Toda a persistência é feita via nuvem (Supabase) sem necessidade de servidor Node.js local.

---

<a id="índice"></a>

## Índice

1. [Diagrama de Camadas](#diagrama-de-camadas)
2. [Tecnologias Utilizadas](#tecnologias-utilizadas)
3. [Lista de Dependências (package.json)](#lista-de-dependências-packagejson)
4. [Modelo Mental](#modelo-mental)
5. [Treeview](#treeview)
6. [Mapa de Dependências](#mapa-de-dependências)
7. [Glossário de Domínio](#glossário-de-domínio)
8. [Estrutura de Dados Principal](#estrutura-de-dados-principal)
9. [Matriz de Tarefas](#matriz-de-tarefas)
10. [Fluxo de Dados](#fluxo-de-dados)
11. [Regras de Arquitetura](#regras-de-arquitetura)
12. [Registro de Decisões](#registro-de-decisões)
13. [Não-Objetivos](#não-objetivos)
14. [Estado Atual de Desenvolvimento](#estado-atual-de-desenvolvimento)
15. [Como Executar](#como-executar)
16. [Variáveis de Ambiente](#variáveis-de-ambiente)
17. [Estratégia de Tratamento de Erros](#estratégia-de-tratamento-de-erros)
18. [Pontos Frágeis](#pontos-frágeis)
19. [Convenções do Projeto](#convenções-do-projeto)

---

<a id="diagrama-de-camadas"></a>

# Diagrama de Camadas

```mermaid
graph TD
    UI["Interface React (PWA)"]
    App["App.jsx — Orquestrador"]
    Hook["useReceipts.js — State Management"]
    Pipeline["Pipeline (productService.js)"]
    Services["Conversão Sefaz (receiptParser.js)"]
    AI["IA — Google Gemini / OpenAI (BYOK)"]
    DictionaryTab["Aba Dicionário (Correção Manual)"]
    Dictionary["Tabela product_dictionary (Cache)"]
    Supabase["Supabase (Relacional: receipts, items)"]
    LocalStorage["localStorage (API Key & Fallback)"]

    UI --> App
    App --> Hook
    Hook --> Pipeline
    UI --> DictionaryTab
    DictionaryTab --> Dictionary
    Pipeline --> Services
    Pipeline --> Dictionary
    Pipeline --> AI
    App --> LocalStorage
    Pipeline -- "Persistência" --> Supabase
```

A regra principal de dependência é:
**Interface → App/Hooks → Serviços → Backend como Serviço (Supabase) / Proxy Externo**

[↑ Voltar ao índice](#índice)

---

<a id="tecnologias-utilizadas"></a>

# Tecnologias Utilizadas

O My Mercado utiliza uma stack moderna voltada para performance, resiliência e experiência do usuário (UX) de alta fidelidade.

### **Frontend & Framework**
- **React 18**: Biblioteca principal para construção da interface baseada em componentes.
- **Vite 8**: Ferramenta de build e dev server de próxima geração, focada em velocidade.
- **Vite PWA Plugin**: Transforma o site em um Progressive Web App instalável com suporte offline básico.
- **Framer Motion**: Motor de animações utilizado para reordenamento fluido de listas e transições de interface.

### **Backend & Persistência (BaaS)**
- **Supabase**: Backend-as-a-Service (BaaS) que provê:
  - **PostgreSQL**: Banco de dados relacional para armazenamento de notas e itens.
  - **Supabase Auth**: Sistema de autenticação Email/Senha.
  - **RLS (Row Level Security)**: Garante que cada usuário acesse apenas seus próprios dados diretamente via frontend.
- **SDK do Supabase**: Comunicação direta e segura entre o React e o banco de dados.

### **Inteligência Artificial (BYOK)**
- **Google Gemini / OpenAI API**: Utilizadas para normalizar nomes brutos de produtos e categorizá-los automaticamente.
- **Abordagem BYOK (Bring Your Own Key)**: O usuário fornece sua própria chave, garantindo privacidade e descentralização de custos.

### **Câmera & Scraping**
- **@zxing/library**: Biblioteca de processamento de imagem para leitura nativa de QR Codes no navegador.
- **Proxy Rotation (CORS)**: Sistema resiliente que rotaciona entre múltiplos proxies (`corsproxy.io`, `allorigins`, `cors-anywhere`) para contornar bloqueios de CORS ao acessar portais da Sefaz.
- **DOMParser Nativo**: Extração de dados estruturados a partir do HTML "sujo" retornado pelos portais governamentais.

### **Interface & Visualização**
- **Lucide React**: Biblioteca de ícones vetoriais modernos.
- **Recharts**: Biblioteca de gráficos para visualização das tendências de preços dos produtos.
- **React Hot Toast**: Sistema de notificações dinâmicas para feedback de ações (sucesso, erro, avisos).
- **Glassmorphism CSS**: Estética visual moderna baseada em transparências e desfoque de fundo.

[↑ Voltar ao índice](#índice)

---

<a id="lista-de-dependências-packagejson"></a>

# Lista de Dependências (package.json)

Abaixo estão listadas as dependências principais e de desenvolvimento com suas respectivas versões.

### **Dependências (Dependencies)**
| Biblioteca | Versão |
|---|---|
| `@supabase/supabase-js` | `2.99.3` |
| `@zxing/library` | `0.21.3` |
| `framer-motion` | `12.38.0` |
| `lucide-react` | `0.577.0` |
| `prop-types` | `15.8.1` |
| `react` | `18.3.1` |
| `react-dom` | `18.3.1` |
| `react-hot-toast` | `2.6.0` |
| `recharts` | `3.8.0` |

### **Dependências de Desenvolvimento (DevDependencies)**
| Biblioteca | Versão |
|---|---|
| `@eslint/js` | `9.13.0` |
| `@types/react` | `18.3.12` |
| `@types/react-dom` | `18.3.1` |
| `@vitejs/plugin-basic-ssl` | `1.1.0` |
| `@vitejs/plugin-react` | `6.0.1` |
| `eslint` | `9.13.0` |
| `eslint-plugin-react` | `7.37.2` |
| `eslint-plugin-react-hooks` | `5.0.0` |
| `eslint-plugin-react-refresh` | `0.4.14` |
| `globals` | `15.11.0` |
| `vite` | `8.0.2` |
| `vite-plugin-pwa` | `0.19.8` |

[↑ Voltar ao índice](#índice)

---

<a id="modelo-mental"></a>

# Modelo Mental

## 1. Nota Fiscal (Receipt)

A entidade central do sistema. Uma nota é criada a partir da leitura do QR Code de uma NFC-e ou inserida manualmente pelo usuário.

Arquivo principal: `src/App.jsx` — funções `saveReceipt`, `deleteReceipt` (via `useReceipts.js`)

Fluxo de escaneamento:

```
Usuário aponta câmera para o QR Code (ou cola link)
↓
receiptParser.js extrai os itens brutos via rotação de 3 CORS Proxies (resiliência)
↓
productService.js (Pipeline): normaliza chaves via regex avançado (preserva 5kg, remove KG genérico)
↓
Consulta ao Dicionário Global (Supabase) para evitar chamadas de IA desnecessárias
↓
Itens desconhecidos são enviados em lote para a IA (Gemini/OpenAI) com prompt refinado
↓
Dicionário é atualizado (incluindo categorias como 'Petshop')
↓
dbMethods.js persiste a nota e itens com segurança numérica (parseBRL)
```

---

## 2. Scraping Frontend-Only (Sefaz)

Navegadores bloqueiam requisições diretas a portais governamentais (Sefaz SP) por CORS. Como não rodamos mais um servidor Node.js, contornamos isso passando a requisição por um proxy de CORS gratuito. Para garantir resiliência, o sistema rotaciona entre 3 proxies diferentes (`corsproxy.io`, `allorigins`, `cors-anywhere`) caso um falhe ou bloqueie o IP. O navegador recebe o texto em HTML sujo e o converte nativamente via `DOMParser` no serviço `receiptParser.js`.

---

## 3. Persistência em Nuvem (BaaS)

A estrutura antiga em SQLite foi completamente suprimida a favor do Supabase (BaaS em PostgreSQL). Todo o tratamento (`select`, `upsert`, `delete`) acontece no cliente usando o SDK do Supabase. O `localStorage` da aplicação continua sendo atualizado apenas como fallback emergencial ou para leitura rápida offline.

---

## 4. Normalização e Agrupamento (Chave Normalizada)

Todos os itens são armazenados individualmente na tabela `items`. Isso permite uma normalização poderosa via IA, onde um item "ARROZ TIO JOAO 5KG" é vinculado a uma chave única, permitindo rastrear o menor preço de "Arroz" independente da variação do nome na nota. O sistema remove unidades genéricas (KG, UN) mas preserva medidas quantitativas (5kg, 350ml) para diferenciar produtos.

Arquivo principal: `src/components/SearchTab.jsx`, `src/components/DictionaryTab.jsx`
Apoio: `src/utils/currency.js`, `src/utils/date.js`

Fluxo:
```
Usuário digita nome ou categoria
↓
Busca filtrada na tabela 'items' vinculada à 'receipts'
↓
Agrupamento por 'normalized_key'
↓
Gráfico de tendência de preço e histórico exibido
```

[↑ Voltar ao índice](#índice)

---

<a id="treeview"></a>

# Treeview

```text
my_mercado/
│
├── public/                     # Assets estáticos e ícones do PWA
├── src/                        # Frontend React (Vite)
│   ├── components/
│   │   ├── ApiKeyModal.jsx     # Configuração de chave própria (BYOK)
│   │   ├── DictionaryTab.jsx   # Gerenciamento manual de normalização
│   │   ├── ScannerTab.jsx      
│   │   ├── HistoryTab.jsx      
│   │   └── SearchTab.jsx       
│   │
│   ├── hooks/
│   │   ├── useApiKey.js        # Hook para gestão de estado da Key/IA
│   │   └── useReceipts.js      # Centraliza lógica de Notas e Banco
│   │
│   ├── services/
│   │   ├── productService.js   # Pipeline de IA, Dicionário e Normalização
│   │   ├── dbMethods.js        # Persistência Relacional (CRUD e Backup)
│   │   ├── receiptParser.js    # Decodificação do HTML da Sefaz (com Proxy Rotation)
│   │   └── auth.js             # Lógica Supabase Auth
│   │
│   ├── utils/
│   │   ├── aiConfig.js         # Persistência local da API Key
│   │   ├── currency.js         # Parsing e formatação BRL
│   │   └── date.js             # Padronização de datas ISO/BR
│   │
│   ├── App.jsx                 # Orquestrador global (Abas e Mobile Nav)
│   └── index.css               # Design System (Glassmorphism e Responsividade)
├── .env                        # Chaves e URLs do Supabase (VITE_SUPABASE_...)
├── index.html                  # Entry point HTML & PWA manifest link
└── vite.config.js              # Configuração Vite & vite-plugin-pwa
```

[↑ Voltar ao índice](#índice)

---

<a id="mapa-de-dependências"></a>

# Mapa de Dependências

```mermaid
graph TD
    main["main.jsx"] --> App
    App --> useReceipts["hooks/useReceipts.js"]
    useReceipts --> dbMethods["services/dbMethods.js"]
    useReceipts --> productService["services/productService.js"]
    
    App --> ScannerTab
    App --> HistoryTab
    App --> SearchTab
    App --> DictionaryTab
    
    dbMethods --> supabase["supabaseClient.js"]
    productService --> AI["Gemini / OpenAI"]

    receiptParser["services/receiptParser.js"] -- "Fetch via Proxy Rotation" --> proxies["CORS Proxy Pool"]
    proxies --> Sefaz["Sefaz SP"]
```

[↑ Voltar ao índice](#índice)

---

<a id="glossário-de-domínio"></a>

# Glossário de Domínio

| Termo | Definição |
|---|---|
| **PWA** | Progressive Web App: Permite que a página se instale como um app falso no celular, acessando a câmera nativamente mesmo sendo feito apenas de HTML/JS. |
| **Supabase** | Backend-as-a-Service, alternativa ao Firebase baseada em Postgres que expõe APIs baseadas nas próprias tabelas do banco. |
| **Sefaz** | Secretaria da Fazenda — órgão responsável pelas NFC-e. Apenas Sefaz SP é suportada. |
| **BRL** | Formato monetário brasileiro mantido como `string` em armazenamento (`"12,90"`) para evitar arredondamento de JS. |

[↑ Voltar ao índice](#índice)

---

<a id="estrutura-de-dados-principal"></a>

**Schema Supabase (Nuvem)** com RLS e Autenticação Atrelada:

```sql
-- Tabela de Notas
create table public.receipts (
  id text primary key,
  establishment text,
  date timestamp,
  user_id uuid references auth.users(id) default auth.uid() not null,
  created_at timestamp with time zone default now() not null
);

-- Tabela de Itens (Relacional)
create table public.items (
  id uuid primary key default gen_random_uuid(),
  receipt_id text references receipts(id) on delete cascade,
  name text,
  normalized_key text,
  normalized_name text,
  category text,
  quantity numeric,
  unit text,
  price numeric
);

-- Tabela de Dicionário (Cache de IA)
create table public.product_dictionary (
  key text primary key,
  normalized_name text,
  category text
);
alter table public.receipts enable row level security;

create policy "Usuário vê as próprias notas" 
on public.receipts for select 
using (auth.uid() = user_id);

create policy "Usuário insere as próprias notas" 
on public.receipts for insert 
with check (auth.uid() = user_id);

create policy "Usuário atualiza as próprias notas" 
on public.receipts for update 
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

create policy "Usuário deleta as próprias notas" 
on public.receipts for delete 
using (auth.uid() = user_id);
```

> **Migração Relacional:** O campo `items_json` foi removido. Agora os itens são entidades independentes, o que permite consultas complexas de cross-shopping e análise de categorias. O sistema utiliza um pipeline de IA para garantir que itens com nomes diferentes (ex: "ARROZ TIO JOAO" e "ARROZ T. JOAO") sejam agrupados sob a mesma `normalized_key`.

[↑ Voltar ao índice](#índice)

---

<a id="matriz-de-tarefas"></a>

# Matriz de Tarefas

| Quero alterar | Arquivo principal | Arquivo de apoio |
|---|---|---|
| Lógica de escaneamento da câmera | `src/components/ScannerTab.jsx` | `src/App.jsx` |
| Gerenciamento de Notas (CRUD) | `src/hooks/useReceipts.js` | `src/services/dbMethods.js` |
| Configuração de IA (BYOK) | `src/components/ApiKeyModal.jsx` | `src/utils/aiConfig.js` |
| Processamento de Itens / IA | `src/services/productService.js` | `src/hooks/useApiKey.js` |
| Dicionário e Normalização Manual | `src/components/DictionaryTab.jsx` | `src/services/productService.js` |
| Scraping / Captura de dados da nota | `src/services/receiptParser.js` | — |
| Comunicação com banco de dados | `src/services/dbMethods.js` | `src/services/supabaseClient.js` |
| Gráfico de tendência de preços | `src/components/SearchTab.jsx` | `src/services/dbMethods.js` |
| Estilização e Layout Mobile | `src/index.css` | `src/App.jsx` |

[↑ Voltar ao índice](#índice)

---

<a id="fluxo-de-dados"></a>

# Fluxo de Dados

## Escaneamento da NFC-e
```
Câmera ou Link → itens extraídos via receiptParser.js (Pool de Proxies)
↓
normalize.js: gera chaves únicas preservando volumes e variantes (ex: "COCA COLA 2L", "LEITE INTEGRAL")
↓
productService.js: separa itens de peso variável (Hortifruti/Carnes) para agrupar por nome base
↓
Consulta ao product_dictionary via Supabase para identificar itens conhecidos
↓
Itens desconhecidos são enviados em lote (max 10) para Google Gemini / OpenAI
↓
IA transforma nomes brutos em amigáveis (ex: "CERV BRAHMA LTA" → "Cerveja Brahma Lata")
↓
Novas categorizações e nomes normalizados são salvos no dicionário
↓
Nota é salva no banco relacional (receipts + items) com datas padronizadas
```

[↑ Voltar ao índice](#índice)

---

<a id="regras-de-arquitetura"></a>

# Regras de Arquitetura

1. **Sem servidor Node.js backend local.** O app deve se manter leve como PWA. Toda interligação externa (Sefaz, Postgres) deve ser feita usando o ecossistema frontend (React, Fetch, APIs de Supabase).
2. **`localStorage` atua apenas como cópia.** O histórico primordial vive no bucket do Supabase. O localStorage garante que a leitura não crashe se a pessoa abrir o PWA no celular sem internet.
3. **Parseamento unicamente em `.js` puros (separação das Views).** Lógica pesada de `DOMParser` e IA fica isolada em serviços e hooks, não no `App.jsx`.
4. **Mobile-First Design.** O layout deve ser otimizado para touch, com navegação inferior e visual "glassmorphism" moderno.

[↑ Voltar ao índice](#índice)

---

<a id="registro-de-decisões"></a>

# Registro de Decisões

| Decisão | Alternativas consideradas | Motivo |
|---|---|---|
| Migração Relacional (Adeus JSONB) | Guardar itens dentro da nota como JSON | O modelo JSONB dificultava buscas cross-nota (ex: "Qual o preço médio da maçã em todas as notas?"). O modelo relacional de `items` torna a pesquisa instantânea e rica. |
| BYOK (Bring Your Own Key) | API Key fixa no servidor / Proxy | Como o app não tem backend centralizado, a abordagem BYOK (o usuário fornece sua chave Gemini/OpenAI) garante privacidade, custo zero para o desenvolvedor e longevidade do app. |
| IA em Lote (Batching) | IA por item individual | Chamar a IA para cada item separadamente é lento e consome tokens de forma ineficiente. O pipeline agrupa itens desconhecidos em lotes de 10, reduzindo latência e custos. |
| Aba Dicionário | Confiar 100% na IA | IA pode errar categorias ou normalizações. A aba Dicionário permite ao usuário corrigir manualmente e limpar o cache, garantindo dados perfeitos. |
| Normalização Granular | Remover volumes da chave | Chaves de normalização agora preservam volumes (ex: 1L, 2L, 350ml) para que o app diferencie preços de tamanhos diferentes, mas agrupam pesos variáveis (Hortifruti) para simplificar o dicionário. |
| Rotação de Proxies | Proxy único fixo | Evita que o app pare de funcionar caso um proxy gratuito específico sofra queda ou bloqueio por parte da Sefaz. |

[↑ Voltar ao índice](#índice)

---

<a id="não-objetivos"></a>

# Não-Objetivos

- **Confirmação de E-mail:** A autenticação é simples ("Email / Senha" nativo do Supabase) e a confirmação de e-mail deve estar sempre desativada no painel web do Supabase para facilitar a usabilidade contínua.
- **Portais Governamentais Adicionais:** A estrutura da Sefaz SP é hardcoded e delicada. Expandir de cara para MT, PR, RJ implicaria em muitos if/elses de parsers distintos.

[↑ Voltar ao índice](#índice)

---

<a id="estado-atual-de-desenvolvimento"></a>

# Estado Atual de Desenvolvimento

| Funcionalidade | Status | Observação |
|---|---|---|
| IA e Categorização | ✅ Estável | Suporta Gemini / OpenAI com prompt refinado |
| Modelo Relacional | ✅ Estável | `items` normalizados e vinculados a `receipts` |
| Dicionário de Produtos | ✅ Estável | Aprendizagem contínua e edição manual do usuário |
| Histórico de Preços | ✅ Estável | Gráficos baseados em itens normalizados |
| Mobile UI | ✅ Estável | Navegação inferior, glassmorphism e responsividade |

[↑ Voltar ao índice](#índice)

---

<a id="como-executar"></a>

# Como Executar

**Pré-requisitos:**
1. Ter uma conta no [Supabase](https://supabase.com/).
2. Criar as tabelas conforme o schema em `supabase_schema.sql`.
3. Copiar suas chaves (`URL` e `ANON_KEY`) e colar nas respectivas chaves do seu `.env`.

**Passos:**
```bash
# 1. Instalar dependências
npm install

# 2. Iniciar a aplicação localmente
npm run dev

# 3. Iniciar com HTTPS forçado (Permite testar PWA e câmera pelo celular na mesma rede)
npm run dev:https
```

[↑ Voltar ao índice](#índice)

---

<a id="variáveis-de-ambiente"></a>

# Variáveis de Ambiente

| Variável | Descrição |
|---|---|
| `VITE_SUPABASE_URL` | URL do seu projeto Supabase. |
| `VITE_SUPABASE_ANON_KEY` | Chave anônima pública de API do Supabase. |
| `VITE_BASIC_SSL` | Quando `true` via `dev:https`, fornece certificado para testar leitura de QRCode. |

[↑ Voltar ao índice](#índice)

---

<a id="pontos-frágeis"></a>

# Pontos Frágeis

### 1. Robustez do Proxy de CORS
Servidores governamentais detestam requisições massivas. Embora utilizemos uma rotação de 3 proxies, se a Sefaz SP bloquear todos os IPs desses serviços, o scan falhará. O usuário pode sempre inserir manualmente em caso de queda total.

### 2. Tratamento de Sincronia
Quando abrimos a aplicação ela sincroniza com o Supabase. Caso o PWA seja manipulado longo tempo 100% offline, as alterações são mantidas em memória/localStorage, mas exigem conexão para persistência final no banco relacional.

[↑ Voltar ao índice](#índice)
