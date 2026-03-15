# 🛒 My Mercado - Gestão Inteligente de Compras

O **My Mercado** é uma aplicação completa para acompanhamento de preços e gestão de gastos de supermercado. Ele permite escanear notas fiscais (NFC-e), manter um histórico de compras organizado, analisar economias e realizar backup dos seus dados.

---

## ✨ Funcionalidades Atuais

*   **🔍 Escaneamento Inteligente**: Captura de notas fiscais via QR Code utilizando a câmera do celular ou upload de imagem.
*   **⌨️ Lançamento Manual**: Permite cadastrar compras e itens manualmente quando não houver nota fiscal disponível.
*   **📊 Histórico Completo**: Visualização detalhada de todas as compras realizadas, com expandir/recolher itens.
*   **📅 Filtros Avançados**: Filtragem por período (Mês atual, últimos 3 meses ou período personalizado) e busca por nome do mercado.
*   **📉 Análise de Preços**: Busca de itens específicos com gráficos de tendência de preços para acompanhar variações ao longo do tempo.
*   **💾 Backup e Sincronização**:
    - **Backup JSON**: Salve todos os seus dados em um arquivo local.
    - **Restaurar**: Recupere seus dados a partir de um arquivo de backup.
    - **Sincronização**: Persistência dupla em banco de dados SQLite (backend) e LocalStorage (frontend).
*   **📥 Exportação CSV**: Exporte seu histórico completo para planilhas (Excel, Google Sheets).

---

## 📂 Mapa de Arquivos do Projeto

### ⚙️ Configurações e Infraestrutura

*   **`package.json`**: Define as dependências (React, Recharts, Express, SQLite3) e scripts (`dev`, `build`, etc).
*   **`vite.config.js`**: Configurações do Vite para o frontend.
*   **`index.html`**: Ponto de entrada com meta-tags para SEO e branding.
*   **`README.md`**: Este guia!

### 🖥️ Backend (Node.js & Banco de Dados)

*   **`server.js`**: Servidor Express que gerencia APIs, faz o *parsing* das notas fiscais e serve o backend.
*   **`db.js`**: Camada de persistência com **SQLite**. Gerencia tabelas de compras e itens.
*   **`data.db`**: Arquivo do banco de dados SQLite (armazenamento local seguro).

### 🎨 Frontend (React & Design)

*   **`src/App.jsx`**: Orquestrador principal, coordena abas e estados globais.
*   **`src/index.css`**: Design System Premium com *Dark Mode*, *Glassmorphism* e animações fluidas.

#### 🧩 Componentes (Abas do App)

*   **`src/components/ScannerTab.jsx`**: Captura via câmera, upload e cadastro manual.
*   **`src/components/HistoryTab.jsx`**: Histórico com filtros, exportação CSV e ferramentas de Backup/Restore.
*   **`src/components/SearchTab.jsx`**: Pesquisa de itens e gráficos de tendência (`recharts`).

#### 🛠️ Serviços e Auxiliares

*   **`src/services/receiptParser.js`**: Extração de dados estruturados das URLs das notas fiscais.

---

## ⚡ Tecnologias Utilizadas

- **Frontend**: React, Vite, Lucide React, Recharts, Html5-QRCode, React Hot Toast.
- **Backend**: Node.js, Express, Cheerio (Web Scraping), Axios.
- **Dados**: SQLite3.

---

## 🚀 Como Rodar o Projeto

1.  **Instalação**: `npm install`
2.  **Backend**: `node server.js`
3.  **Frontend**: `npm run dev`
4.  **Acesso**: Localmente em `http://localhost:5173`. Para testar a câmera em outros dispositivos na mesma rede, use o IP da sua máquina.

