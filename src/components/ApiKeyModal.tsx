import { useState, useEffect, useMemo } from "react";
import { Key, ShieldCheck, X, Save, CheckCircle, AlertCircle, Cpu, RefreshCw } from "lucide-react";
import PropTypes from "prop-types";
import { toast } from "react-hot-toast";
import { detectProvider, getApiModel, setApiModel } from "../utils/aiConfig";
import { testAiConnection } from "../utils/aiClient";
import type { ApiKeyModalProps } from "../types/ui";

export default function ApiKeyModal({ isOpen, onClose, currentKey, onSave }: ApiKeyModalProps) {
  const [key, setKey] = useState("");
  const [selectedModel, setSelectedModel] = useState("");
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<"success" | "error" | null>(null);
  const [fetchedModels, setFetchedModels] = useState<string[]>([]);
  const [fetchingModels, setFetchingModels] = useState(false);

  // Sincronizar estados quando o modal abre ou a chave muda
  useEffect(() => {
    if (isOpen) {
      setKey(currentKey || "");
      setSelectedModel(getApiModel() || "");
      setFetchedModels([]);
      setTestResult(null);
    }
  }, [currentKey, isOpen]);

  // Detectar provedor com base na chave atual (estado local)
  const provider = useMemo(() => detectProvider(key), [key]);
  
  // Gerar lista de modelos combinando hardcoded + buscados da API
  const models = useMemo(() => {
    const isGoogle = provider === "Google AI Studio";
    const hardcoded = isGoogle
      ? ["gemini-1.5-flash", "gemini-1.5-flash-lite", "gemini-1.5-pro", "gemini-1.0-pro"]
      : ["gpt-3.5-turbo", "gpt-4o-mini", "gpt-4o"];
    
    // Unificar listas e remover duplicatas
    const all = Array.from(new Set([...hardcoded, ...fetchedModels]));
    
    // Garantir que o modelo selecionado apareça na lista (caso seja um customizado salvo)
    if (selectedModel && !all.includes(selectedModel)) {
      all.push(selectedModel);
    }
    return all;
  }, [provider, fetchedModels, selectedModel]);

  const handleSave = () => {
    const trimmedKey = key.trim();
    if (!trimmedKey) {
      toast.error("Por favor, informe a API Key");
      return;
    }
    setApiModel(selectedModel);
    onSave(trimmedKey);
    toast.success("Configurações de IA salvas!");
    onClose();
  };

  const handleListModels = async () => {
    const trimmedKey = key.trim();
    if (!trimmedKey) {
      toast.error("Insira a chave para listar modelos");
      return;
    }
    
    if (provider !== "Google AI Studio") {
      toast.error("Listagem automática disponível apenas para Google AI Studio");
      return;
    }

    setFetchingModels(true);
    try {
      const url = `https://generativelanguage.googleapis.com/v1beta/models?key=${trimmedKey}`;
      const res = await fetch(url);
      
      if (!res.ok) {
        throw new Error(`Erro na API (${res.status})`);
      }

      const data = await res.json();
      if (data && data.models && Array.isArray(data.models)) {
        const names = data.models
          .map((m: any) => m.name.replace('models/', '')) // TODO: type
          .filter((name: string) => !name.includes('vision') && !name.includes('embedding'));
        
        setFetchedModels(names);
        toast.success(`${names.length} modelos encontrados!`);
      } else {
        toast.error("Nenhum modelo compatível encontrado");
      }
    } catch (err) {
      console.error("Erro ao listar modelos:", err);
      toast.error("Erro ao buscar modelos da conta. Verifique sua chave.");
    } finally {
      setFetchingModels(false);
    }
  };

  const handleTest = async () => {
    const trimmedKey = key.trim();
    if (!trimmedKey) {
      toast.error("Insira uma chave para testar");
      return;
    }
    setTesting(true);
    setTestResult(null);
    try {
      const ok = await testAiConnection(trimmedKey, selectedModel);
      setTestResult(ok ? "success" : "error");
      if (ok) toast.success("Conexão estabelecida com sucesso!");
      else toast.error("Falha na conexão. Verifique a chave e o modelo.");
    } catch (err) {
      console.error("Erro no teste de conexão:", err);
      setTestResult("error");
      toast.error("Erro ao testar conexão.");
    } finally {
      setTesting(false);
    }
  };

  if (!isOpen) return null;

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
           <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "12px" }}>
              <span style={{ fontSize: "0.75rem", color: "#64748b" }}>Provedor detectado:</span>
              <span style={{ fontSize: "0.75rem", color: "var(--primary)", fontWeight: "bold" }}>{provider}</span>
           </div>
           
           <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <label style={{ fontSize: "0.75rem", color: "#64748b" }}>Modelo:</label>
                {provider === "Google AI Studio" && (
                  <button
                    onClick={handleListModels}
                    disabled={fetchingModels || !key.trim()}
                    style={{
                      background: "none",
                      border: "none",
                      color: "var(--primary)",
                      fontSize: "0.7rem",
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      gap: "4px",
                      opacity: !key.trim() ? 0.5 : 1
                    }}
                  >
                    {fetchingModels ? <RefreshCw size={12} className="spin" /> : <Cpu size={12} />}
                    Buscar Modelos
                  </button>
                )}
              </div>
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
