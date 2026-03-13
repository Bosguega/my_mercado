import express from 'express';
import cors from 'cors';
import axios from 'axios';
import * as cheerio from 'cheerio';
import https from 'https';
import { spawn } from 'child_process';
import fs from 'fs';
import path from 'path';
import { initDb, getAllReceipts, insertReceipt, deleteReceiptById } from './db.js';

const app = express();
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

const api = axios.create({
  httpsAgent: new https.Agent({ rejectUnauthorized: false }),
  headers: {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
    'Accept-Language': 'pt-BR,pt;q=0.9,en-US;q=0.8,en;q=0.7',
    'Connection': 'keep-alive',
    'Upgrade-Insecure-Requests': '1'
  }
});

// 🎯 LLM Configuration
const LLM_BASE_PATH = process.env.LLM_BASE_PATH || 'C:/Trabalhos/LLMs';
const MODELS_PATH = path.join(LLM_BASE_PATH, 'models');
const SERVER_PATH = path.join(LLM_BASE_PATH, 'llama_bin', 'llama-server.exe');

let llamaProcess = null;
let currentModel = null;
let llamaReady = false;

// ✅ Função auxiliar: formata receipts como JSON estruturado para o LLM
function formatReceiptsForLLM(receipts, maxItems = 50) {
  const simplified = receipts.slice(0, maxItems).map(r => ({
    loja: r.establishment,
    data: r.date,
    itens: (r.items || []).slice(0, 20).map(i => ({
      nome: i.name,
      qtd: i.qty,
      preco_unit: i.unitPrice,
      total: i.total
    }))
  }));
  return JSON.stringify(simplified, null, 2);
}

// ✅ Função: aguarda o llama-server ficar saudável
async function waitForLlamaServer(timeoutMs = 30000) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    try {
      await axios.get('http://127.0.0.1:8080/health', { timeout: 2000 });
      llamaReady = true;
      console.log('✅ LLM server saudável e pronto');
      return true;
    } catch {
      await new Promise(r => setTimeout(r, 1000));
    }
  }
  console.warn('⚠️ Timeout aguardando LLM server');
  return false;
}

// ✅ Inicializa o llama-server com flags corretas para Qwen3.5 Small
function startLlamaServer(modelName) {
  if (llamaProcess) {
    console.log('🔄 Finalizando instância anterior do llama-server...');
    try {
        llamaProcess.kill();
    } catch (e) {}
    llamaReady = false;
  }

  const modelPath = path.join(MODELS_PATH, modelName);
  console.log(`🚀 Iniciando llama-server com: ${modelName}`);

  // ⚠️ FLAGS ESSENCIAIS PARA QWEN3.5 SMALL
  const llamaArgs = [
    '-m', modelPath,
    '--host', '127.0.0.1',
    '--port', '8080',
    '--ctx-size', '4096',
    '--n-gpu-layers', '35',
    '--temp', '0.7',
    '--top-p', '0.8',
    '--top-k', '20',
    '--repeat-penalty', '1.1'
  ];

  llamaProcess = spawn(SERVER_PATH, llamaArgs, {
    shell: true,
    stdio: ['ignore', 'pipe', 'pipe']
  });

  llamaProcess.stdout.on('data', (data) => {
    const msg = data.toString();
    if (msg.includes('HTTP server listening') && !llamaReady) {
      llamaReady = true;
      console.log('✅ Llama-server pronto em http://127.0.0.1:8080');
    }
  });

  llamaProcess.stderr.on('data', (data) => {
    const msg = data.toString();
    if (msg.includes('error') || msg.includes('fail')) {
      console.error(`[llama-server ERR]: ${msg.trim()}`);
    }
    if (msg.includes('HTTP server listening') && !llamaReady) {
        llamaReady = true;
        console.log('✅ Llama-server pronto em http://127.0.0.1:8080');
      }
  });

  llamaProcess.on('close', (code) => {
    console.log(`⚠️ llama-server finalizado com código ${code}`);
    llamaReady = false;
    if (currentModel === modelName) {
      llamaProcess = null;
    }
  });

  currentModel = modelName;
}

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
    } catch (e) { }

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

