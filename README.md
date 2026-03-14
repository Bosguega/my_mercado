# 🛒 My Mercado - Gestão Inteligente de Compras

O **My Mercado** é uma aplicação completa para acompanhamento de preços e gestão de gastos de supermercado. Ele permite escanear notas fiscais (NFC-e), manter um histórico de compras organizado e analisar economias.

---

## 📂 Mapa de Arquivos do Projeto

Abaixo está a estrutura completa dos arquivos que compõem o sistema, incluindo configurações e arquivos base:

### ⚙️ Configurações e Infraestrutura

*   **`package.json`**: Define as dependências do projeto (como React, Recharts, Express e SQLite3) e os scripts de execução (`dev`, `build`, etc).
*   **`vite.config.js`**: Configurações do Vite para o empacotamento do frontend e carregamento do plugin do React.
*   **`index.html`**: O ponto de entrada visual. Contém as meta-tags para SEO e branding, além de carregar o script principal.
*   **`README.md`**: Este guia que você está lendo agora!

### 🖥️ Backend (Node.js & Banco de Dados)

*   **`server.js`**: O coração do servidor Express. Gerencia as rotas de API, faz o *scraping* (parsing) das notas fiscais da Sefaz e serve de ponte para o banco de dados.
*   **`db.js`**: Configuração e utilitários do **SQLite**. Contém as funções para criar tabelas, inserir, buscar e deletar registros de compras (receipts).
*   **`data.db`**: Arquivo do banco de dados SQLite onde todas as suas compras e itens ficam armazenados localmente de forma segura.

### 🎨 Frontend (React & Design)

*   **`src/main.jsx`**: O ponto de entrada do JavaScript. Inicializa o React e monta o componente raiz (`App`) no DOM.
*   **`src/App.jsx`**: Orquestrador do frontend. Coordena a navegação entre abas, gerencia o estado global das notas e a comunicação com o backend.
*   **`src/index.css`**: Sistema de design completo da aplicação. Define a identidade visual "Premium" com *Glassmorphism*, paleta de cores Dark Mode, tipografia e animações.

#### 🧩 Componentes (Abas do App)

*   **`src/components/ScannerTab.jsx`**: Interface de captura via câmera (QR Code), upload de fotos de notas e cadastro manual.
*   **`src/components/HistoryTab.jsx`**: Lista cronológica de compras com detalhes expansíveis e opção de exclusão.
*   **`src/components/SearchTab.jsx`**: Pesquisa de itens por nome e **gráficos de tendência** de preços entre diferentes mercados e datas.

#### 🛠️ Serviços e Auxiliares

*   **`src/services/receiptParser.js`**: Ponte de comunicação para envio de URLs de notas fiscais ao backend e recepção de dados estruturados.

---

## ⚡ Tecnologias Utilizadas

- **Frontend**: React, Vite, Lucide React, Recharts, Html5-QRCode.
- **Backend**: Node.js, Express, Cheerio (Web Scraping).
- **Dados**: SQLite3.

---

## 🚀 Como Rodar o Projeto

1.  **Backend**: Execute `node server.js` na raiz.
2.  **Frontend**: Execute `npm run dev` na raiz.
3.  **Acesso**: Abra `http://localhost:5173` no seu navegador.
