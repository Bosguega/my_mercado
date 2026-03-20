# 🛒 My Mercado - Gestão Inteligente de Compras

O **My Mercado** é uma aplicação completa e moderna (Progressive Web App - PWA) para acompanhamento de preços e gestão de gastos de supermercado. Escaneie notas fiscais (NFC-e), mantenha um histórico de compras na nuvem, analise suas economias e nunca mais perca os dados de suas notas fiscais.

---

## ✨ Funcionalidades

*   **🔍 Escaneamento Inteligente**: Captura de notas fiscais via QR Code utilizando a câmera do celular ou upload de imagem. O scraping ocorre nativamente no navegador utilizando proxy de CORS e o `DOMParser`.
*   **⌨️ Lançamento Manual**: Permite cadastrar compras e itens manualmente quando não houver nota fiscal disponível.
*   **🔐 Autenticação Segura**: Suporte completo a multi-inquilinos (multi-tenant) fornecido pela autenticação do Supabase. Cada usuário tem sua própria conta (Email / Senha) e visualiza exclusivamente suas próprias despesas por meio das robustas políticas do banco de dados (RLS).
*   **📊 Histórico na Nuvem**: Suas transações e recibos armazenados de forma distribuída e garantida via PostgreSQL Serverless.
*   **📅 Filtros Avançados**: Filtragem por período (Mês atual, últimos 3 meses ou período personalizado) e busca por nome do mercado.
*   **📉 Análise de Preços**: Busca de itens específicos com gráficos de tendência de preços para acompanhar variações ao longo do tempo.
*   **📥 Exportação e Backup**: Você domina seus dados! Exporte de forma nativa para formato CSV ou exporte/importe backups JSON na nuvem ou de forma distribuída pelo `localStorage`.
*   **📱 Aplicativo PWA**: Instale no celular e utilize-o como um software nativo.

---

## 📂 Mapa de Arquivos do Projeto

### ⚙️ Configurações e Infraestrutura

*   **`package.json`**: Dependências da SPA (React, Recharts, VitePWA, Supabase JS, etc).
*   **`vite.config.js`**: Configurações do Vite e do plugin provedor do PWA.
*   **`ARCHITECTURE.md`**: Detalhes conceituais rígidos e fluxos de dados do aplicativo PWA.

### 🎨 Frontend (React & Design)

*   **`src/App.jsx`**: Orquestrador principal, lida com estado do Supabase Auth e roteia abas.
*   **`src/services/`**: Camada que gerencia toda a lógica de negócio do React.
    *   `auth.js`: Lida com Login/Cadastro do Supabase.
    *   `dbMethods.js`: Lida com chamadas assíncronas de upsert e remanejamento do PostgreSQL.
    *   `receiptParser.js`: Realiza extração dos recibos na Sefaz.
*   **`src/components/`**: Módulos visuais da nossa interface.
    *   `ScannerTab.jsx`: Tratamento de WebRTC e APIs nativas para a câmera.
    *   `Login.jsx`: Gateway que ampara todo o dashboard seguro.
    *  `HistoryTab.jsx` / `SearchTab.jsx`: Representações e gráficos.

---

## ⚡ Tecnologias Utilizadas

- **Frontend**: React, Vite, Lucide React, Recharts, Html5-QRCode, React Hot Toast.
- **Progressive Web App**: *vite-plugin-pwa* injetando um Web App Manifest assíncrono.
- **Backend as a Service (BaaS)**: Supabase (PostgreSQL Nuvem).
- **Web Scraping PWA**: Nativo (`corsproxy` + `DOMParser`).

---

## 🚀 Como Rodar o Projeto

É necessário clonar este repositório tendo já criado um Banco de Dados gratuito no painel do [Supabase](https://supabase.com/).

1.  **Clone o `.env.example`** para `.env` e preencha-o com suas credenciais:
```env
VITE_SUPABASE_URL=Sua URL
VITE_SUPABASE_ANON_KEY=Sua Chave Anon Publica
```
2. **Setup do Supabase DB**: No editor SQL de seu painel do Supabase, certifique-se de executar as Querys de RLS estipuladas no arquivo de arquitetura para ligar a tabela `receipts` na tabela base de `auth.users` provida automaticamente!

3.  **Instalação das bibliotecas**: 
```bash
npm install
```

4.  **Iniciando o PWA Localmente**: 
```bash
npm run dev
```
Acesse `http://localhost:5173`. Para conectar clientes pela rede e testar a permissão da câmera em navegadores restritos, execute: 
```bash
npm run dev:https
```
