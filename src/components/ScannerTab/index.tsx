import { useCallback } from "react";
import { useReceiptScanner } from "../../hooks/useReceiptScanner";
import { useReceiptsSessionStore } from "../../stores/useReceiptsSessionStore";
import { useUiStore } from "../../stores/useUiStore";
import { useSaveReceipt } from "../../hooks/queries/useReceiptsQuery";
import { IdleScreen } from "./screens/IdleScreen";
import { ScanningScreen } from "./screens/ScanningScreen";
import { LoadingScreen } from "./screens/LoadingScreen";
import { ResultScreen } from "./screens/ResultScreen";
import { ManualReceiptForm } from "./forms/ManualReceiptForm";
import { DuplicateModal } from "./modals/DuplicateModal";
import { useScannerState, useManualReceipt } from "./ScannerTab.hooks";
import type { SaveReceiptResponse } from "./ScannerTab.types";

function ScannerTab() {
  const saveReceiptMutation = useSaveReceipt();
  const sessionUserId = useReceiptsSessionStore((state) => state.sessionUserId);
  const tab = useUiStore((state) => state.tab);

  // Wrapper para adaptar a interface da mutation do React Query
  const saveReceipt = useCallback(
    async (receipt: Parameters<typeof saveReceiptMutation.mutateAsync>[0]["receipt"], forceReplace?: boolean): Promise<SaveReceiptResponse> => {
      const result = await saveReceiptMutation.mutateAsync({
        receipt,
        sessionUserId,
        forceReplace,
      });

      if ("duplicate" in result && result.duplicate) {
        return { duplicate: true, existingReceipt: result.existingReceipt };
      }
      if ("success" in result && result.success) {
        return { success: true, receipt: result.receipt };
      }
      return { success: false, error: "Unknown error" };
    },
    [saveReceiptMutation, sessionUserId]
  );

  const {
    manualMode,
    setManualMode,
    manualData,
    setManualData,
    manualItem,
    setManualItem,
    currentReceipt,
    setCurrentReceipt,
    duplicateReceipt,
    setDuplicateReceipt,
    handleReset,
    handleSetDuplicateReceipt,
  } = useScannerState({ saveReceipt, sessionUserId, tab });

  const { calculateReceiptTotal, handleAddManualItem, handleSaveManualReceipt } = useManualReceipt({
    manualData,
    manualItem,
    setManualData,
    setManualItem,
    saveReceipt,
    sessionUserId,
    onReset: handleReset,
  });

  const {
    startCamera,
    stopCamera,
    handleFileUpload,
    loading,
    scanning,
    error,
    handleUrlSubmit,
    zoom,
    zoomSupported,
    applyZoom,
    torch,
    torchSupported,
    applyTorch,
    handleForceSaveDuplicate,
  } = useReceiptScanner({ saveReceipt, tab });

  // Estados derivados
  const isLoading = loading;
  const isScanning = scanning;

  return (
    <>
      {/* Tela Manual */}
      {manualMode && (
        <ManualReceiptForm
          manualData={manualData}
          setManualData={setManualData}
          manualItem={manualItem}
          setManualItem={setManualItem}
          onAddManualItem={handleAddManualItem}
          onSaveManualReceipt={handleSaveManualReceipt}
          onCancel={() => setManualMode(false)}
          calculateReceiptTotal={calculateReceiptTotal}
        />
      )}

      {/* Tela Inicial */}
      {!manualMode && !currentReceipt && !isScanning && !isLoading && (
        <IdleScreen
          onStartCamera={startCamera}
          onFileUpload={handleFileUpload}
          onManualMode={() => setManualMode(true)}
          handleUrlSubmit={handleUrlSubmit}
          isLoading={isLoading}
          isScanning={isScanning}
          error={error}
        />
      )}

      {/* Tela de Escaneamento */}
      {!manualMode && isScanning && (
        <ScanningScreen
          onStopCamera={stopCamera}
          zoom={zoom}
          zoomSupported={zoomSupported}
          applyZoom={applyZoom}
          torch={torch}
          torchSupported={torchSupported}
          applyTorch={applyTorch}
        />
      )}

      {/* Tela de Loading */}
      {!manualMode && isLoading && <LoadingScreen />}

      {/* Tela de Resultado */}
      {!manualMode && currentReceipt && (
        <ResultScreen
          currentReceipt={currentReceipt}
          onReset={handleReset}
          calculateReceiptTotal={calculateReceiptTotal}
        />
      )}

      {/* Modal de Duplicata */}
      {duplicateReceipt && (
        <DuplicateModal
          duplicateReceipt={duplicateReceipt}
          onCancel={() => handleSetDuplicateReceipt(null)}
          onForceSave={handleForceSaveDuplicate}
        />
      )}
    </>
  );
}

export default ScannerTab;
