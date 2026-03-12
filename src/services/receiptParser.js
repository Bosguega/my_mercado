export async function parseNFCeSP(url) {
  try {
    // Agora que o bloqueio da Fazenda SP previne consultas diretas do navegador usando CORS proxies genéricos,
    // usaremos um pequeno backend em Node.js (que configuramos para você localmente)
    // para atuar como uma "ponte" simulando um navegador real, sem sofrer as restrições bloqueadoras da SEFAZ.

    const response = await fetch('http://localhost:3001/api/parse', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ url })
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error('Backend Proxy Failed:', errorData);
      throw new Error(errorData.error || 'Falha ao buscar via Backend Sefaz proxy');
    }

    const data = await response.json();
    return data || null;
    
  } catch (error) {
    console.error('Error parsing NFC-e:', error);
    return null;
  }
}
