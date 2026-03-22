# 🛒 My Mercado - Gestão Inteligente de Compras

O **My Mercado** é uma aplicação completa e moderna (Progressive Web App - PWA) para acompanhamento de preços e gestão de gastos de supermercado. Escaneie notas fiscais (NFC-e), mantenha um histórico de compras na nuvem, analise suas economias e nunca mais perca os dados de suas notas fiscais.

---

## ✨ Funcionalidades

*   **🔍 Escaneamento Inteligente**: Captura de notas fiscais via QR Code utilizando a câmera do celular ou upload de imagem. O scraping ocorre nativamente no navegador utilizando uma rotação resiliente de 3 proxies de CORS.
*   **🤖 Inteligência Artificial (BYOK)**: Normalização automática de nomes e categorias via Google Gemini ou OpenAI. A IA é treinada para preservar medidas (ex: 5kg, 350ml) e remover termos genéricos (KG, UN).
*   **📚 Dicionário Personalizado**: Aba exclusiva para gerenciar o cache da IA. Corrija manualmente nomes ou categorias e limpe o cache conforme necessário.
*   **⌨️ Lançamento Manual**: Permite cadastrar compras e itens manualmente quando não houver nota fiscal disponível.
*   **🔐 Autenticação Segura**: Suporte completo a multi-inquilinos fornecido pelo Supabase Auth. Cada usuário visualiza exclusivamente seus dados via RLS (Row Level Security).
*   **📊 Histórico e Busca**: Acompanhe o histórico de notas e busque preços de produtos específicos com gráficos de tendência.
*   **📥 Exportação e Backup**: Exporte para CSV ou realize backups completos em JSON para garantir a soberania dos seus dados.
*   **📱 Mobile-First PWA**: Interface moderna com glassmorphism, navegação inferior otimizada e instalação nativa no celular.

---

## 📂 Mapa de Arquivos do Projeto

### ⚙️ Configurações e Infraestrutura

*   **`package.json`**: Dependências (React, Recharts, VitePWA, Supabase JS, etc).
*   **`vite.config.js`**: Configurações do Vite e do plugin PWA.
*   **`ARCHITECTURE.md`**: Documentação técnica detalhada da arquitetura.
*   **`supabase_schema.sql`**: Script para criação das tabelas e políticas de segurança no Supabase.

### 🎨 Frontend (React & Design)

*   **`src/App.jsx`**: Orquestrador principal e roteamento de abas.
*   **`src/hooks/`**:
    *   `useReceipts.js`: Gerencia o estado global das notas e sincronização com banco.
    *   `useApiKey.js`: Gestão da chave de API da IA.
*   **`src/services/`**:
    *   `productService.js`: Pipeline de normalização e integração com LLMs.
    *   `dbMethods.js`: Operações de banco de dados (CRUD) e lógica de backup.
    *   `receiptParser.js`: Extração de dados da Sefaz com rotação de proxies.
*   **`src/components/`**:
    *   `ScannerTab.jsx`: Interface de captura de QR Code.
    *   `DictionaryTab.jsx`: Edição manual do dicionário de produtos.
    *   `HistoryTab.jsx` / `SearchTab.jsx`: Visualização de dados e gráficos.

---

## ⚡ Tecnologias Utilizadas

- **Frontend**: React, Vite, Lucide React, Recharts, Html5-QRCode, React Hot Toast.
- **IA**: Google Gemini 1.5 Flash / OpenAI GPT-4o (via BYOK).
- **Backend**: Supabase (PostgreSQL Nuvem).
- **PWA**: *vite-plugin-pwa* com suporte offline.
- **Web Scraping**: `DOMParser` + Rotação de Proxies (CORS Proxy, AllOrigins, etc).

---

## 🚀 Como Rodar o Projeto

1.  **Clone o repositório** e instale as dependências:
```bash
npm install
```

2.  **Configuração do Banco**:
    *   Crie um projeto no [Supabase](https://supabase.com/).
    *   Execute o conteúdo de `supabase_schema.sql` no Editor SQL do Supabase.
    *   Configure as variáveis de ambiente no `.env` (use o `.env.example` como base).

3.  **Execução**:
```bash
# Desenvolvimento padrão
npm run dev

# Com HTTPS (recomendado para testar câmera no celular)
npm run dev:https
```
