import { useCallback, useEffect, useRef, useState } from 'react';
import { BrowserMultiFormatReader, DecodeHintType } from '@zxing/library';
import { toast } from 'react-hot-toast';
import { parseNFCeSP } from '../services/receiptParser';

export function useReceiptScanner({
  saveReceipt,
  tab,
}: {
  saveReceipt: any; // TODO: type
  tab: any; // TODO: type
}) {
  const [currentReceipt, setCurrentReceipt] = useState<any | null>(null); // TODO: type
  const [loading, setLoading] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [duplicateReceipt, setDuplicateReceipt] = useState<any | null>(null); // TODO: type

  const codeReaderRef = useRef<any>(null); // TODO: type
  const startTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const processingRef = useRef(false);
 
  const [zoom, setZoom] = useState(1);
  const [zoomSupported, setZoomSupported] = useState(false);
  const [torch, setTorch] = useState(false);
  const [torchSupported, setTorchSupported] = useState(false);

  const streamRef = useRef<MediaStream | null>(null);

  const applyZoom = useCallback(async (value: any) => { // TODO: type
    const video = document.getElementById('reader-video') as HTMLVideoElement | null;
    const stream = (streamRef.current || video?.srcObject) as MediaStream | null;
    if (!stream) return;

    const track = stream.getVideoTracks()[0];
    if (track) {
      const caps = track.getCapabilities ? track.getCapabilities() : {};
      const zoomCaps = (caps as any).zoom; // TODO: type
      if (zoomCaps) {
        const clamped = Math.max(zoomCaps.min, Math.min(zoomCaps.max, value));
        try {
          await track.applyConstraints({ advanced: [{ zoom: clamped } as any] }); // TODO: type
          setZoom(clamped);
        } catch (_e) {
          console.warn('Zoom error');
        }
      }
    }
  }, []);

  const applyTorch = useCallback(async (on: any) => { // TODO: type
    const video = document.getElementById('reader-video') as HTMLVideoElement | null;
    const stream = (streamRef.current || video?.srcObject) as MediaStream | null;
    if (!stream) return;

    const track = stream.getVideoTracks()[0];
    if (track) {
      const caps = track.getCapabilities ? track.getCapabilities() : {};
      const torchSupported = Boolean((caps as any).torch); // TODO: type
      if (torchSupported) {
        try {
          await track.applyConstraints({ advanced: [{ torch: on } as any] }); // TODO: type
          setTorch(on);
        } catch (e) {
          console.warn('Torch error:', e);
        }
      }
    }
  }, []);

  const stopCamera = useCallback(() => {
    if (startTimeoutRef.current) {
      clearTimeout(startTimeoutRef.current);
      startTimeoutRef.current = null;
    }

    if (codeReaderRef.current) {
      try {
        codeReaderRef.current.reset();
      } catch (err: any) { // TODO: type
        console.warn('Erro ao parar ZXing:', err);
      } finally {
        codeReaderRef.current = null;
      }
    }

    if (streamRef.current) {
      try {
        streamRef.current.getTracks().forEach((track) => track.stop());
      } catch (err) {
        console.warn('Erro ao parar stream:', err);
      } finally {
        streamRef.current = null;
      }
    }

    const video = document.getElementById('reader-video') as HTMLVideoElement | null;
    if (video) {
      video.srcObject = null;
    }

     setScanning(false);
     setZoom(1);
     setZoomSupported(false);
     setTorch(false);
     setTorchSupported(false);
   }, []);

  const handleScanSuccess = useCallback(
    async (decodedText: any) => { // TODO: type
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
      } catch (err: any) { // TODO: type
        toast.error('Erro ao processar nota. Tente novamente.');
        setError(
          `Erro de conexão ou processamento: ${err?.message || 'Desconhecido'}`,
        );
      } finally {
        setLoading(false);
        processingRef.current = false;
      }
    },
    [saveReceipt],
  );

  const startCamera = useCallback(async () => {
    if (scanning || loading) return;
    setScanning(true);

    startTimeoutRef.current = setTimeout(async () => {
      startTimeoutRef.current = null;
      
      const video = document.getElementById('reader-video') as HTMLVideoElement | null;
      if (!video) {
        console.error('Video element not found');
        setScanning(false);
        return;
      }

      // Try Google ML Kit (Native BarcodeDetector) first
      const BarcodeDetectorCtor = (window as any).BarcodeDetector; // TODO: type
      const hasNativeMLKit = Boolean(BarcodeDetectorCtor);
      
      if (hasNativeMLKit) {
        try {
          const detector = new BarcodeDetectorCtor({ formats: ['qr_code'] });
          const stream = await navigator.mediaDevices.getUserMedia({
            video: { 
              facingMode: 'environment', 
              width: { ideal: 1920 }, 
              height: { ideal: 1080 },
              advanced: [{ focusMode: 'continuous' } as any] // TODO: type
            },
            audio: false
          });
          
           streamRef.current = stream;
           video.srcObject = stream;
           await video.play();
 
           const track = stream.getVideoTracks()[0];
           const caps = track.getCapabilities ? track.getCapabilities() : {};
           const zoomCaps = (caps as any).zoom; // TODO: type
           const hasTorch = Boolean((caps as any).torch); // TODO: type
           
           if (zoomCaps) {
             setZoomSupported(true);
             // Para QR codes pequenos, iniciar com um leve zoom pode ajudar
             const initialZoom = Math.min(zoomCaps.max, 1.25);
             try {
               await track.applyConstraints({ advanced: [{ zoom: initialZoom } as any] }); // TODO: type
               setZoom(initialZoom);
             } catch (_e) {
               setZoom(1);
             }
           }

           if (hasTorch) {
             setTorchSupported(true);
             setTorch(false);
           }

          const detectFrame = async () => {
            if (!streamRef.current || !video || video.paused || video.ended) return;
            
            if (!processingRef.current && video.readyState >= 2) {
              try {
                const barcodes = await detector.detect(video);
                if (barcodes.length > 0) {
                  const text = barcodes[0].rawValue;
                  stopCamera();
                  handleScanSuccess(text);
                  return;
                }
              } catch (err) {
                console.error('ML Kit detection error:', err);
              }
            }
            
            if (streamRef.current) {
              // Delay next detection to prevent CPU throttling on mobile
              setTimeout(() => {
                if (streamRef.current) requestAnimationFrame(detectFrame);
              }, 150);
            }
          };
          
          requestAnimationFrame(detectFrame);
          return;
        } catch (err) {
          console.warn('Falha ao iniciar ML Kit, tentando ZXing...', err);
          if (streamRef.current) {
            streamRef.current.getTracks().forEach(t => t.stop());
            streamRef.current = null;
          }
        }
      }

      // Fallback to ZXing
      try {
        const hints = new Map();
        hints.set(DecodeHintType.TRY_HARDER, true);

        const codeReader = new BrowserMultiFormatReader(hints);
        codeReaderRef.current = codeReader;

          const constraints = {
            audio: false,
            video: {
              facingMode: 'environment',
              width: { ideal: 1920 },
              height: { ideal: 1080 },
              advanced: [{ focusMode: 'continuous' } as any] // TODO: type
            },
          };

         await codeReader.decodeFromConstraints(
           constraints as MediaStreamConstraints,
           video,
           (result) => {
             if (result) {
               if (processingRef.current) return;
               const text = result.getText();
               stopCamera();
               handleScanSuccess(text);
             }
           },
         );

         // Check zoom for ZXing fallback too
         const track = streamRef.current?.getVideoTracks()[0];
         if (track?.getCapabilities) {
           const caps = track.getCapabilities();
           const zoomCaps = (caps as any).zoom; // TODO: type
           const hasTorch = Boolean((caps as any).torch); // TODO: type
           if (zoomCaps) {
             setZoomSupported(true);
             const initialZoom = Math.min(zoomCaps.max, 1.25);
             try {
               await track.applyConstraints({ advanced: [{ zoom: initialZoom } as any] }); // TODO: type
               setZoom(initialZoom);
             } catch (_e) {
               setZoom(1);
             }
           }
           if (hasTorch) {
             setTorchSupported(true);
             setTorch(false);
           }
         }
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
    async (event: any) => { // TODO: type
      const file = event.target.files[0];
      if (!file) return;

      setLoading(true);
      let imageUrl = null;
      try {
        imageUrl = URL.createObjectURL(file);
        
        // Try Native BarcodeDetector first
        const BarcodeDetectorCtor = (window as any).BarcodeDetector; // TODO: type
        if (BarcodeDetectorCtor) {
          try {
            const detector = new BarcodeDetectorCtor({ formats: ['qr_code'] });
            const img = new Image();
            img.src = imageUrl;
            await new Promise((resolve, reject) => {
              img.onload = resolve;
              img.onerror = reject;
            });
            
            const barcodes = await detector.detect(img);
            if (barcodes.length > 0) {
              await handleScanSuccess(barcodes[0].rawValue);
              return;
            }
          } catch (err) {
            console.warn('Native detect fail during upload:', err);
          }
        }

        // Fallback to ZXing
        const hints = new Map();
        hints.set(DecodeHintType.TRY_HARDER, true);
        const codeReader = new BrowserMultiFormatReader(hints);
        const result = await codeReader.decodeFromImageUrl(imageUrl);

        if (result) {
          await handleScanSuccess(result.getText());
        } else {
          throw new Error('Não detectado');
        }
      } catch (err) {
        console.error('Upload detection fail:', err);
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
  const [manualData, setManualData] = useState<{
    establishment: string;
    date: string;
    items: any[]; // TODO: type
  }>({
    establishment: '',
    date: new Date().toLocaleDateString('pt-BR'),
    items: [],
  });
  const [manualItem, setManualItem] = useState<{
    name: string;
    qty: string;
    unitPrice: string;
  }>({
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

    const toStoreSlug = (value: any) => { // TODO: type
      const base = (value || '')
        .toString()
        .trim()
        .toLowerCase()
        .replace(/\s+/g, '_')
        .replace(/[^a-z0-9_]/g, '');
      return base || 'mercado';
    };

    const normalizeManualDate = (value: any) => { // TODO: type
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
     zoom,
     zoomSupported,
     applyZoom,
     torch,
     torchSupported,
     applyTorch
   };
}
