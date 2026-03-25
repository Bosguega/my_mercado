// Web Worker para processamento de parser de notas fiscais
// Move processamento pesado para thread separada

interface ParseMessage {
    type: "parse";
    html: string;
    url: string;
}

interface ParseResult {
    type: "result";
    success: boolean;
    receipt?: any;
    error?: string;
}

// Função de parsing simplificada para o worker
function parseNFCeHTML(html: string, url: string): any {
    // Implementação simplificada do parser
    // Em produção, seria mais completa

    const parser = new DOMParser();
    const doc = parser.parseFromString(html, "text/html");

    let establishment = "Estabelecimento Desconhecido";
    let date = new Date().toISOString();
    const items: any[] = [];

    // Extrair estabelecimento
    const companyDiv = doc.querySelector(".txtTopo");
    if (companyDiv) {
        establishment = (companyDiv.textContent || "").trim();
    }

    // Extrair data
    const lis = doc.querySelectorAll("li");
    lis.forEach((li) => {
        const text = li.textContent || "";
        if (text.includes("Emissao:") || text.includes("Emissão:")) {
            const match = text.match(/Emiss[aã]o:\s*(\d{2}\/\d{2}\/\d{4}\s\d{2}:\d{2}:\d{2})/i);
            date = match ? (match[1] || "").trim() : text.replace(/Emiss[aã]o:/i, "").trim();
        }
    });

    // Extrair itens
    const rows = doc.querySelectorAll("table#tabResult tr");
    rows.forEach((row) => {
        const titleEl = row.querySelector(".txtTit");
        if (!titleEl) return;

        const rawName = (titleEl.textContent || "").trim();
        const fullText = row.textContent || "";

        // Extrair quantidade e unidade
        const qtyMatch = fullText.match(/Qtde\.?:\s*([\d.,]+)/i);
        const unitMatch = fullText.match(/UN:\s*([A-Z]+)/i);
        const qty = qtyMatch ? qtyMatch[1] : "1";
        const unit = unitMatch ? unitMatch[1].toUpperCase() : "UN";

        // Extrair preço unitário
        const priceMatch = fullText.match(/Vl\.?\s*Unit\.?:\s*([\d.,]+)/i);
        const unitPrice = priceMatch ? priceMatch[1] : "0,00";

        // Extrair total
        const totalEl = row.querySelector(".valor");
        const total = totalEl ? (totalEl.textContent || "0,00").replace(/[^\d,.-]/g, "").trim() : "0,00";

        // Limpar nome
        const name = rawName
            .replace(/\(C[óo]digo:.*?\)/i, "")
            .replace(/(?<!\d)\s+(KG|G|ML|L|UN|PC|CX)\b$/i, "")
            .replace(/\s+/g, " ")
            .trim();

        items.push({
            name,
            qty,
            unit,
            unitPrice,
            total,
        });
    });

    if (!items.length) {
        throw new Error("Nenhum item encontrado na nota.");
    }

    // Extrair chave de acesso
    let accessKey: string | null = null;
    try {
        const urlObj = new URL(url);
        const p = urlObj.searchParams.get("p");
        const chNFe = urlObj.searchParams.get("chNFe");

        if (p) {
            accessKey = decodeURIComponent(p).split("|")[0];
        } else if (chNFe) {
            accessKey = chNFe;
        }
    } catch {
        // noop
    }

    return {
        id: accessKey || Date.now().toString(),
        establishment,
        date,
        items,
    };
}

// Handler de mensagens do worker
self.onmessage = async (e: MessageEvent<ParseMessage>) => {
    if (e.data.type === "parse") {
        try {
            const receipt = parseNFCeHTML(e.data.html, e.data.url);

            const result: ParseResult = {
                type: "result",
                success: true,
                receipt,
            };

            self.postMessage(result);
        } catch (error) {
            const result: ParseResult = {
                type: "result",
                success: false,
                error: error instanceof Error ? error.message : "Erro desconhecido",
            };

            self.postMessage(result);
        }
    }
};