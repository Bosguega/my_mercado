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
      if (processingRef.current) return;
      processingRef.current = true;

      setScanning(false);
      setLoading(true);
      try {
        if (!decodedText || typeof decodedText !== 'string') {
          throw new Error('Conteúdo do QR Code inválido.');
        }

        setError(null);
        const extractedData = await parseNFCeSP(decodedText.trim());

        if (
          !extractedData ||
          !extractedData.items ||
          extractedData.items.length === 0
        ) {
          toast.error(
            'Não conseguimos ler os itens dessa nota. Verifique se o QR Code é de uma NFC-e válida.',
          );
          setError('Falha ao extrair itens da nota.');
          return;
        }

        const result = await saveReceipt(extractedData);

        if (isDuplicateResult(result)) {
          setDuplicateReceipt(extractedData);
          toast(
            `Esta nota já está no seu histórico desde ${result.existingReceipt.date.split(' ')[0]}`,
            { icon: '⚠️' },
          );
        } else if (isSuccessResult(result)) {
          setCurrentReceipt(result.receipt);
          toast.success('Nota fiscal processada com sucesso!');
        }
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Desconhecido';
        toast.error('Erro ao processar nota. Tente novamente.');
        setError(
          `Erro de conexão ou processamento: ${message}`,
        );
      } finally {
        setLoading(false);
        processingRef.current = false;
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
      const file = event.target.files?.[0];
      if (!file) return;

      setLoading(true);
      try {
        // Usar html5-qrcode para scan de arquivo
        if (html5QrcodeRef.current) {
          const decodedText = await html5QrcodeRef.current.scanFile(file, true);
          if (decodedText) {
            await handleScanSuccess(decodedText);
          }
        } else {
          // Criar instância temporária para scan de arquivo
          const html5QrCode = new Html5Qrcode('reader');
          const decodedText = await html5QrCode.scanFile(file, true);
          html5QrCode.clear();
          if (decodedText) {
            await handleScanSuccess(decodedText);
          }
        }
      } catch (err) {
        console.error('Upload detection fail:', err);
        toast.error('QR Code não detectado na imagem.');
      } finally {
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