// 💬 Rota: Chat com IA local
app.post('/api/chat', async (req, res) => {
  try {
    const { message, receipts: userReceipts } = req.body;

    if (!message) {
      return res.status(400).json({ error: 'Mensagem é obrigatória' });
    }

    console.log('📥 Chat request:', message.substring(0, 100) + (message.length > 100 ? '...' : ''));

    const receipts = userReceipts || await getAllReceipts();
    const contextData = formatReceiptsForLLM(receipts, 30);

    const systemPrompt = `Você é um assistente de compras de supermercado.
DADOS DISPONÍVEIS (JSON):
${contextData}

INSTRUÇÕES:
1. Responda APENAS com base nos dados acima
2. Se pedir comparação, use o campo "preco_unit"
3. Responda em português, máximo 4 frases curtas
4. Se não houver dados suficientes, diga "Não encontrei no histórico"
5. Seja direto e útil`;

    if (!llamaReady) {
      const ready = await waitForLlamaServer(30000);
      if (!ready) {
        return res.status(503).json({ error: 'IA ainda carregando. Tente em 30 segundos.' });
      }
    }

    const response = await axios.post('http://127.0.0.1:8080/v1/chat/completions', {
      model: currentModel || 'qwen3.5-2b',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: message }
      ],
      temperature: 0.7,
      top_p: 0.8,
      top_k: 20,
      max_tokens: 400,
      stream: false,
      stop: ['<|im_end|>', '<|im_start|>', 'PERGUNTA:']
    });

    if (response.data && response.data.choices && response.data.choices.length > 0) {
      let content = response.data.choices[0].message.content || '';
      res.json({ reply: content.trim() });
    } else {
      res.status(500).json({ error: 'Erro na resposta da IA.' });
    }
  } catch (error) {
    console.error('❌ Erro no chat:', error.message);
    res.status(500).json({ error: 'O servidor de IA não respondeu corretamente.' });
  }
});

// 🏷️ Rota: Categorizar itens da nota
app.post('/api/categorize', async (req, res) => {
  try {
    const { items } = req.body;
    console.log(`🏷️ Categorizando ${items?.length} itens...`);
    if (!items || !Array.isArray(items)) {
      return res.status(400).json({ error: 'Itens são obrigatórios' });
    }

    if (!llamaReady || !currentModel) {
      return res.json({ items: items.map(i => ({ ...i, category: 'Geral' })) });
    }

    const itemsList = items.map(i => i.name).join(', ');
    const systemPrompt = `Você é um classificador de produtos de mercado. 
Categorize os produtos fornecidos em uma das seguintes categorias: 
Açougue, Bebidas, Higiene, Limpeza, Hortifruti, Mercearia, Padaria, Laticínios.
Responda APENAS um JSON no formato: {"categorizacao": [{"item": "NOME", "categoria": "CATEGORIA"}]}`;

    const response = await axios.post('http://127.0.0.1:8080/v1/chat/completions', {
      model: currentModel,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: `Categorize estes itens: ${itemsList}` }
      ],
      temperature: 0.1,
      stream: false
    });

    if (response.data && response.data.choices?.[0]?.message?.content) {
      const content = response.data.choices[0].message.content.trim();
      console.log('🤖 Resposta da IA:', content);
      try {
        const jsonMatch = content.match(/\{[\s\S]*\}/);
        const categorization = JSON.parse(jsonMatch ? jsonMatch[0] : content);
        console.log('📦 Categorização processada:', categorization);
        
        const categorizedItems = items.map(item => {
          const found = categorization.categorizacao?.find(c => c.item === item.name);
          return { ...item, category: found ? found.categoria : 'Geral' };
        });
        
        res.json({ items: categorizedItems });
      } catch (e) {
        console.error('Erro ao parsear JSON da IA:', e);
        res.json({ items: items.map(i => ({ ...i, category: 'Geral' })) });
      }
    } else {
      res.json({ items: items.map(i => ({ ...i, category: 'Geral' })) });
    }
  } catch (error) {
    console.error('❌ Erro ao categorizar:', error.message);
    res.json({ items: items.map(i => ({ ...i, category: 'Geral' })) });
  }
});

// 🧾 Receipts CRUD
app.get('/api/receipts', async (req, res) => {
  try {
    const receipts = await getAllReceipts();
    res.json({ receipts });
  } catch (err) {
    res.status(500).json({ error: 'Erro ao buscar histórico.' });
  }
});

app.post('/api/receipts', async (req, res) => {
  try {
    await insertReceipt(req.body);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Erro ao salvar nota.' });
  }
});

app.delete('/api/receipts/:id', async (req, res) => {
  try {
    await deleteReceiptById(req.params.id);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Erro ao excluir nota.' });
  }
});

// 🤖 Models & Status
app.get('/api/models', (req, res) => {
  try {
    const files = fs.readdirSync(MODELS_PATH);
    const models = files.filter(f => f.endsWith('.gguf'));
    res.json({ models, currentModel });
  } catch (err) {
    res.status(500).json({ error: 'Erro ao listar modelos.' });
  }
});

app.get('/api/status', (req, res) => {
  res.json({
    status: 'online',
    llmStatus: llamaReady ? 'on' : 'off',
    currentModel: currentModel
  });
});

app.post('/api/models/select', (req, res) => {
  const { model } = req.body;
  if (!model) return res.status(400).json({ error: 'Modelo não especificado' });
  try {
    startLlamaServer(model);
    res.json({ success: true, model });
  } catch (err) {
    res.status(500).json({ error: 'Erro ao trocar modelo' });
  }
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`🚀 Node backend running on http://localhost:${PORT}`);
  console.log(`📂 LLM Base Path: ${LLM_BASE_PATH}`);
  console.log(`🤖 Aguardando seleção de modelo pelo usuário...`);
});