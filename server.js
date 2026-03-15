import express from 'express';
import cors from 'cors';
import axios from 'axios';
import * as cheerio from 'cheerio';
import https from 'https';
import { initDb, getAllReceipts, insertReceipt, deleteReceiptById } from './db.js';

const app = express();
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

const api = axios.create({
  // ⚠️ Nota: rejectUnauthorized: false é usado aqui para permitir a conexão com servidores Sefaz 
  // que podem ter problemas de certificado em ambientes de desenvolvimento ou proxies específicos.
  httpsAgent: new https.Agent({ rejectUnauthorized: false }),
  headers: {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
    'Accept-Language': 'pt-BR,pt;q=0.9,en-US;q=0.8,en;q=0.7',
    'Connection': 'keep-alive',
    'Upgrade-Insecure-Requests': '1'
  }
});

// 🗄️ Init DB
initDb();

// 🧾 Rota: Parse de nota fiscal da Sefaz
app.post('/api/parse', async (req, res) => {
  try {
    const { url } = req.body;
    if (!url) return res.status(400).json({ error: 'URL is required' });

    console.log('🔍 Fetching URL:', url);
    const response = await api.get(url);
    const html = response.data;
    const $ = cheerio.load(html);

    const items = [];
    let establishment = 'Estabelecimento Desconhecido';
    let date = new Date().toISOString();

    const companyDiv = $('.txtTopo').first();
    if (companyDiv.length) {
      establishment = companyDiv.text().trim();
    }

    $('li').each((i, el) => {
      const text = $(el).text();
      if (text.includes('Emissão:')) {
        const match = text.match(/Emissão:\s*(\d{2}\/\d{2}\/\d{4}\s\d{2}:\d{2}:\d{2})/i);
        if (match) {
          date = match[1].trim();
        } else {
          date = text.replace('Emissão:', '').trim();
        }
      }
    });

    const rows = $('table#tabResult tr');

    if (rows.length > 0) {
      rows.each((i, row) => {
        const titleText = $(row).find('.txtTit').text().trim();
        if (titleText) {
          const qnt = $(row).find('.Rqtd').text().replace(/[^\d.,]/g, '').trim();
          const unitPrice = $(row).find('.RvlUnit').text().replace(/[^\d.,]/g, '').trim();
          const totalPrice = $(row).find('.valor').text().replace(/[^\d.,]/g, '').trim();

          items.push({
            name: titleText,
            qty: qnt || '1',
            unitPrice: unitPrice || '0,00',
            total: totalPrice || '0,00'
          });
        }
      });
    }

    if (items.length === 0) {
      console.log('❌ Nenhum item encontrado. HTML pode ter captcha ou layout diferente.');
      return res.status(400).json({
        error: 'Nenhum item encontrado na página da nota. A Sefaz pode ter bloqueado a consulta.',
        htmlLength: html.length
      });
    }

    let accessKey = null;
    try {
      const urlObj = new URL(url);
      const p = urlObj.searchParams.get('p');
      if (p) {
        accessKey = p.split('|')[0];
      }
    } catch (err) {
      console.error('Error parsing URL:', err);
    }

    return res.json({
      id: accessKey || Date.now().toString(),
      establishment,
      date,
      items
    });

  } catch (err) {
    console.error('❌ Error fetching Sefaz:', err.message);
    res.status(500).json({ error: 'Failed to fetch the URL' });
  }
});

// 💬 Rota: Chat (não implementada)
app.post('/api/chat', async (req, res) => {
  res.status(501).json({ error: 'Funcionalidade de chat não implementada.' });
});

// 🏷️ Rota: Categorizar itens da nota (sem IA)
app.post('/api/categorize', async (req, res) => {
  try {
    const { items } = req.body;
    if (!items || !Array.isArray(items)) {
      return res.status(400).json({ error: 'Itens são obrigatórios' });
    }
    // Retorna itens sem categorização
    res.json({ items: items.map(i => ({ ...i, category: 'Geral' })) });
  } catch (error) {
    console.error('❌ Erro ao categorizar:', error.message);
    res.json({ items: (req.body.items || []).map(i => ({ ...i, category: 'Geral' })) });
  }
});

// 🧾 Receipts CRUD
app.get('/api/receipts', async (req, res) => {
  try {
    const receipts = await getAllReceipts();
    res.json({ receipts });
  } catch {
    res.status(500).json({ error: 'Erro ao buscar histórico.' });
  }
});

app.post('/api/receipts', async (req, res) => {
  try {
    await insertReceipt(req.body);
    res.json({ success: true });
  } catch {
    res.status(500).json({ error: 'Erro ao salvar nota.' });
  }
});

app.delete('/api/receipts/:id', async (req, res) => {
  try {
    await deleteReceiptById(req.params.id);
    res.json({ success: true });
  } catch {
    res.status(500).json({ error: 'Erro ao excluir nota.' });
  }
});

// Status
app.get('/api/status', (req, res) => {
  res.json({
    status: 'online'
  });
});

// Middleware para rotas não encontradas
app.use((req, res) => {
  res.status(404).json({ error: 'Rota não encontrada' });
});

// Middleware de erro global
// eslint-disable-next-line no-unused-vars
app.use((err, req, res, _next) => {
  console.error('❌ Erro não tratado:', err);
  res.status(500).json({ error: 'Erro interno do servidor' });
});

const port = 3001;
app.listen(port, () => {
  console.log(`🚀 Node backend running on http://localhost:${port}`);
});
