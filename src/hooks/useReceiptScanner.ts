import { useCallback, useEffect, useRef, type ChangeEvent } from 'react';
import { BrowserMultiFormatReader, DecodeHintType } from '@zxing/library';
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

type CameraCapabilities = MediaTrackCapabilities & {
  zoom?: {
    min: number;
    max: number;
  };
  torch?: boolean;
};

type BarcodeDetectorLike = {
  detect: (input: ImageBitmapSource) => Promise<Array<{ rawValue?: string }>>;
};

type BarcodeDetectorCtor = new (options: { formats: string[] }) => BarcodeDetectorLike;

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

  const codeReaderRef = useRef<BrowserMultiFormatReader | null>(null);
  const startTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const processingRef = useRef(false);
  const streamRef = useRef<MediaStream | null>(null);

  const applyZoom = useCallback(async (value: number) => {
    const video = document.getElementById('reader-video') as HTMLVideoElement | null;
    const stream = (streamRef.current || video?.srcObject) as MediaStream | null;
    if (!stream) return;

    const track = stream.getVideoTracks()[0];
    if (track) {
      const caps = (track.getCapabilities ? track.getCapabilities() : {}) as CameraCapabilities;
      const zoomCaps = caps.zoom;
      if (zoomCaps) {
        const clamped = Math.max(zoomCaps.min, Math.min(zoomCaps.max, value));
        try {
          await track.applyConstraints({
            advanced: [{ zoom: clamped }] as unknown as MediaTrackConstraintSet[],
          });
          setZoom(clamped);
        } catch (_e) {
          console.warn('Zoom error');
        }
      }
    }
  }, [setZoom]);

  const applyTorch = useCallback(async (on: boolean) => {
    const video = document.getElementById('reader-video') as HTMLVideoElement | null;
    const stream = (streamRef.current || video?.srcObject) as MediaStream | null;
    if (!stream) return;

    const track = stream.getVideoTracks()[0];
    if (track) {
      const caps = (track.getCapabilities ? track.getCapabilities() : {}) as CameraCapabilities;
      const canUseTorch = Boolean(caps.torch);
      if (canUseTorch) {
        try {
          await track.applyConstraints({
            advanced: [{ torch: on }] as unknown as MediaTrackConstraintSet[],
          });
          setTorch(on);
        } catch (e) {
          console.warn('Torch error:', e);
        }
      }
    }
  }, [setTorch]);

  const stopCamera = useCallback(() => {
    if (startTimeoutRef.current) {
      clearTimeout(startTimeoutRef.current);
      startTimeoutRef.current = null;
    }

    if (codeReaderRef.current) {
      try {
        codeReaderRef.current.reset();
      } catch (err: unknown) {
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
  }, [setScanning, setTorch, setTorchSupported, setZoom, setZoomSupported]);

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

    startTimeoutRef.current = setTimeout(async () => {
      startTimeoutRef.current = null;

      const video = document.getElementById('reader-video') as HTMLVideoElement | null;
      if (!video) {
        console.error('Video element not found');
        setScanning(false);
        return;
      }

      const BarcodeDetectorCtor = (window as Window & { BarcodeDetector?: BarcodeDetectorCtor })
        .BarcodeDetector;

      if (BarcodeDetectorCtor) {
        try {
          const detector = new BarcodeDetectorCtor({ formats: ['qr_code'] });
          const stream = await navigator.mediaDevices.getUserMedia({
            video: {
              facingMode: 'environment',
              width: { ideal: 1920 },
              height: { ideal: 1080 },
              advanced: [{ focusMode: 'continuous' } as unknown as MediaTrackConstraintSet],
            },
            audio: false,
          });

          streamRef.current = stream;
          video.srcObject = stream;
          await video.play();

          const track = stream.getVideoTracks()[0];
          const caps = (track.getCapabilities ? track.getCapabilities() : {}) as CameraCapabilities;
          const zoomCaps = caps.zoom;
          const hasTorch = Boolean(caps.torch);

          if (zoomCaps) {
            setZoomSupported(true);
            const initialZoom = Math.min(zoomCaps.max, 1.25);
            try {
              await track.applyConstraints({
                advanced: [{ zoom: initialZoom }] as unknown as MediaTrackConstraintSet[],
              });
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
                  if (text) {
                    handleScanSuccess(text);
                  }
                  return;
                }
              } catch (err) {
                console.error('ML Kit detection error:', err);
              }
            }

            if (streamRef.current) {
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
            streamRef.current.getTracks().forEach((t) => t.stop());
            streamRef.current = null;
          }
        }
      }

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
            advanced: [{ focusMode: 'continuous' } as unknown as MediaTrackConstraintSet],
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

        const track = streamRef.current?.getVideoTracks()[0];
        if (track?.getCapabilities) {
          const caps = track.getCapabilities() as CameraCapabilities;
          const zoomCaps = caps.zoom;
          const hasTorch = Boolean(caps.torch);
          if (zoomCaps) {
            setZoomSupported(true);
            const initialZoom = Math.min(zoomCaps.max, 1.25);
            try {
              await track.applyConstraints({
                advanced: [{ zoom: initialZoom }] as unknown as MediaTrackConstraintSet[],
              });
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
  }, [
    handleScanSuccess,
    loading,
    scanning,
    setScanning,
    setTorch,
    setTorchSupported,
    setZoom,
    setZoomSupported,
    stopCamera,
  ]);

  const handleFileUpload = useCallback(
    async (event: ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0];
      if (!file) return;

      setLoading(true);
      let imageUrl = null;
      try {
        imageUrl = URL.createObjectURL(file);

        const BarcodeDetectorCtor = (window as Window & { BarcodeDetector?: BarcodeDetectorCtor })
          .BarcodeDetector;
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
              const rawValue = barcodes[0].rawValue;
              if (rawValue) {
                await handleScanSuccess(rawValue);
              }
              return;
            }
          } catch (err) {
            console.warn('Native detect fail during upload:', err);
          }
        }

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
        toast.error('QR Code Não detectado na imagem.');
        setLoading(false);
      } finally {
        if (imageUrl) URL.revokeObjectURL(imageUrl);
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
    applyZoom,
    torch,
    torchSupported,
    applyTorch,
  };
}
