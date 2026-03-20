export async function parseNFCeSP(url) {
  try {
    // Como abolimos o servidor Node.js, não podemos fazer fetch direto no site da Fazenda Sefaz
    // por causa do bloqueio de CORS do navegador.
    // Usamos um proxy público grátis para buscar a tela do recibo e repassar para o App.
    const proxyUrl = `https://corsproxy.io/?${encodeURIComponent(url)}`;
    
    const response = await fetch(proxyUrl);
    if (!response.ok) {
      throw new Error("Falha no proxy ao acessar o site da Sefaz.");
    }

    const html = await response.text();
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
    } catch {}

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

