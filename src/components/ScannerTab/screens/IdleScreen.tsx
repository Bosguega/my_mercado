import { useState, useCallback } from "react";
import { Scan, Camera, Image as ImageIcon, Edit3, LinkIcon, Plus, X, Aperture } from "lucide-react";
import { notify } from "../../../utils/notifications";
import { validateNfcUrl } from "../../../utils/validation";
import type { InitialScannerScreenProps } from "../../../types/scanner";


export function IdleScreen({
  onStartCamera,
  onFileUpload,
  onManualMode,
  handleUrlSubmit,
  isLoading,
  isScanning,
  error,
}: InitialScannerScreenProps) {
  const [pasteMode, setPasteMode] = useState(false);
  const [pastedUrl, setPastedUrl] = useState("");

  const onLinkSubmit = useCallback(() => {
    const rawUrl = pastedUrl.trim();

    const validation = validateNfcUrl(rawUrl);

    if (!validation.success) {
      notify.error(validation.error);
      return;
    }

    handleUrlSubmit(validation.data);
    setPastedUrl("");
    setPasteMode(false);
  }, [pastedUrl, handleUrlSubmit]);

  return (
    <div className="glass-card text-center py-10 px-6">
      <div className="mb-8">
        <div className="pulse-container mx-auto w-20 h-20 flex items-center justify-center bg-blue-500/10 rounded-full">
          <Scan size={40} color="var(--primary)" />
        </div>
        <h2 className="mt-5 text-slate-50 text-[1.4rem] font-bold">
          Escanear Nota Fiscal
        </h2>
        <p className="mt-2 text-slate-400 leading-relaxed text-[0.95rem]">
          Aponte a câmera para o QR Code ou faça upload da galeria.
        </p>
      </div>

      <div className="scanner-action-grid">
        <button
          className="btn h-14 text-[0.95rem]"
          onClick={onStartCamera}
          disabled={isLoading || isScanning}
        >
          <Camera size={20} />
          Câmera
        </button>

        <label
          className={`btn h-14 text-[0.95rem] bg-[var(--primary)] border-[var(--primary)] cursor-pointer ${isLoading || isScanning ? "opacity-70" : "opacity-100"}`}
        >
          <Aperture size={20} />
          Foto
          <input
            type="file"
            accept="image/*"
            capture="environment"
            onChange={onFileUpload}
            disabled={isLoading || isScanning}
            className="hidden"
          />
        </label>

        <label
          className={`btn btn-success h-14 text-[0.95rem] cursor-pointer ${isLoading || isScanning ? "opacity-70" : "opacity-100"}`}
        >
          <ImageIcon size={20} />
          Galeria
          <input
            type="file"
            accept="image/*"
            onChange={onFileUpload}
            disabled={isLoading || isScanning}
            className="hidden"
          />
        </label>
      </div>

      <div className="mb-3">
        {!pasteMode ? (
          <button
            className="btn w-full h-[52px] text-[0.95rem] bg-blue-500/5 border border-blue-500/20 text-[var(--primary)]"
            onClick={() => setPasteMode(true)}
            disabled={isLoading || isScanning}
          >
            <LinkIcon size={18} />
            Colar Link da Nota
          </button>
        ) : (
          <div className="glass-card p-3 bg-slate-900/40 mb-0">
            <div className="scanner-link-row">
              <input
                type="text"
                className="search-input"
                placeholder="URL da NFC-e..."
                value={pastedUrl}
                onChange={(e) => setPastedUrl(e.target.value)}
                autoFocus
                className="search-input text-sm"
              />
              <button className="btn btn-success px-3" onClick={onLinkSubmit}>
                <Plus size={20} />
              </button>
              <button
                className="btn px-3 bg-red-500/10 border-none text-red-400 hover:bg-red-500/20"
                onClick={() => setPasteMode(false)}
              >
                <X size={20} />
              </button>
            </div>
          </div>
        )}
      </div>

      <button
        className="btn w-full h-[52px] text-[0.95rem] bg-transparent border border-[var(--card-border)] text-slate-500"
        onClick={onManualMode}
        disabled={isLoading || isScanning}
      >
        <Edit3 size={18} />
        Digitar Manualmente
      </button>

      {error && (
        <div className="mt-6 p-4 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-sm">
          {error}
        </div>
      )}
    </div>
  );
}
