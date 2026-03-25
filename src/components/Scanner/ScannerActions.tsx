import { Camera, Aperture, ImageIcon, Link as LinkIcon, Edit3, Plus, X } from "lucide-react";

interface ScannerActionsProps {
    onStartCamera: () => void;
    onFileUpload: (event: React.ChangeEvent<HTMLInputElement>) => void;
    onPasteLink: () => void;
    onManualMode: () => void;
    loading: boolean;
    scanning: boolean;
    pasteMode: boolean;
    pastedUrl: string;
    onPastedUrlChange: (url: string) => void;
    onSubmitLink: () => void;
    onCancelPaste: () => void;
}

export function ScannerActions({
    onStartCamera,
    onFileUpload,
    onPasteLink,
    onManualMode,
    loading,
    scanning,
    pasteMode,
    pastedUrl,
    onPastedUrlChange,
    onSubmitLink,
    onCancelPaste,
}: ScannerActionsProps) {
    return (
        <div className="glass-card" style={{ textAlign: "center", padding: "2.5rem 1.5rem" }}>
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
                    <Camera size={40} color="var(--primary)" />
                </div>
                <h2
                    style={{
                        marginTop: "1.25rem",
                        color: "#f8fafc",
                        fontSize: "1.4rem",
                        fontWeight: 700,
                    }}
                >
                    Escanear Nota Fiscal
                </h2>
                <p
                    style={{
                        marginTop: "0.5rem",
                        color: "#94a3b8",
                        lineHeight: "1.5",
                        fontSize: "0.95rem",
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
                    onClick={onStartCamera}
                    disabled={loading || scanning}
                >
                    <Camera size={20} />Câmera
                </button>

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
                        onChange={onFileUpload}
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
                        onChange={onFileUpload}
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
                            fontSize: "0.95rem",
                        }}
                        onClick={onPasteLink}
                        disabled={loading || scanning}
                    >
                        <LinkIcon size={18} />
                        Colar Link da Nota
                    </button>
                ) : (
                    <div
                        className="glass-card"
                        style={{
                            padding: "0.75rem",
                            background: "rgba(15, 23, 42, 0.4)",
                            marginBottom: "0",
                        }}
                    >
                        <div style={{ display: "flex", gap: "0.5rem" }}>
                            <input
                                type="text"
                                className="search-input"
                                placeholder="URL da NFC-e..."
                                value={pastedUrl}
                                onChange={(e) => onPastedUrlChange(e.target.value)}
                                autoFocus
                                style={{ fontSize: "0.9rem" }}
                            />
                            <button
                                className="btn btn-success"
                                onClick={onSubmitLink}
                                style={{ padding: "0 0.75rem" }}
                            >
                                <Plus size={20} />
                            </button>
                            <button
                                className="btn"
                                onClick={onCancelPaste}
                                style={{
                                    padding: "0 0.75rem",
                                    background: "rgba(239, 68, 68, 0.1)",
                                    border: "none",
                                    color: "#f87171",
                                }}
                            >
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
                    fontSize: "0.95rem",
                }}
                onClick={onManualMode}
                disabled={loading || scanning}
            >
                <Edit3 size={18} />
                Digitar Manualmente
            </button>
        </div>
    );
}