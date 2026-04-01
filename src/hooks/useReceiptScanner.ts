import { useCallback, useEffect } from 'react';
import { useScannerStore } from '../stores/useScannerStore';
import { useCameraScanner } from './useCameraScanner';
import { useManualReceipt } from './useManualReceipt';
import { useQRCodeProcessor } from './useQRCodeProcessor';
import type { Receipt } from '../types/domain';
import type { AppTab } from '../types/ui';

type SaveReceiptResponse =
  | { duplicate: true; existingReceipt: Receipt }
  | { success: true; receipt: Receipt }
  | { success: false; error: unknown };

type SaveReceiptFn = (
  receipt: Receipt,
  forceReplace?: boolean,
) => Promise<SaveReceiptResponse>;

/**
 * Hook principal do Scanner - orquestra os hooks menores
 */
export function useReceiptScanner({
  saveReceipt,
  tab,
}: {
  saveReceipt: SaveReceiptFn;
  tab: AppTab;
}) {
  const scanning = useScannerStore((state) => state.scanning);
  const setScanning = useScannerStore((state) => state.setScanning);
  const manualMode = useScannerStore((state) => state.manualMode);
  const setManualMode = useScannerStore((state) => state.setManualMode);
  const currentReceipt = useScannerStore((state) => state.currentReceipt);
  const setCurrentReceipt = useScannerStore((state) => state.setCurrentReceipt);
  const loading = useScannerStore((state) => state.loading);
  const error = useScannerStore((state) => state.error);
  const duplicateReceipt = useScannerStore((state) => state.duplicateReceipt);
  const setDuplicateReceipt = useScannerStore((state) => state.setDuplicateReceipt);

  // Hooks especializados
  const {
    html5QrcodeRef,
    processingRef,
    torch,
    torchSupported,
    startCamera,
    stopCamera,
    applyTorch,
  } = useCameraScanner();

  const { processQRCode } = useQRCodeProcessor(saveReceipt);

  const {
    manualData,
    manualItem,
    setManualItem,
    handleAddManualItem,
    handleSaveManualReceipt,
    handleCancelManualReceipt,
    getDefaultManualData,
  } = useManualReceipt(saveReceipt);

  // Handler de scan sucesso (delega para o processador de QR Code)
  const handleScanSuccess = useCallback(
    async (decodedText: string) => {
      if (processingRef.current) {
        if (import.meta.env.DEV) {
          console.log('⚠️ [Scanner] Processamento já em andamento, ignorando');
        }
        return;
      }
      processingRef.current = true;
      await processQRCode(decodedText);
      processingRef.current = false;
    },
    [processQRCode],
  );

  // Iniciar câmera quando entrar na aba scan
  useEffect(() => {
    if (tab === 'scan' && !manualMode && !scanning) {
      setScanning(true);
      // A câmera será iniciada pelo ScannerTab componente
    }

    return () => {
      if (tab !== 'scan') {
        stopCamera();
      }
    };
  }, [tab, manualMode, scanning, setScanning, stopCamera]);

  // Limpeza ao desmontar
  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, [stopCamera]);

  return {
    // Estado
    currentReceipt,
    setCurrentReceipt,
    loading,
    scanning,
    error,
    duplicateReceipt,
    setDuplicateReceipt,
    manualMode,
    setManualMode,
    manualData,
    manualItem,
    setManualItem,
    torch,
    torchSupported,

    // refs
    html5QrcodeRef,
    processingRef,

    // Ações de câmera
    startCamera,
    stopCamera,
    applyTorch,

    // Ações de scan
    handleScanSuccess,

    // Ações manuais
    handleAddManualItem,
    handleSaveManualReceipt,
    handleCancelManualReceipt,
    getDefaultManualData,
  };
}
