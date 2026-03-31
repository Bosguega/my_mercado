import { useState } from "react";
import {
  Settings,
  Trash2,
  Cpu,
  LogOut,
  Database,
  BookOpen,
  Package,
  ChevronRight,
  Wifi,
  // WifiOff
} from "lucide-react";
import { toast } from "react-hot-toast";
import { logout } from "../services/auth";
import {
  clearReceiptsAndItemsFromDB,
  clearDictionaryInDB,
  clearCanonicalProductsInDB
} from "../services";
import { useScannerStore } from "../stores/useScannerStore";
import { testSupabaseConnection } from "../utils/supabaseTest";
// import { useUiStore } from "../stores/useUiStore";
import ConfirmDialog from "./ConfirmDialog";
import DictionaryTab from "./DictionaryTab";
import CanonicalProductsTab from "./CanonicalProductsTab";
import type { ConfirmDialogConfig } from "../types/ui";

interface SettingsTabProps {
  onOpenAiConfig: () => void;
}

export default function SettingsTab({ onOpenAiConfig }: SettingsTabProps) {
  const [confirmDialog, setConfirmDialog] = useState<ConfirmDialogConfig | null>(null);
  const [loading, setLoading] = useState(false);
  const [activeSubTab, setActiveSubTab] = useState<'main' | 'dictionary' | 'products'>('main');
  const resetScannerState = useScannerStore((state) => state.resetScannerState);
  // const setTab = useUiStore((state) => state.setTab);

  const handleLogout = async () => {
    setConfirmDialog({
      title: "Encerrar sessão?",
      message: "Você precisará fazer login novamente para acessar seus dados.",
      confirmText: "Sair",
      danger: true,
      onConfirm: async () => {
        resetScannerState();
        await logout();
        toast.success("Sessão encerrada.");
      }
    });
  };

  const handleTestConnection = async () => {
    setLoading(true);
    try {
      const status = await testSupabaseConnection();
      
      if (status.configured && status.authenticated && status.databaseAccessible) {
        toast.success(`✅ Conexão OK!\nUsuário: ${status.email?.substring(0, 20)}...`);
      } else if (!status.configured) {
        toast.error('❌ Supabase não configurado\nVerifique as variáveis de ambiente');
      } else if (!status.authenticated) {
        toast('⚠️ Não autenticado\nFaça login para acessar seus dados', {
          icon: '⚠️',
          duration: 4000,
        });
      } else if (!status.databaseAccessible) {
        toast.error(`❌ Erro no banco de dados\n${status.error}`);
      }
    } catch (error) {
      console.error(error);
      toast.error("Erro ao testar conexão.");
    } finally {
      setLoading(false);
    }
  };

  const handleClearTable = (
    table: 'receipts' | 'dictionary' | 'canonical', 
    title: string, 
    message: string
  ) => {
    setConfirmDialog({
      title,
      message,
      confirmText: "Apagar Tudo",
      danger: true,
      onConfirm: async () => {
        setLoading(true);
        try {
          if (table === 'receipts') await clearReceiptsAndItemsFromDB();
          if (table === 'dictionary') await clearDictionaryInDB();
          if (table === 'canonical') await clearCanonicalProductsInDB();
          toast.success("Dados apagados com sucesso!");
        } catch (error) {
          console.error(error);
          toast.error("Erro ao apagar dados.");
        } finally {
          setLoading(false);
        }
      }
    });
  };

  const styles = {
    sectionHeading: {
      color: "#e2e8f0",
      fontSize: "0.85rem",
      fontWeight: 700,
      textTransform: "uppercase" as const,
      letterSpacing: "0.05em",
      marginBottom: "0.75rem",
      paddingLeft: "0.5rem"
    }
  };

  return (
    <div className="settings-container">
      {/* Header com navegação */}
      <div style={{ marginBottom: "2rem" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "1rem", marginBottom: "0.5rem" }}>
          <h2 className="section-title">
            <Settings size={22} color="var(--primary)" />
            {activeSubTab === 'main' && 'Configurações'}
            {activeSubTab === 'dictionary' && 'Dicionário'}
            {activeSubTab === 'products' && 'Produtos VIP'}
          </h2>
          {activeSubTab !== 'main' && (
            <button
              className="btn"
              onClick={() => setActiveSubTab('main')}
              style={{ padding: "0.5rem 1rem", fontSize: "0.85rem" }}
            >
              ← Voltar
            </button>
          )}
        </div>
        <p style={{ color: "#94a3b8", fontSize: "0.9rem", marginLeft: "2rem" }}>
          {activeSubTab === 'main' && 'Gerencie sua conta e dados do aplicativo.'}
          {activeSubTab === 'dictionary' && 'Personalize nomes e categorias de produtos.'}
          {activeSubTab === 'products' && 'Gerencie produtos canônicos e associações.'}
        </p>
      </div>

      {/* Sub-abas */}
      {activeSubTab === 'main' ? (
        <>
          {/* Conta e IA */}
          <section style={{ marginBottom: "2rem" }}>
            <h3 style={styles.sectionHeading}>Geral</h3>
            <div className="glass-card" style={{ padding: "0.5rem" }}>
              <button className="settings-item-btn" onClick={handleTestConnection}>
                <div className="settings-item-icon" style={{ background: "rgba(16, 185, 129, 0.1)", color: "#10b981" }}>
                  <Wifi size={20} />
                </div>
                <div style={{ flex: 1, textAlign: "left" }}>
                  <div style={{ fontWeight: 600, color: "#f8fafc" }}>Testar Conexão</div>
                  <div style={{ fontSize: "0.8rem", color: "#94a3b8" }}>Verificar conexão com Supabase</div>
                </div>
                {loading && <div style={{ fontSize: "0.75rem", color: "#94a3b8" }}>Testando...</div>}
              </button>

              <div style={{ height: "1px", background: "rgba(255,255,255,0.05)", margin: "0 1rem" }} />

              <button className="settings-item-btn" onClick={onOpenAiConfig}>
                <div className="settings-item-icon" style={{ background: "rgba(59, 130, 246, 0.1)", color: "var(--primary)" }}>
                  <Cpu size={20} />
                </div>
                <div style={{ flex: 1, textAlign: "left" }}>
                  <div style={{ fontWeight: 600, color: "#f8fafc" }}>Configurar Inteligência Artificial</div>
                  <div style={{ fontSize: "0.8rem", color: "#94a3b8" }}>Chave de API e modelos Gemini</div>
                </div>
              </button>

              <div style={{ height: "1px", background: "rgba(255,255,255,0.05)", margin: "0 1rem" }} />

              <button className="settings-item-btn" onClick={handleLogout}>
                <div className="settings-item-icon" style={{ background: "rgba(239, 68, 68, 0.1)", color: "#ef4444" }}>
                  <LogOut size={20} />
                </div>
                <div style={{ flex: 1, textAlign: "left" }}>
                  <div style={{ fontWeight: 600, color: "#f8fafc" }}>Sair da Conta</div>
                  <div style={{ fontSize: "0.8rem", color: "#94a3b8" }}>Encerrar sessão no dispositivo</div>
                </div>
              </button>
            </div>
          </section>

          {/* Ferramentas */}
          <section style={{ marginBottom: "2rem" }}>
            <h3 style={styles.sectionHeading}>Ferramentas</h3>
            <div className="glass-card" style={{ padding: "0.5rem" }}>
              <button 
                className="settings-item-btn"
                onClick={() => setActiveSubTab('dictionary')}
              >
                <div className="settings-item-icon" style={{ background: "rgba(34, 197, 94, 0.1)", color: "#22c55e" }}>
                  <BookOpen size={20} />
                </div>
                <div style={{ flex: 1, textAlign: "left" }}>
                  <div style={{ fontWeight: 600, color: "#f8fafc" }}>Dicionário de Produtos</div>
                  <div style={{ fontSize: "0.8rem", color: "#94a3b8" }}>Personalize nomes e categorias</div>
                </div>
                <ChevronRight size={18} color="#64748b" />
              </button>

              <div style={{ height: "1px", background: "rgba(255,255,255,0.05)", margin: "0 1rem" }} />

              <button 
                className="settings-item-btn"
                onClick={() => setActiveSubTab('products')}
              >
                <div className="settings-item-icon" style={{ background: "rgba(168, 85, 247, 0.1)", color: "#a855f7" }}>
                  <Package size={20} />
                </div>
                <div style={{ flex: 1, textAlign: "left" }}>
                  <div style={{ fontWeight: 600, color: "#f8fafc" }}>Produtos VIP</div>
                  <div style={{ fontSize: "0.8rem", color: "#94a3b8" }}>Gerencie produtos canônicos</div>
                </div>
                <ChevronRight size={18} color="#64748b" />
              </button>
            </div>
          </section>

          {/* Limpeza de Dados */}
          <section style={{ marginBottom: "2rem" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "1rem" }}>
              <h3 style={{ ...styles.sectionHeading, marginBottom: 0 }}>Gerenciamento de Dados</h3>
              <div style={{ background: "rgba(245, 158, 11, 0.1)", color: "#f59e0b", fontSize: "0.65rem", padding: "2px 6px", borderRadius: "4px", fontWeight: 700 }}>
                CUIDADO
              </div>
            </div>

            <div className="glass-card" style={{ padding: "0.5rem" }}>
              <button 
                className="settings-item-btn"
                onClick={() => handleClearTable(
                  'receipts', 
                  "Apagar todas as notas?", 
                  "Isso removerápermanentemente todas as notas fiscais e itens escaneados do seu histórico."
                )}
              >
                <div className="settings-item-icon" style={{ background: "rgba(239, 68, 68, 0.1)", color: "#ef4444" }}>
                  <Database size={20} />
                </div>
                <div style={{ flex: 1, textAlign: "left" }}>
                  <div style={{ fontWeight: 600, color: "#f8fafc" }}>Limpar Histórico de Notas</div>
                  <div style={{ fontSize: "0.8rem", color: "#94a3b8" }}>Remove todas as compras e recibos</div>
                </div>
                <Trash2 size={18} color="#64748b" />
              </button>

              <div style={{ height: "1px", background: "rgba(255,255,255,0.05)", margin: "0 1rem" }} />

              <button 
                className="settings-item-btn"
                onClick={() => handleClearTable(
                  'dictionary', 
                  "Limpar Dicionário?", 
                  "O app esquecerá os nomes personalizados que você deu aos produtos. Ele terá que 'reaprender' ao escanear novas notas."
                )}
              >
                <div className="settings-item-icon" style={{ background: "rgba(239, 68, 68, 0.1)", color: "#ef4444" }}>
                  <BookOpen size={20} />
                </div>
                <div style={{ flex: 1, textAlign: "left" }}>
                  <div style={{ fontWeight: 600, color: "#f8fafc" }}>Limpar Dicionário Inteligente</div>
                  <div style={{ fontSize: "0.8rem", color: "#94a3b8" }}>Reseta o aprendizado de nomes de produtos</div>
                </div>
                <Trash2 size={18} color="#64748b" />
              </button>

              <div style={{ height: "1px", background: "rgba(255,255,255,0.05)", margin: "0 1rem" }} />

              <button 
                className="settings-item-btn"
                onClick={() => handleClearTable(
                  'canonical', 
                  "Limpar VIPs?", 
                  "Isso apagará todos os seus Produtos Canônicos (VIPs). Os itens escaneados perderão o vínculo com esses produtos."
                )}
              >
                <div className="settings-item-icon" style={{ background: "rgba(239, 68, 68, 0.1)", color: "#ef4444" }}>
                  <Package size={20} />
                </div>
                <div style={{ flex: 1, textAlign: "left" }}>
                  <div style={{ fontWeight: 600, color: "#f8fafc" }}>Limpar Produtos VIP (Canônicos)</div>
                  <div style={{ fontSize: "0.8rem", color: "#94a3b8" }}>Remove o agrupamento principal de produtos</div>
                </div>
                <Trash2 size={18} color="#64748b" />
              </button>
            </div>
          </section>

          <footer style={{ textAlign: "center", padding: "2rem 1rem", opacity: 0.5 }}>
            <p style={{ fontSize: "0.75rem", color: "#94a3b8" }}>My Mercado App &bull; Versão 1.2.0</p>
          </footer>
        </>
      ) : (
        <>
          {activeSubTab === 'dictionary' && <DictionaryTab />}
          {activeSubTab === 'products' && <CanonicalProductsTab />}
        </>
      )}

      <ConfirmDialog
        isOpen={Boolean(confirmDialog)}
        title={confirmDialog?.title || ""}
        message={confirmDialog?.message || ""}
        confirmText={confirmDialog?.confirmText}
        danger={confirmDialog?.danger}
        busy={loading}
        onCancel={() => setConfirmDialog(null)}
        onConfirm={async () => {
          if (confirmDialog?.onConfirm) {
            await confirmDialog.onConfirm();
            setConfirmDialog(null);
          }
        }}
      />
    </div>
  );
}
