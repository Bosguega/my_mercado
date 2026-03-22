const PROXIES = [
  (url) => `https://corsproxy.io/?${encodeURIComponent(url)}`,
  (url) => `https://api.allorigins.win/raw?url=${encodeURIComponent(url)}`,
  (url) => `https://thingproxy.freeboard.io/fetch/${url}`,
];

export async function parseNFCeSP(url) {
  let html = null;
  let lastError = null;

  // Tenta múltiplos proxies em sequência para aumentar a resiliência
  for (const getProxyUrl of PROXIES) {
    try {
      const proxyUrl = getProxyUrl(url);
      const response = await fetch(proxyUrl);
      if (response.ok) {
        html = await response.text();
        if (html && html.includes('tabResult')) break; // Verifica se é um HTML válido da Sefaz
      }
    } catch (err) {
      console.warn(`Falha ao tentar proxy: ${getProxyUrl(url)}`, err);
      lastError = err;
    }
  }

  if (!html) {
    throw new Error(lastError?.message || "Falha ao acessar o site da Sefaz após tentar múltiplos proxies.");
  }

  try {
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, "text/html");

    let establishment = "Estabelecimento Desconhecido";
    let date = new Date().toISOString();
    const items = [];

    // Busca Nome da Empresa
    const companyDiv = doc.querySelector(".txtTopo");
    if (companyDiv) {
      establishment = companyDiv.textContent.trim();
    }

    // Busca Data de Emissão
    const lis = doc.querySelectorAll("li");
    lis.forEach((li) => {
      const text = li.textContent;
      if (text.includes("Emissão:")) {
        const match = text.match(/Emissão:\s*(\d{2}\/\d{2}\/\d{4}\s\d{2}:\d{2}:\d{2})/i);
        if (match) {
          date = match[1].trim();
        } else {
          date = text.replace("Emissão:", "").trim();
        }
      }
    });

    // Busca Itens da Tabela
    const rows = doc.querySelectorAll("table#tabResult tr");
    rows.forEach((row) => {
      const titleEl = row.querySelector(".txtTit");
      if (titleEl) {
        const titleText = titleEl.textContent.trim();
        
        const qntEl = row.querySelector(".Rqtd");
        const qnt = qntEl ? qntEl.textContent.replace(/[^\d.,]/g, "").trim() : "1";
        
        const unitEl = row.querySelector(".RvlUnit");
        const unitPrice = unitEl ? unitEl.textContent.replace(/[^\d.,]/g, "").trim() : "0,00";
        
        const totalEl = row.querySelector(".valor");
        const totalPrice = totalEl ? totalEl.textContent.replace(/[^\d.,]/g, "").trim() : "0,00";

        items.push({
          name: titleText,
          qty: qnt || "1",
          unitPrice: unitPrice || "0,00",
          total: totalPrice || "0,00",
        });
      }
    });

    if (items.length === 0) {
      throw new Error("Nenhum item encontrado no HTML da nota.");
    }

    // Pega a chave da NFCe na própria URL
    let accessKey = null;
    try {
      const urlObj = new URL(url);
      const p = urlObj.searchParams.get("p");
      if (p) {
        accessKey = p.split("|")[0];
      }
    } catch {
      // Ignore URL parsing errors
    }

    return {
      id: accessKey || Date.now().toString(),
      establishment,
      date,
      items,
    };
  } catch (error) {
    console.error("Error parsing NFC-e via DOM Parser:", error);
    return null;
  }
}

