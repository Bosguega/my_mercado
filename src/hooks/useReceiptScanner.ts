import { useCallback, useEffect, useRef, type ChangeEvent } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import { toast } from 'react-hot-toast';
import { parseNFCeSP } from '../services/receiptParser';
import { useScannerStore } from '../stores/useScannerStore';
import { validateManualReceiptForm } from '../utils/validation';
import type { Receipt } from '../types/domain';
import type { AppTab, ScannerManualData } from '../types/ui';

type SaveReceiptResponse =
  | { duplicate: true; existingReceipt: Receipt }
  | { success: true; receipt: Receipt }
  | { success: false; error: unknown };

type SaveReceiptFn = (receipt: Receipt, forceReplace?: boolean) => Promise<SaveReceiptResponse>;

function isDuplicateResult(
  result: SaveReceiptResponse,
): result is { duplicate: true; existingReceipt: Receipt } {
  return 'duplicate' in result && result.duplicate === true;
}

function isSuccessResult(
  result: SaveReceiptResponse,
): result is { success: true; receipt: Receipt } {
  return 'success' in result && result.success === true;
}

export function useReceiptScanner({
  saveReceipt,
  tab,
}: {
  saveReceipt: SaveReceiptFn;
  tab: AppTab;
}) {
  const currentReceipt = useScannerStore((state) => state.currentReceipt);
  const setCurrentReceipt = useScannerStore((state) => state.setCurrentReceipt);
  const loading = useScannerStore((state) => state.loading);
  const setLoading = useScannerStore((state) => state.setLoading);
  const scanning = useScannerStore((state) => state.scanning);
  const setScanning = useScannerStore((state) => state.setScanning);
  const error = useScannerStore((state) => state.error);
  const setError = useScannerStore((state) => state.setError);
  const duplicateReceipt = useScannerStore((state) => state.duplicateReceipt);
  const setDuplicateReceipt = useScannerStore((state) => state.setDuplicateReceipt);
  const manualMode = useScannerStore((state) => state.manualMode);
  const setManualMode = useScannerStore((state) => state.setManualMode);
  const manualData = useScannerStore((state) => state.manualData);
  const setManualData = useScannerStore((state) => state.setManualData);
  const manualItem = useScannerStore((state) => state.manualItem);
  const setManualItem = useScannerStore((state) => state.setManualItem);
  const zoom = useScannerStore((state) => state.zoom);
  const setZoom = useScannerStore((state) => state.setZoom);
  const zoomSupported = useScannerStore((state) => state.zoomSupported);
  const setZoomSupported = useScannerStore((state) => state.setZoomSupported);
  const torch = useScannerStore((state) => state.torch);
  const setTorch = useScannerStore((state) => state.setTorch);
  const torchSupported = useScannerStore((state) => state.torchSupported);
  const setTorchSupported = useScannerStore((state) => state.setTorchSupported);

  const html5QrcodeRef = useRef<Html5Qrcode | null>(null);
  const processingRef = useRef(false);

  const handleScanSuccess = useCallback(
    async (decodedText: string) => {
      console.log('📱 [Scanner] handleScanSuccess iniciado');
      console.log('📱 [Scanner] Texto decodificado:', decodedText.substring(0, 100) + '...');
      
      if (processingRef.current) {
        console.log('⚠️ [Scanner] Processamento já em andamento, ignorando');
        return;
      }
      processingRef.current = true;

      setScanning(false);
      setLoading(true);
      console.log('📱 [Scanner] Loading = true');
      
      try {
        if (!decodedText || typeof decodedText !== 'string') {
          console.error('❌ [Scanner] Texto inválido:', decodedText);
          throw new Error('Conteúdo do QR Code inválido.');
        }

        setError(null);
        
        // Verificar se é URL da NFC-e
        const isNfceUrl = decodedText.trim().includes('fazenda.sp.gov.br');
        console.log('📱 [Scanner] É URL NFC-e?', isNfceUrl);
        
        if (isNfceUrl) {
          console.log('📱 [Scanner] Buscando dados da NFC-e via proxy...');
          toast.loading('Buscando dados da NFC-e...', { duration: 2000 });
        }
        
        console.log('📱 [Scanner] Chamando parseNFCeSP...');
        const extractedData = await parseNFCeSP(decodedText.trim());
        console.log('📱 [Scanner] Parse completado!', extractedData);

        if (
          !extractedData ||
          !extractedData.items ||
          extractedData.items.length === 0
        ) {
          console.error('❌ [Scanner] Nenhum item extraído');
          const errorMsg = isNfceUrl 
            ? 'Não foi possível ler os itens desta NFC-e.\n\nPossíveis causas:\n• NFC-e de outro estado (só SP suportado)\n• Proxy CORS indisponível\n• Nota muito antiga ou cancelada\n\nTente entrada manual.'
            : 'Não conseguimos ler os itens dessa nota. Verifique se o QR Code é de uma NFC-e válida.';
          
          toast.error(errorMsg, { duration: 10000 });
          setError('Falha ao extrair itens da nota.');
          return;
        }

        console.log('📱 [Scanner] Itens extraídos:', extractedData.items.length);
        console.log('📱 [Scanner] Estabelecimento:', extractedData.establishment);
        console.log('📱 [Scanner] Salvando receipt...');

        const result = await saveReceipt(extractedData);
        console.log('📱 [Scanner] Result do save:', result);

        if (isDuplicateResult(result)) {
          console.log('⚠️ [Scanner] Nota duplicada detectada');
          setDuplicateReceipt(extractedData);
          toast(
            `Esta nota já está no seu histórico desde ${result.existingReceipt.date.split(' ')[0]}`,
            { icon: '⚠️' },
          );
        } else if (isSuccessResult(result)) {
          console.log('✅ [Scanner] Nota salva com sucesso!', result.receipt.id);
          setCurrentReceipt(result.receipt);
          toast.success('Nota fiscal processada com sucesso!');
        }
      } catch (err: unknown) {
        console.error('❌ [Scanner] ERRO:', err);
        const message = err instanceof Error ? err.message : 'Desconhecido';
        
        // Mensagens de erro mais úteis
        let userMessage = 'Erro ao processar nota. ';
        
        if (message.includes('fetch') || message.includes('network') || message.includes('timeout')) {
          userMessage = 'Erro de conexao ao buscar NFC-e.\n\nTente:\n• Verificar internet\n• Usar entrada manual\n• Tentar novamente';
        } else if (message.includes('CORS') || message.includes('proxy')) {
          userMessage = 'Erro de CORS ao buscar NFC-e.\n\nIsso é comum em PWA.\n\nUse entrada manual ou tente novamente mais tarde.';
        } else if (message.includes('SP') || message.includes('Sao Paulo')) {
          userMessage = 'Apenas NFC-e de Sao Paulo (SP) sao suportadas.\n\nSua nota parece ser de outro estado.';
        }
        
        toast.error(userMessage, { duration: 8000 });
        setError(
          `Erro de conexão ou processamento: ${message}`,
        );
      } finally {
        setLoading(false);
        processingRef.current = false;
        console.log('📱 [Scanner] Loading = false, processamento concluído');
      }
    },
    [saveReceipt, setCurrentReceipt, setDuplicateReceipt, setError, setLoading, setScanning],
  );

  const startCamera = useCallback(async () => {
    if (scanning || loading) return;
    setScanning(true);

    try {
      // Limpar instância anterior
      if (html5QrcodeRef.current) {
        await html5QrcodeRef.current.stop();
        html5QrcodeRef.current.clear();
      }

      // Criar nova instância
      const html5QrCode = new Html5Qrcode('reader');
      html5QrcodeRef.current = html5QrCode;

      const config = {
        fps: 10,
        qrbox: { width: 250, height: 250 },
        aspectRatio: 1.0,
        disableFlip: false,
      };

      // Verificar suporte a câmera traseira
      const cameras = await Html5Qrcode.getCameras();
      const backCamera = cameras.find(cam => 
        cam.label.toLowerCase().includes('back') || 
        cam.label.toLowerCase().includes('traseira') ||
        cam.label.toLowerCase().includes('environment')
      );

      const cameraId = backCamera?.id || cameras[0]?.id;

      if (!cameraId) {
        throw new Error('Nenhuma câmera encontrada');
      }

      await html5QrCode.start(
        cameraId,
        config,
        (decodedText) => {
          if (!processingRef.current && decodedText) {
            stopCamera();
            handleScanSuccess(decodedText);
          }
        },
        (errorMessage) => {
          // Erros de leitura são normais durante o scan
          if (import.meta.env.DEV) {
            console.warn('Scan error:', errorMessage);
          }
        },
      );

      // Verificar suporte a torch (lanterna)
      const track = await navigator.mediaDevices.getUserMedia({ 
        video: { facingMode: 'environment' } 
      }).then(stream => stream.getVideoTracks()[0]);
      
      if (track) {
        const capabilities = track.getCapabilities() as MediaTrackCapabilities & { torch?: boolean };
        setTorchSupported(!!capabilities.torch);
        track.stop();
      }

      // Zoom não é suportado nativamente pelo html5-qrcode
      setZoomSupported(false);

    } catch (err) {
      setScanning(false);
      toast.error(
        'Câmera não disponível. Verifique as permissões ou se o site usa HTTPS.',
      );
      console.error('Camera fail:', err);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [handleScanSuccess, setScanning, setTorchSupported, setZoomSupported]);

  const stopCamera = useCallback(() => {
    if (html5QrcodeRef.current) {
      html5QrcodeRef.current.stop()
        .then(() => {
          html5QrcodeRef.current?.clear();
          html5QrcodeRef.current = null;
        })
        .catch((err) => {
          console.warn('Erro ao parar html5-qrcode:', err);
          html5QrcodeRef.current = null;
        });
    }
    setScanning(false);
    setZoom(1);
    setZoomSupported(false);
    setTorch(false);
  }, [setScanning, setTorch, setZoom, setZoomSupported]);

  const applyTorch = useCallback(async (on: boolean) => {
    if (!html5QrcodeRef.current) return;

    try {
      // html5-qrcode não tem API direta para torch
      // Tentar acessar a câmera e aplicar torch manualmente
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { facingMode: 'environment' } 
      });
      const track = stream.getVideoTracks()[0];
      const capabilities = track.getCapabilities() as MediaTrackCapabilities & { torch?: boolean };
      
      if (capabilities.torch) {
        await track.applyConstraints({ advanced: [{ torch: on }] as any });
        setTorch(on);
      }
      
      // Não paramos o stream pois interfere com o scanner
      // O torch será resetado quando stopCamera for chamado
    } catch (err) {
      console.warn('Torch error:', err);
    }
  }, [setTorch]);

  const handleFileUpload = useCallback(
    async (event: ChangeEvent<HTMLInputElement>) => {
      console.log('📷 [Scanner] Upload de arquivo iniciado');
      const file = event.target.files?.[0];
      if (!file) {
        console.log('⚠️ [Scanner] Nenhum arquivo selecionado');
        return;
      }

      setLoading(true);
      let imageUrl: string | null = null;
      
      try {
        console.log('📷 [Scanner] Arquivo:', file.name, file.type);
        imageUrl = URL.createObjectURL(file);

        // Criar elemento temporário para o html5-qrcode
        const tempDiv = document.createElement('div');
        tempDiv.id = 'reader-temp';
        tempDiv.style.display = 'none';
        document.body.appendChild(tempDiv);
        
        // Criar instância temporária apenas para scan de arquivo
        const tempHtml5QrCode = new Html5Qrcode('reader-temp');
        
        console.log('📷 [Scanner] Escaneando arquivo...');
        const decodedText = await tempHtml5QrCode.scanFile(file, true);
        
        console.log('📷 [Scanner] Resultado do scan:', decodedText ? 'Sucesso!' : 'Falhou');
        
        // Limpar instância e elemento temporário
        await tempHtml5QrCode.clear();
        document.body.removeChild(tempDiv);
        
        if (decodedText) {
          await handleScanSuccess(decodedText);
        } else {
          toast.error('QR Code não detectado na imagem.');
        }
      } catch (err) {
        console.error('❌ [Scanner] Upload detection fail:', err);
        toast.error('QR Code não detectado. Tente uma imagem mais clara.');
      } finally {
        if (imageUrl) {
          URL.revokeObjectURL(imageUrl);
        }
        setLoading(false);
      }
    },
    [handleScanSuccess, setLoading],
  );

  const handleForceSaveDuplicate = useCallback(async () => {
    if (!duplicateReceipt) return;

    const result = await saveReceipt(duplicateReceipt, true);
    if (isSuccessResult(result)) {
      setCurrentReceipt(result.receipt);
      setDuplicateReceipt(null);
      toast.success('Nota atualizada com sucesso!');
    }
  }, [duplicateReceipt, saveReceipt, setCurrentReceipt, setDuplicateReceipt]);

  const getDefaultManualData = (): ScannerManualData => ({
    establishment: '',
    date: new Date().toLocaleDateString('pt-BR'),
    items: [],
  });

  const handleSaveManualReceipt = useCallback(async () => {
    // 1. Validação com zod
    const validation = validateManualReceiptForm({
      establishment: manualData.establishment,
      date: manualData.date,
      items: manualData.items.map((item) => ({
        name: item.name,
        qty: String(item.qty || 1),
        unitPrice: String(item.unitPrice || 0),
      })),
    });

    if (!validation.success) {
      validation.errors.forEach((error) => toast.error(error));
      return;
    }

    const { establishment, date, items } = validation.data;

    const toStoreSlug = (value: string) => {
      const base = (value || '')
        .toString()
        .trim()
        .toLowerCase()
        .replace(/\s+/g, '_')
        .replace(/[^a-z0-9_]/g, '');
      return base || 'mercado';
    };

    const normalizeManualDate = (value: string) => {
      const match = (value || '')
        .toString()
        .match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
      if (!match) return 'data';
      const [, dd, mm, yyyy] = match;
      return `${yyyy}${mm}${dd}`;
    };

    const randomSuffix =
      (globalThis.crypto?.randomUUID?.() ||
        `${Date.now()}_${Math.random().toString(16).slice(2)}`).replace(/-/g, '');
    const manualId = `manual_${normalizeManualDate(date)}_${toStoreSlug(
      establishment,
    )}_${randomSuffix.slice(0, 12)}`;
    const finalData = {
      ...manualData,
      id: manualId,
      establishment: establishment.trim() || 'Compra Manual',
      items: items.map((item, idx) => ({
        ...manualData.items[idx],
        qty: item.qty,
        unitPrice: String(item.unitPrice),
      })),
    };

    setLoading(true);
    try {
      const result = await saveReceipt(finalData);
      if (isSuccessResult(result)) {
        setCurrentReceipt(result.receipt);

        setManualMode(false);
        setManualData(getDefaultManualData());
        toast.success('Nota manual salva com sucesso!');
      }
    } catch (err) {
      toast.error('Erro ao salvar nota.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [manualData, saveReceipt, setCurrentReceipt, setLoading, setManualData, setManualMode]);

  useEffect(() => {
    if (tab !== 'scan') stopCamera();

    return () => {
      stopCamera();
    };
  }, [stopCamera, tab]);

  return {
    currentReceipt,
    setCurrentReceipt,
    loading,
    scanning,
    error,
    duplicateReceipt,
    setDuplicateReceipt,
    handleForceSaveDuplicate,
    startCamera,
    stopCamera,
    handleFileUpload,
    handleUrlSubmit: handleScanSuccess,
    manualMode,
    setManualMode,
    manualData,
    setManualData,
    manualItem,
    setManualItem,
    handleSaveManualReceipt,
    zoom,
    zoomSupported,
    applyZoom: () => Promise.resolve(), // Não suportado pelo html5-qrcode
    torch,
    torchSupported,
    applyTorch,
  };
}
