import type { Receipt, ReceiptItem } from "../../types/domain";

// =========================
// SCREEN STATES
// =========================

export type ScannerScreen = "idle" | "scanning" | "loading" | "result" | "manual";

// =========================
// SAVE RESPONSE TYPES
// =========================

export type SaveReceiptResponse =
  | { duplicate: true; existingReceipt: Receipt }
  | { success: true; receipt: Receipt }
  | { success: false; error: unknown };

// =========================
// MANUAL RECEIPT TYPES
// =========================

export interface ManualReceiptData {
  establishment: string;
  date: string;
  items: ReceiptItem[];
}

export interface ManualReceiptItemInput {
  name: string;
  qty: string;
  unitPrice: string;
}

// =========================
// SCANNER CONTROLS
// =========================

export interface ScannerControls {
  zoom: number;
  zoomSupported: boolean;
  torch: boolean;
  torchSupported: boolean;
}

// =========================
// COMPONENT PROPS
// =========================

export interface ManualReceiptFormProps {
  manualData: ManualReceiptData;
  setManualData: (data: ManualReceiptData) => void;
  manualItem: ManualReceiptItemInput;
  setManualItem: (item: ManualReceiptItemInput) => void;
  onAddManualItem: () => void;
  onSaveManualReceipt: () => void;
  onCancel: () => void;
  calculateReceiptTotal: (items: ReceiptItem[]) => number;
}

export interface InitialScannerScreenProps {
  onStartCamera: () => void;
  onFileUpload: (event: React.ChangeEvent<HTMLInputElement>) => void;
  onManualMode: () => void;
  handleUrlSubmit: (url: string) => void;
  isLoading: boolean;
  isScanning: boolean;
  error: string | null;
}

export interface ScannerViewProps {
  isScanning: boolean;
  torchSupported: boolean;
  torch: boolean;
  applyTorch: (value: boolean) => void;
}

export interface ReceiptResultProps {
  currentReceipt: Receipt;
  onReset: () => void;
  calculateReceiptTotal: (items: ReceiptItem[]) => number;
}

export interface DuplicateModalProps {
  duplicateReceipt: Receipt;
  onCancel: () => void;
  onForceSave: () => void;
}

export interface LoadingScreenProps {
  message?: string;
}

export interface ScanningScreenProps {
  onStopCamera: () => void;
  torch: boolean;
  torchSupported: boolean;
  applyTorch: (on: boolean) => void;
}

// =========================
// STYLES
// =========================

export interface ScannerStyles {
  header: React.CSSProperties;
  title: React.CSSProperties;
  iconButton: React.CSSProperties;
  inputGroup: React.CSSProperties;
  sectionCard: React.CSSProperties;
  sectionTitle: React.CSSProperties;
  grid3: React.CSSProperties;
  actionButton: React.CSSProperties;
  primaryButton: React.CSSProperties;
  cameraControl: React.CSSProperties;
}
