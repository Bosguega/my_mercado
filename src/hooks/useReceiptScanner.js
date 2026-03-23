import { useCallback, useEffect, useRef, useState } from 'react';
import { BrowserMultiFormatReader, DecodeHintType } from '@zxing/library';
import { toast } from 'react-hot-toast';
import { parseNFCeSP } from '../services/receiptParser';

export function useReceiptScanner({ saveReceipt, tab }) {
  const [currentReceipt, setCurrentReceipt] = useState(null);
  const [loading, setLoading] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [error, setError] = useState(null);
  const [duplicateReceipt, setDuplicateReceipt] = useState(null);

  const codeReaderRef = useRef(null);
  const startTimeoutRef = useRef(null);

  const stopCamera = useCallback(() => {
    if (startTimeoutRef.current) {
      clearTimeout(startTimeoutRef.current);
      startTimeoutRef.current = null;
    }

    if (codeReaderRef.current) {
      try {
        codeReaderRef.current.reset();
      } catch (err) {
        console.warn('Erro ao parar câmera:', err);
      } finally {
        codeReaderRef.current = null;
      }
    }

    setScanning(false);
  }, []);

  const handleScanSuccess = useCallback(
    async (decodedText) => {
      setScanning(false);
      setLoading(true);
      try {
        setError(null);
        const extractedData = await parseNFCeSP(decodedText);

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

        if (result.duplicate) {
          setDuplicateReceipt(extractedData);
          toast(
            `Esta nota já está no seu histórico desde ${result.existingReceipt.date.split(' ')[0]}`,
            { icon: '⚠️' },
          );
        } else if (result.success) {
          setCurrentReceipt(result.receipt);
          toast.success('Nota fiscal processada com sucesso!');
        }
      } catch (err) {
        toast.error('Erro ao processar nota. Tente novamente.');
        setError(
          `Erro de conexão ou processamento: ${err.message || 'Desconhecido'}`,
        );
      } finally {
        setLoading(false);
      }
    },
    [saveReceipt],
  );

  const startCamera = useCallback(async () => {
    if (scanning || loading) return;
    setScanning(true);

    startTimeoutRef.current = setTimeout(async () => {
      startTimeoutRef.current = null;
      try {
        const hints = new Map();
        hints.set(DecodeHintType.TRY_HARDER, true);

        const codeReader = new BrowserMultiFormatReader(hints);
        codeReaderRef.current = codeReader;

        const constraints = {
          audio: false,
          video: {
            facingMode: 'environment',
            width: { ideal: 1280 },
            height: { ideal: 720 },
          },
        };

        await codeReader.decodeFromConstraints(
          constraints,
          'reader-video',
          (result) => {
            if (result) {
              const text = result.getText();
              stopCamera();
              handleScanSuccess(text);
            }
          },
        );
      } catch (err) {
        setScanning(false);
        toast.error(
          'Câmera não disponível. Verifique as permissões ou se o site usa HTTPS.',
        );
        console.error('Camera fail:', err);
      }
    }, 150);
  }, [handleScanSuccess, loading, scanning, stopCamera]);

  const handleFileUpload = useCallback(
    async (event) => {
      const file = event.target.files[0];
      if (!file) return;

      setLoading(true);
      let imageUrl = null;
      try {
        const hints = new Map();
        hints.set(DecodeHintType.TRY_HARDER, true);
        const codeReader = new BrowserMultiFormatReader(hints);

        imageUrl = URL.createObjectURL(file);
        const result = await codeReader.decodeFromImageUrl(imageUrl);

        if (result) {
          await handleScanSuccess(result.getText());
        } else {
          throw new Error('Não detectado');
        }
      } catch {
        toast.error('QR Code não detectado na imagem.');
        setLoading(false);
      } finally {
        if (imageUrl) URL.revokeObjectURL(imageUrl);
      }
    },
    [handleScanSuccess],
  );

  const handleForceSaveDuplicate = useCallback(async () => {
    if (!duplicateReceipt) return;

    const result = await saveReceipt(duplicateReceipt, true);
    if (result.success) {
      setCurrentReceipt(result.receipt);
      setDuplicateReceipt(null);
      toast.success('Nota atualizada com sucesso!');
    }
  }, [duplicateReceipt, saveReceipt]);

  // Manual Mode State
  const [manualMode, setManualMode] = useState(false);
  const [manualData, setManualData] = useState({
    establishment: '',
    date: new Date().toLocaleDateString('pt-BR'),
    items: [],
  });
  const [manualItem, setManualItem] = useState({
    name: '',
    qty: '1',
    unitPrice: '',
  });

  const handleSaveManualReceipt = useCallback(async () => {
    if (manualData.items.length === 0) {
      toast.error('Adicione pelo menos um item');
      return;
    }
    if (!manualData.establishment?.trim()) {
      toast.error('Informe o nome do mercado');
      return;
    }

    // Validar data
    const dateRegex = /^\d{2}\/\d{2}\/\d{4}$/;
    if (!dateRegex.test(manualData.date)) {
      toast.error('Data inválida! Use DD/MM/AAAA');
      return;
    }

    // Validar itens (preços e quantidades)
    const hasInvalidItems = manualData.items.some((item) => {
      const price = parseFloat((item.unitPrice || '').toString().replace(',', '.'));
      const qty = parseFloat((item.qty || '').toString().replace(',', '.'));
      return isNaN(price) || isNaN(qty) || price < 0 || qty < 0;
    });

    if (hasInvalidItems) {
      toast.error(
        'Existem itens com valores inválidos. Verifique os preços e quantidades.',
      );
      return;
    }

    const toStoreSlug = (value) => {
      const base = (value || '')
        .toString()
        .trim()
        .toLowerCase()
        .replace(/\s+/g, '_')
        .replace(/[^a-z0-9_]/g, '');
      return base || 'mercado';
    };

    const normalizeManualDate = (value) => {
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
    const manualId = `manual_${normalizeManualDate(manualData.date)}_${toStoreSlug(
      manualData.establishment,
    )}_${randomSuffix.slice(0, 12)}`;
    const finalData = {
      ...manualData,
      id: manualId,
      establishment: manualData.establishment.trim() || 'Compra Manual',
    };

    setLoading(true);
    try {
      const result = await saveReceipt(finalData);
      if (result.success) {
        setCurrentReceipt(result.receipt);

        setManualMode(false);
        setManualData({
          establishment: '',
          date: new Date().toLocaleDateString('pt-BR'),
          items: [],
        });
        toast.success('Nota manual salva com sucesso!');
      }
    } catch (err) {
      toast.error('Erro ao salvar nota.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [manualData, saveReceipt]);

  useEffect(() => {
    if (tab !== 'scan') stopCamera();
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
  };
}

