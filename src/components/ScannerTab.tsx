import { useState, useCallback } from "react";
import {
  Scan,
  Camera,
  Image as ImageIcon,
  Edit3,
  ShoppingCart,
  Save,
  Plus,
  X,
  Link as LinkIcon,
  ZoomIn,
  ZoomOut,
  Zap,
  ZapOff,
  Aperture,
} from "lucide-react";
import { toast } from "react-hot-toast";
import { parseBRL, formatBRL } from "../utils/currency";
import type { Receipt, ReceiptItem } from "../types/domain";

type SaveReceiptResponse =
  | { duplicate: true; existingReceipt: Receipt }
  | { success: true; receipt: Receipt }
  | { success: false; error: unknown };
import { useReceiptScanner } from "../hooks/useReceiptScanner";
import { useReceiptsStore } from "../stores/useReceiptsStore";
import { useUiStore } from "../stores/useUiStore";
import { useSaveReceipt } from "../hooks/queries/useReceiptsQuery";

// Skeleton para loading durante extração
const ScannerSkeleton = () => (
  <div className="glass-card" style={{ padding: "2rem" }}>
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: "1rem",
        marginBottom: "1.5rem",
      }}
    >
      <div
        className="skeleton-line"
        style={{ width: "60px", height: "60px", borderRadius: "50%" }}
      />
      <div style={{ flex: 1 }}>
        <div
          className="skeleton-line"
          style={{ width: "200px", height: "24px", marginBottom: "8px" }}
        />
        <div
          className="skeleton-line"
          style={{ width: "120px", height: "18px" }}
        />
      </div>
    </div>
    <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
      {[...Array(5)].map((_, i) => (
        <div key={i} className="skeleton-item">
          <div
            className="skeleton-line"
            style={{ width: "70%", height: "16px", marginBottom: "6px" }}
          />
          <div
            className="skeleton-line"
            style={{ width: "50%", height: "14px" }}
          />
        </div>
      ))}
    </div>
  </div>
);

