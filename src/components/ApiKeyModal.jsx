import { useState, useEffect } from "react";
import { Key, ShieldCheck, X, Save, CheckCircle, AlertCircle } from "lucide-react";
import PropTypes from "prop-types";
import { toast } from "react-hot-toast";
import { detectProvider, getApiModel, setApiModel } from "../utils/aiConfig";
import { testAiConnection } from "../utils/aiClient";

export default function ApiKeyModal({ isOpen, onClose, currentKey, onSave }) {
  const [key, setKey] = useState(currentKey || "");
  const [selectedModel, setSelectedModel] = useState(() => getApiModel());
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState(null); // 'success' | 'error' | null

  useEffect(() => {
    setKey(currentKey || "");
    setSelectedModel(getApiModel());
  }, [currentKey, isOpen]);

  if (!isOpen) return null;

  const provider = detectProvider(key);
  
  const models = provider === "Google AI Studio" 
    ? ["gemini-2.5-flash", "gemini-2.5-flash-lite"]
    : ["gpt-3.5-turbo", "gpt-4o-mini", "gpt-4o"];

  const handleSave = () => {
    if (!key || !key.trim()) {
      toast.error("Por favor, informe a API Key");
      return;
    }
    setApiModel(selectedModel);
    onSave(key.trim());
    toast.success("Configurações de IA salvas!");
    onClose();
  };

  const handleTest = async () => {
    if (!key.trim()) {
      toast.error("Insira uma chave para testar");
      return;
    }
    setTesting(true);
    setTestResult(null);
    try {
      const ok = await testAiConnection(key.trim(), selectedModel);
      setTestResult(ok ? "success" : "error");
      if (ok) toast.success("Conexão estabelecida com sucesso!");
      else toast.error("Falha na conexão. Verifique a chave e o modelo.");
    } catch {
      setTestResult("error");
      toast.error("Erro ao testar conexão.");
    } finally {
      setTesting(false);
    }
  };

  return (
    <div className="duplicate-modal-overlay" style={{ zIndex: 5000 }}>
      <div className="glass-card duplicate-modal-card" style={{ maxWidth: "450px", border: "1px solid var(--primary)" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.5rem" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <Key className="text-primary" size={24} color="var(--primary)" />
            <h2 style={{ color: "#fff", fontSize: "1.25rem", margin: 0 }}>
              {currentKey ? "🔑 API Key configurada" : "Configurar IA"}
            </h2>
          </div>
          <button 
            onClick={onClose} 
            style={{ background: "transparent", border: "none", color: "#94a3b8", cursor: "pointer" }}
          >
            <X size={20} />
          </button>
        </div>

        <div style={{ marginBottom: "1.5rem", background: "rgba(15, 23, 42, 0.4)", padding: "1rem", borderRadius: "12px", border: "1px solid rgba(255,255,255,0.05)" }}>
           <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "8px" }}>
              <span style={{ fontSize: "0.75rem", color: "#64748b" }}>Provedor detectado:</span>
              <span style={{ fontSize: "0.75rem", color: "var(--primary)", fontWeight: "bold" }}>{provider}</span>
           </div>
           
           <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
              <label style={{ fontSize: "0.75rem", color: "#64748b" }}>Modelo:</label>
              <select 
                className="search-input" 
                style={{ width: "100%", background: "var(--bg-color)", border: "1px solid var(--card-border)" }}
                value={selectedModel}
                onChange={(e) => setSelectedModel(e.target.value)}
              >
                {models.map(m => <option key={m} value={m}>{m}</option>)}
              </select>
           </div>
        </div>

        <div style={{ marginBottom: "1.5rem" }}>
          <label style={{ display: "block", fontSize: "0.8rem", color: "#64748b", marginBottom: "0.5rem", fontWeight: "bold" }}>
            API KEY
          </label>
          <div style={{ position: "relative" }}>
            <input
              type="password"
              className="search-input"
              style={{ paddingLeft: "3rem", background: "rgba(15, 23, 42, 0.4)" }}
              placeholder={provider === "Google AI Studio" ? "AIza..." : "sk-..."}
              value={key}
              onChange={(e) => {
                setKey(e.target.value);
                setTestResult(null);
              }}
            />
            <ShieldCheck size={18} style={{ position: "absolute", left: "1rem", top: "50%", transform: "translateY(-50%)", color: "#64748b" }} />
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
          <button 
            className="btn" 
            onClick={handleTest} 
            disabled={testing}
            style={{ 
              background: testResult === "success" ? "rgba(16, 185, 129, 0.1)" : "rgba(255,255,255,0.05)",
              border: testResult === "success" ? "1px solid var(--success)" : "1px solid var(--card-border)",
              color: testResult === "success" ? "var(--success)" : "#fff"
            }}
          >
            {testing ? "Testando..." : testResult === "success" ? <><CheckCircle size={18} /> Conexão OK</> : testResult === "error" ? <><AlertCircle size={18} /> Erro na conexão</> : "Testar conexão"}
          </button>
          
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
            <button className="btn" onClick={onClose} style={{ background: "transparent", border: "1px solid rgba(255,255,255,0.05)" }}>
              Cancelar
            </button>
            <button className="btn btn-success" onClick={handleSave}>
              <Save size={18} />
              Salvar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

ApiKeyModal.propTypes = {
  isOpen: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  currentKey: PropTypes.string,
  onSave: PropTypes.func.isRequired,
};