function ScannerTab() {
  const saveReceiptMutation = useSaveReceipt();
  const sessionUserId = useReceiptsStore((state) => state.sessionUserId);
  const tab = useUiStore((state) => state.tab);

  // Wrapper para adaptar a interface da mutation do React Query
  const saveReceipt = useCallback(
    async (receipt: Receipt, forceReplace?: boolean): Promise<SaveReceiptResponse> => {
      const result = await saveReceiptMutation.mutateAsync({
        receipt,
        sessionUserId,
        forceReplace,
      });
      // Garantir que o tipo de retorno seja compatível com SaveReceiptResponse
      if ('duplicate' in result && result.duplicate) {
        return { duplicate: true, existingReceipt: result.existingReceipt } as SaveReceiptResponse;
      }
      if ('success' in result && result.success) {
        return { success: true, receipt: result.receipt } as SaveReceiptResponse;
      }
      return { success: false, error: 'Unknown error' } as SaveReceiptResponse;
    },
    [saveReceiptMutation, sessionUserId],
  );
  const {
    manualMode,
    setManualMode,
    manualData,
    setManualData,
    manualItem,
    setManualItem,
    handleSaveManualReceipt,
    startCamera,
    stopCamera,
    handleFileUpload,
    loading,
    scanning,
    error,
    currentReceipt,
    setCurrentReceipt,
    handleUrlSubmit,
    zoom,
    zoomSupported,
    applyZoom,
    torch,
    torchSupported,
    applyTorch,
    duplicateReceipt,
    setDuplicateReceipt,
    handleForceSaveDuplicate,
  } = useReceiptScanner({ saveReceipt, tab });

  const [pasteMode, setPasteMode] = useState(false);
  const [pastedUrl, setPastedUrl] = useState("");

  const handleLinkSubmit = () => {
    const rawUrl = pastedUrl.trim();
    if (!rawUrl) {
      toast.error("Cole um link válido");
      return;
    }

    try {
      const parsed = new URL(rawUrl);
      if (!["http:", "https:"].includes(parsed.protocol)) {
        toast.error("Link inválido para NFC-e");
        return;
      }
    } catch {
      toast.error("Link inválido");
      return;
    }

    handleUrlSubmit(rawUrl);
    setPastedUrl("");
    setPasteMode(false);
  };
  const handleAddManualItem = () => {
    if (!manualItem.name?.trim() || !manualItem.unitPrice) {
      toast.error("Preencha nome e preço do item");
      return;
    }

    // Validar preço
    const priceNum = parseBRL(manualItem.unitPrice);
    if (isNaN(priceNum) || priceNum < 0) {
      toast.error("Preço inválido! Use apenas números");
      return;
    }

    const qtyNum = parseBRL(manualItem.qty) || 1;
    const totalNum = priceNum * qtyNum;

    const newItem = {
      name: manualItem.name.trim(),
      qty: qtyNum,
      unitPrice: formatBRL(priceNum),
      total: formatBRL(totalNum),
    };

    setManualData((prev) => ({ ...prev, items: [newItem, ...prev.items] }));
    setManualItem({ name: "", qty: "1", unitPrice: "" });
    toast.success("Item adicionado!");
  };

  if (manualMode) {
    return (
      <div className="glass-card">
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: "1.5rem",
            borderBottom: "1px solid var(--card-border)",
            paddingBottom: "1rem",
          }}
        >
          <h2
            style={{
              color: "#fff",
              display: "flex",
              alignItems: "center",
              gap: "0.6rem",
              fontSize: "1.4rem",
            }}
          >
            <Edit3 color="var(--primary)" size={24} />
            Cadastro Manual
          </h2>
          <button
            onClick={() => setManualMode(false)}
            style={{
              background: "rgba(255,255,255,0.05)",
              border: "none",
              color: "#94a3b8",
              cursor: "pointer",
              borderRadius: "50%",
              width: "36px",
              height: "36px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <X size={20} />
          </button>
        </div>

        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: "0.75rem",
            marginBottom: "1.5rem",
          }}
        >
          <input
            type="text"
            className="search-input"
            placeholder="Nome do Mercado"
            value={manualData.establishment}
            onChange={(e) =>
              setManualData({ ...manualData, establishment: e.target.value })
            }
          />
          <input
            type="text"
            className="search-input"
            placeholder="Data (DD/MM/AAAA)"
            value={manualData.date}
            onChange={(e) =>
              setManualData({ ...manualData, date: e.target.value })
            }
          />
        </div>

        <div
          style={{
            background: "rgba(15,23,42,0.4)",
            padding: "1.25rem",
            borderRadius: "1rem",
            marginBottom: "1.5rem",
            border: "1px solid var(--card-border)",
          }}
        >
          <h3
            style={{
              color: "#e2e8f0",
              marginBottom: "1rem",
              fontSize: "0.9rem",
              fontWeight: 600,
            }}
          >
            ADICIONAR ITEM
          </h3>
          <div
            style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}
          >
            <input
              type="text"
              className="search-input"
              style={{ background: "var(--bg-color)" }}
              placeholder="Nome do Produto"
              value={manualItem.name}
              onChange={(e) =>
                setManualItem({ ...manualItem, name: e.target.value })
              }
            />
            <div style={{ display: "flex", gap: "0.75rem" }}>
              <input
                type="number"
                className="search-input"
                style={{ width: "85px", background: "var(--bg-color)" }}
                placeholder="Qtd"
                value={manualItem.qty}
                onChange={(e) =>
                  setManualItem({ ...manualItem, qty: e.target.value })
                }
              />
              <input
                type="text"
                className="search-input"
                style={{ flex: 1, background: "var(--bg-color)" }}
                placeholder="Valor (ex: 5,90)"
                value={manualItem.unitPrice}
                onChange={(e) =>
                  setManualItem({ ...manualItem, unitPrice: e.target.value })
                }
              />
              <button
                className="btn"
                style={{ padding: "0 1.25rem" }}
                onClick={handleAddManualItem}
              >
                <Plus size={20} />
              </button>
            </div>
          </div>
        </div>

        {manualData.items.length > 0 && (
          <div
            className="items-list"
            style={{
              marginBottom: "1.5rem",
              maxHeight: "300px",
              overflowY: "auto",
            }}
          >
            {manualData.items.map((it: ReceiptItem, idx: number) => (
              <div
                key={idx}
                className="item-row"
                style={{
                  padding: "0.8rem",
                  background: "rgba(255,255,255,0.03)",
                }}
              >
                <div className="item-details">
                  <span className="item-name" style={{ fontSize: "0.95rem" }}>
                    {it.name}
                  </span>
                  <span className="item-meta">
                    {it.qty} x R$ {it.unitPrice}
                  </span>
                </div>
                <div className="item-total" style={{ fontSize: "1.1rem" }}>
                  R$ {it.total}
                </div>
              </div>
            ))}
          </div>
        )}

        <button
          className="btn btn-success"
          style={{ width: "100%", padding: "1.1rem", fontSize: "1.1rem" }}
          onClick={handleSaveManualReceipt}
          disabled={manualData.items.length === 0}
        >
          <Save size={20} />
          Finalizar e Salvar
        </button>

        {manualData.items.length > 0 && (
          <div style={{ marginTop: "1rem", textAlign: "center" }}>
            <p style={{ color: "#94a3b8", fontSize: "0.85rem" }}>
              Total: R${" "}
              {formatBRL(
                manualData.items.reduce(
                  (acc: number, curr: ReceiptItem) => acc + parseBRL(curr.total),
                  0,
                ),
              )}
            </p>
          </div>
        )}
      </div>
    );
  }

  return (
    <>
      {!loading && !currentReceipt && (
        <div
          className="glass-card"
          style={{ textAlign: "center", padding: "2.5rem 1.5rem" }}
        >
          <div style={{ marginBottom: "2rem" }}>
            <div
              className="pulse-container"
              style={{
                margin: "0 auto",
                width: "80px",
                height: "80px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                background: "rgba(59, 130, 246, 0.1)",
                borderRadius: "50%",
              }}
            >
              <Scan size={40} color="var(--primary)" />
            </div>
            <h2
              style={{
                marginTop: "1.25rem",
                color: "#f8fafc",
                fontSize: "1.4rem",
                fontWeight: 700
              }}
            >
              Escanear Nota Fiscal
            </h2>
            <p
              style={{
                marginTop: "0.5rem",
                color: "#94a3b8",
                lineHeight: "1.5",
                fontSize: "0.95rem"
              }}
            >
              Aponte a câmera para o QR Code ou faça upload da galeria.
            </p>
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr 1fr",
              gap: "0.75rem",
              marginBottom: "0.75rem",
            }}
          >
            <button
              className="btn"
              style={{ height: "56px", fontSize: "0.95rem" }}
              onClick={startCamera}
              disabled={loading || scanning}
            >
              <Camera size={20} />Câmera</button>

            <label
              className="btn"
              style={{
                height: "56px",
                fontSize: "0.95rem",
                opacity: loading || scanning ? 0.7 : 1,
                cursor: "pointer",
                background: "var(--primary)",
                borderColor: "var(--primary)",
              }}
            >
              <Aperture size={20} />
              Foto
              <input
                type="file"
                accept="image/*"
                capture="environment"
                onChange={handleFileUpload}
                disabled={loading || scanning}
                style={{ display: "none" }}
              />
            </label>

            <label
              className="btn btn-success"
              style={{
                height: "56px",
                fontSize: "0.95rem",
                opacity: loading || scanning ? 0.7 : 1,
                cursor: "pointer",
              }}
            >
              <ImageIcon size={20} />
              Galeria
              <input
                type="file"
                accept="image/*"
                onChange={handleFileUpload}
                disabled={loading || scanning}
                style={{ display: "none" }}
              />
            </label>
          </div>

          <div style={{ marginBottom: "0.75rem" }}>
            {!pasteMode ? (
              <button
                className="btn"
                style={{
                  width: "100%",
                  height: "52px",
                  background: "rgba(59, 130, 246, 0.05)",
                  border: "1px solid rgba(59, 130, 246, 0.2)",
                  color: "var(--primary)",
                  fontSize: "0.95rem"
                }}
                onClick={() => setPasteMode(true)}
                disabled={loading || scanning}
              >
                <LinkIcon size={18} />
                Colar Link da Nota
              </button>
            ) : (
              <div className="glass-card" style={{ padding: "0.75rem", background: "rgba(15, 23, 42, 0.4)", marginBottom: "0" }}>
                <div style={{ display: "flex", gap: "0.5rem" }}>
                  <input
                    type="text"
                    className="search-input"
                    placeholder="URL da NFC-e..."
                    value={pastedUrl}
                    onChange={(e) => setPastedUrl(e.target.value)}
                    autoFocus
                    style={{ fontSize: "0.9rem" }}
                  />
                  <button className="btn btn-success" onClick={handleLinkSubmit} style={{ padding: "0 0.75rem" }}>
                    <Plus size={20} />
                  </button>
                  <button className="btn" onClick={() => setPasteMode(false)} style={{ padding: "0 0.75rem", background: "rgba(239, 68, 68, 0.1)", border: "none", color: "#f87171" }}>
                    <X size={20} />
                  </button>
                </div>
              </div>
            )}
          </div>

          <button
            className="btn"
            style={{
              backgroundColor: "transparent",
              border: "1px solid var(--card-border)",
              color: "#64748b",
              width: "100%",
              height: "52px",
              fontSize: "0.95rem"
            }}
            onClick={() => setManualMode(true)}
            disabled={loading || scanning}
          >
            <Edit3 size={18} />
            Digitar Manualmente
          </button>

          {error && (
            <div
              style={{
                marginTop: "1.5rem",
                padding: "1rem",
                background: "rgba(239, 68, 68, 0.1)",
                border: "1px solid rgba(239, 68, 68, 0.2)",
                borderRadius: "0.75rem",
                color: "#f87171",
                fontSize: "0.9rem",
              }}
            >
              {error}
            </div>
          )}
        </div>
      )}

      {scanning && (
        <div style={{ marginBottom: "1rem" }}>
          <button
            className="btn"
            style={{
              width: "100%",
              background: "rgba(239, 68, 68, 0.2)",
              border: "1px solid rgba(239, 68, 68, 0.3)",
              color: "#f87171",
            }}
            onClick={stopCamera}
          >
            <X size={20} />
            Cancelar Escaneamento
          </button>
        </div>
      )}

      <div
        className="scanner-container"
        style={{
          display: scanning ? "block" : "none",
          background: "#000",
          borderRadius: "1rem",
          overflow: "hidden",
          border: "2px solid var(--primary)",
          width: "100%",
          maxWidth: "500px",
          margin: "0 auto",
          position: "relative"
        }}
      >
        <video
          id="reader-video"
          autoPlay
          muted
          playsInline
          style={{
            width: "100%",
            height: "auto",
            display: "block",
            objectFit: "cover",
            minHeight: "300px",
          }}
        />
        <div style={{
          position: "absolute",
          top: "50%",
          left: "50%",
          transform: "translate(-50%, -50%)",
          width: "220px",
          height: "220px",
          border: "2px solid var(--success)",
          borderRadius: "1rem",
          boxShadow: "0 0 0 4000px rgba(15, 23, 42, 0.7)",
          pointerEvents: "none"
        }}>
          <div style={{ position: "absolute", top: -35, width: "100%", textAlign: "center", color: "#fff", fontSize: "0.85rem", fontWeight: "bold" }}>
            Alinhe o QR Code
          </div>
          <div style={{ position: "absolute", bottom: -35, width: "100%", textAlign: "center", color: "#94a3b8", fontSize: "0.75rem" }}>
            Dica: Afaste um pouco e use o Zoom se for pequeno
          </div>
        </div>

        <div style={{
          position: "absolute",
          bottom: "1.25rem",
          right: "1.25rem",
          display: "flex",
          flexDirection: "column",
          gap: "0.75rem",
          zIndex: 10
        }}>
          {torchSupported && (
            <button
              onClick={() => applyTorch(!torch)}
              style={{
                width: "52px",
                height: "52px",
                borderRadius: "50%",
                background: torch ? "var(--primary)" : "rgba(15, 23, 42, 0.9)",
                border: "2px solid var(--primary)",
                color: "white",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                cursor: "pointer",
                boxShadow: "0 8px 32px rgba(0,0,0,0.6)"
              }}
            >
              {torch ? <ZapOff size={24} /> : <Zap size={24} />}
            </button>
          )}

          {zoomSupported && (
            <button
              onClick={() => applyZoom(zoom === 1 ? 2.5 : 1)}
              style={{
                width: "52px",
                height: "52px",
                borderRadius: "50%",
                background: zoom > 1 ? "var(--primary)" : "rgba(15, 23, 42, 0.9)",
                border: "2px solid var(--primary)",
                color: "white",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                cursor: "pointer",
                boxShadow: "0 8px 32px rgba(0,0,0,0.6)"
              }}
            >
              {zoom === 1 ? <ZoomIn size={24} /> : <ZoomOut size={24} />}
            </button>
          )}
        </div>
      </div>

      {loading && (
        <>
          <ScannerSkeleton />
          <p
            style={{
              textAlign: "center",
              color: "#94a3b8",
              marginTop: "1rem",
              fontSize: "0.9rem",
            }}
          >
            Extraindo dados da nota fiscal...
          </p>
        </>
      )}

      {currentReceipt && (
        <div className="glass-card">
          <div style={{ textAlign: "center", marginBottom: "2rem" }}>
            <div
              style={{
                width: "60px",
                height: "60px",
                borderRadius: "50%",
                background: "var(--success)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                margin: "0 auto 1rem",
              }}
            >
              <ShoppingCart color="white" size={30} />
            </div>
            <h2 style={{ color: "#fff" }}>Nota Salva!</h2>
            <p
              style={{
                color: "var(--success)",
                fontWeight: 600,
                fontSize: "1.1rem",
              }}
            >
              {currentReceipt.establishment}
            </p>
            <p style={{ color: "#94a3b8", fontSize: "0.85rem" }}>
              {currentReceipt.date}
            </p>
          </div>

          <div
            className="items-list"
            style={{
              maxHeight: "250px",
              overflowY: "auto",
              marginBottom: "1.5rem",
            }}
          >
            {currentReceipt.items.map((item: ReceiptItem, idx: number) => (
              <div
                key={idx}
                className="item-row"
                style={{ background: "rgba(255,255,255,0.02)" }}
              >
                <div className="item-details">
                  <span className="item-name" style={{ fontSize: "0.9rem" }}>
                    {item.normalized_name || item.name}
                  </span>
                  <div
                    style={{
                      display: "flex",
                      gap: "8px",
                      alignItems: "center",
                      marginTop: "2px",
                    }}
                  >
                    <span className="item-meta">
                      R$ {item.unitPrice ?? formatBRL(item.price)} un x {item.qty ?? item.quantity}
                    </span>
                    {item.category && (
                      <span
                        style={{
                          fontSize: "0.6rem",
                          background: "rgba(59, 130, 246, 0.1)",
                          padding: "1px 5px",
                          borderRadius: "4px",
                          color: "var(--primary)",
                        }}
                      >
                        {item.category}
                      </span>
                    )}
                  </div>
                </div>
                <div className="item-total" style={{ fontSize: "1rem" }}>
                  R$ {item.total ?? formatBRL(parseBRL(item.price) * parseBRL(item.quantity || 1))}
                </div>
              </div>
            ))}
          </div>

          <div
            className="total-summary"
            style={{ fontSize: "1.25rem", marginBottom: "2rem" }}
          >
            <span style={{ color: "#94a3b8", fontWeight: 500 }}>Total</span>
            <span style={{ color: "var(--success)" }}>
              R${" "}
              {formatBRL(
                currentReceipt.items.reduce(
                  (acc: number, curr: ReceiptItem) => {
                    if (curr.total != null) return acc + parseBRL(curr.total);
                    return acc + parseBRL(curr.price) * parseBRL(curr.quantity || 1);
                  },
                  0,
                ),
              )}
            </span>
          </div>

          <button
            className="btn btn-success"
            style={{ width: "100%", padding: "1rem" }}
            onClick={() => setCurrentReceipt(null)}
          >
            <Plus size={20} />
            Registrar Nova Nota
          </button>
        </div>
      )}

      {duplicateReceipt && (
        <div className="duplicate-modal-overlay" style={{ zIndex: 3000 }}>
          <div className="glass-card duplicate-modal-card">
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "12px",
                marginBottom: "1.5rem",
              }}
            >
              <div
                style={{
                  width: "48px",
                  height: "48px",
                  borderRadius: "50%",
                  background: "rgba(245, 158, 11, 0.1)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <span style={{ fontSize: "24px" }}>⚠️</span>
              </div>
              <h2 style={{ color: "#fff", fontSize: "1.25rem" }}>
                Nota Já Existente
              </h2>
            </div>

            <p
              style={{
                color: "#94a3b8",
                fontSize: "0.95rem",
                marginBottom: "1.5rem",
                lineHeight: "1.6",
              }}
            >
              Esta nota fiscal já está no seu histórico desde{" "}
              <strong style={{ color: "#fbbf24" }}>
                {duplicateReceipt.date}
              </strong>
              .
            </p>

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: "12px",
              }}
            >
              <button
                className="btn"
                onClick={() => setDuplicateReceipt(null)}
                style={{
                  background: "rgba(255,255,255,0.05)",
                  border: "1px solid var(--card-border)",
                }}
              >
                Cancelar
              </button>
              <button
                className="btn btn-success"
                onClick={handleForceSaveDuplicate}
              >
                Atualizar Nota
              </button>
            </div>

            <p
              style={{
                color: "#64748b",
                fontSize: "0.8rem",
                marginTop: "1rem",
                textAlign: "center",
              }}
            >
              Isso substituirá a nota anterior
            </p>
          </div>
        </div>
      )}
    </>
  );
}

export default ScannerTab;
