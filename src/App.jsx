import { useState, useEffect, useMemo, useRef } from "react";

const GOOGLE_SHEET_ID = "1ZoN4-FuZ4SFqaZBRBBxWKEP9dQXnp-sbi7OJ9GG1Bo4";
const SHEET_NAME = "CHECKING";
const API_KEY = import.meta.env.VITE_GOOGLE_API_KEY || "";

const MESES = ["Jan","Fev","Mar","Abr","Mai","Jun","Jul","Ago","Set","Out","Nov","Dez"];
const FORMATOS = [
  "CHECKING PRIVADO PAINEL - 1 PONTO",
  "CHECKING PRIVADO PAINEL - 2 PONTOS",
  "CHECKING PRIVADO PAINEL - 3 PONTOS",
  "CHECKING PRIVADO PAINEL - 5 PONTOS",
  "CHECKING PRIVADO PAINEL - 10 PONTOS",
  "CHECKING PRIVADO ELETROMIDIA - 2 PONTOS",
  "CHECKING PRIVADO TERMINAL - 3 PONTOS",
  "CHECKING COMPLETO SOLICITAÇÃO DO CLIENTE - 100% DAS TELAS",
  "CHECKING PÚBLICO",
];

const CACHE_KEY = "checking_cache";
const CACHE_EXPIRY = 5 * 60 * 1000; // 5 minutos

const hoje = () => new Date().toISOString().split("T")[0];
const fmtDate = (d) => { if(!d) return "—"; const [y,m,dd]=d.split("-"); return `${dd}/${m}/${y.slice(2)}`; };
const diasRestantes = (prazo) => prazo ? Math.ceil((new Date(prazo+"T00:00:00") - new Date(hoje()+"T00:00:00")) / 86400000) : null;

export default function App() {
  const [os, setOs] = useState([]);
  const [view, setView] = useState("dashboard");
  const [toast, setToast] = useState(null);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [lastSync, setLastSync] = useState(null);
  const [form, setForm] = useState({});
  const [editId, setEditId] = useState(null);
  const [dashMes, setDashMes] = useState(new Date().getMonth() + 1);
  const [dashAno, setDashAno] = useState(new Date().getFullYear());

  // Carregar dados do Google Sheets
  const fetchFromSheets = async () => {
    if (!API_KEY) {
      showToast("API key não configurada. Usando dados em cache.", "aviso");
      loadCache();
      return;
    }

    setLoading(true);
    setError(null);
    
    try {
      const url = `https://sheets.googleapis.com/v4/spreadsheets/${GOOGLE_SHEET_ID}/values/${SHEET_NAME}?key=${API_KEY}`;
      const response = await fetch(url);
      
      if (!response.ok) throw new Error("Erro ao conectar ao Google Sheets");
      
      const data = await response.json();
      const rows = data.values || [];
      
      if (rows.length < 2) {
        showToast("Nenhum dado na planilha", "aviso");
        return;
      }

      // Parse header (primeira linha)
      const headers = rows[0];
      const idIndex = headers.indexOf("ID CHECKING");
      const clienteIndex = headers.indexOf("CLIENTE");
      const pracaIndex = headers.indexOf("PRAÇA EXIBIDORA");
      const prazoIndex = headers.indexOf("PRAZO ENTREGA FOTOS");
      const dataIndex = headers.indexOf("DATA SOLICITAÇÃO CHECKING");
      const formatoIndex = headers.indexOf("FORMATO DE CHECKING");
      const atendimentoIndex = headers.indexOf("ATENDIMENTO");
      const campanhaIndex = headers.indexOf("NOME CAMPANHA");
      const nrCampanhaIndex = headers.indexOf("N° DA CAMPANHA");
      const opecIndex = headers.indexOf("OPEC SOLICITANTE");
      const qtdIndex = headers.indexOf("QTD VÍDEOS");
      const inicioIndex = headers.indexOf("INICIO DA CAMPANHA");
      const fimIndex = headers.indexOf("FIM DA CAMPANHA");
      const obsIndex = headers.indexOf("OBSERVAÇÃO");

      // Parse dados (linhas 2+)
      const parsed = rows.slice(1).map((row, idx) => ({
        id: row[idIndex] || `CHK-${String(idx).padStart(6, "0")}`,
        cliente: row[clienteIndex] || "—",
        praca: row[pracaIndex] || "—",
        prazoEntrega: row[prazoIndex] || "",
        dataSolicitacao: row[dataIndex] || "",
        formato: row[formatoIndex] || FORMATOS[0],
        atendimento: row[atendimentoIndex] || "—",
        campanha: row[campanhaIndex] || "—",
        nrCampanha: row[nrCampanhaIndex] || "—",
        opec: row[opecIndex] || "—",
        qtdPontos: row[qtdIndex] || "1",
        inicio: row[inicioIndex] || "",
        fim: row[fimIndex] || "",
        obs: row[obsIndex] || "—",
      })).filter(o => o.id && o.id !== "ID CHECKING");

      setOs(parsed);
      saveCache(parsed);
      setLastSync(new Date().toLocaleTimeString('pt-BR'));
      showToast(`${parsed.length} OS carregadas do Google Sheets`);
    } catch (err) {
      console.error("Erro:", err);
      setError(err.message);
      showToast("Erro ao carregar. Tentando cache...", "erro");
      loadCache();
    } finally {
      setLoading(false);
    }
  };

  const saveCache = (data) => {
    localStorage.setItem(CACHE_KEY, JSON.stringify({ data, timestamp: Date.now() }));
  };

  const loadCache = () => {
    const cached = localStorage.getItem(CACHE_KEY);
    if (cached) {
      try {
        const { data } = JSON.parse(cached);
        setOs(data);
        showToast("Dados carregados do cache local", "aviso");
      } catch {
        showToast("Erro ao carregar cache", "erro");
      }
    }
  };

  // Carregar dados ao iniciar
  useEffect(() => {
    fetchFromSheets();
    const interval = setInterval(fetchFromSheets, CACHE_EXPIRY);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const showToast = (msg, tipo = "sucesso") => {
    setToast({ msg, tipo });
    setTimeout(() => setToast(null), 3000);
  };

  const emptyForm = {
    id: "",
    cliente: "",
    praca: "",
    prazoEntrega: "",
    dataSolicitacao: hoje(),
    formato: FORMATOS[0],
    atendimento: "",
    campanha: "",
    nrCampanha: "",
    opec: "",
    qtdPontos: "1",
    inicio: "",
    fim: "",
    obs: "",
  };

  const handleSave = () => {
    if (!form.id || !form.cliente || !form.prazoEntrega) {
      showToast("Preencha ID, Cliente e Prazo", "erro");
      return;
    }

    if (editId) {
      setOs(prev => prev.map(o => o.id === editId ? { ...form } : o));
      showToast("OS atualizada");
    } else {
      if (os.find(o => o.id === form.id)) {
        showToast("ID já existe", "erro");
        return;
      }
      setOs(prev => [...prev, { ...form }]);
      showToast("OS criada");
    }

    setForm(emptyForm);
    setEditId(null);
    setView("lista");
  };

  const handleEdit = (osItem) => {
    setForm(osItem);
    setEditId(osItem.id);
    setView("nova");
  };

  const handleDelete = (id) => {
    if (window.confirm("Remover esta OS?")) {
      setOs(prev => prev.filter(o => o.id !== id));
      showToast("OS removida");
    }
  };

  const handleExport = () => {
    const dados = { versao: "1.0", exportado: new Date().toISOString(), total: os.length, os };
    const blob = new Blob([JSON.stringify(dados, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `checking-backup-${new Date().toISOString().slice(0, 7)}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    showToast(`Backup exportado · ${os.length} OS`);
  };

  // Dados filtrados
  const lista = useMemo(() => {
    return os.map(o => ({
      ...o,
      dias: diasRestantes(o.prazoEntrega),
    })).sort((a, b) => (a.dias ?? 999) - (b.dias ?? 999));
  }, [os]);

  const clientes = useMemo(() => [...new Set(os.map(o => o.cliente))], [os]);
  const pracas = useMemo(() => [...new Set(os.map(o => o.praca))], [os]);

  // Estilos
  const card = { background: "#fff", borderRadius: 12, border: "1px solid #E0E4EC", padding: 20 };
  const btn = (bg, fg) => ({ padding: "10px 16px", borderRadius: 8, border: "none", background: bg, color: fg, fontWeight: 700, fontSize: 13, cursor: "pointer", fontFamily: "inherit" });
  const inp = { padding: "10px 12px", border: "1px solid #E0E4EC", borderRadius: 8, fontSize: 13, fontFamily: "inherit", marginTop: 8 };
  const lbl = { fontSize: 12, fontWeight: 700, color: "#6B7A99", textTransform: "uppercase", letterSpacing: 0.5 };

  const KpiCard = ({ icon, value, label, color }) => (
    <div style={{ ...card, textAlign: "center" }}>
      <div style={{ fontSize: 32, marginBottom: 8 }}>{icon}</div>
      <div style={{ fontSize: 24, fontWeight: 700, color, marginBottom: 4 }}>{value}</div>
      <div style={{ fontSize: 12, color: "#6B7A99" }}>{label}</div>
    </div>
  );

  const F = ({ label, k, ph, type = "text", span = 1 }) => (
    <div style={{ gridColumn: span > 1 ? `span ${span}` : "auto" }}>
      <label style={lbl}>{label}</label>
      <input
        type={type}
        placeholder={ph}
        value={form[k] || ""}
        onChange={e => setForm(p => ({ ...p, [k]: e.target.value }))}
        style={{ ...inp, width: "100%" }}
      />
    </div>
  );

  return (
    <div style={{ background: "#F5F6F8", minHeight: "100vh", fontFamily: "system-ui, -apple-system, sans-serif" }}>
      {/* Toast */}
      {toast && (
        <div style={{
          position: "fixed",
          top: 24,
          right: 24,
          padding: "12px 20px",
          borderRadius: 10,
          background: toast.tipo === "erro" ? "#E74C3C" : toast.tipo === "aviso" ? "#F5A623" : "#27AE60",
          color: "#fff",
          fontWeight: 700,
          fontSize: 13,
          zIndex: 999,
          boxShadow: "0 4px 20px rgba(0,0,0,0.2)"
        }}>
          {toast.msg}
        </div>
      )}

      {/* Sidebar */}
      {isMobile && sidebarOpen && <div onClick={() => setSidebarOpen(false)} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", zIndex: 99 }} />}

      {isMobile && (
        <button onClick={() => setSidebarOpen(v => !v)} style={{ position: "fixed", top: 12, left: 12, zIndex: 201, width: 44, height: 44, borderRadius: 10, background: "#1A1A2E", border: "none", cursor: "pointer", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 5 }}>
          <div style={{ width: 20, height: 2, background: "#fff", borderRadius: 2 }} />
          <div style={{ width: 20, height: 2, background: "#fff", borderRadius: 2 }} />
          <div style={{ width: 20, height: 2, background: "#fff", borderRadius: 2 }} />
        </button>
      )}

      <div style={{ position: "fixed", left: isMobile ? (sidebarOpen ? 0 : -220) : 0, top: 0, bottom: 0, width: 220, background: "#1A1A2E", display: "flex", flexDirection: "column", zIndex: 100, transition: "left 0.25s ease" }}>
        <div style={{ padding: "28px 20px 20px", borderBottom: "1px solid rgba(255,255,255,0.08)" }}>
          <div style={{ fontSize: 10, letterSpacing: 3, color: "#6B7A99", fontWeight: 700, marginBottom: 4 }}>ELETROMIDIA</div>
          <div style={{ fontSize: 18, fontWeight: 700, color: "#fff" }}>Checking</div>
          <div style={{ fontSize: 12, color: "#6B7A99", marginTop: 2 }}>Dashboard</div>
        </div>

        <nav style={{ padding: "16px 12px", flex: 1 }}>
          {[
            { key: "dashboard", icon: "📊", label: "Dashboard" },
            { key: "lista", icon: "📋", label: "Solicitações" },
          ].map(item => (
            <button key={item.key} onClick={() => { setView(item.key); if (isMobile) setSidebarOpen(false); }} style={{ display: "flex", alignItems: "center", gap: 10, width: "100%", padding: "10px 12px", borderRadius: 8, border: "none", cursor: "pointer", marginBottom: 4, fontSize: 14, fontFamily: "inherit", textAlign: "left", fontWeight: view === item.key ? 700 : 400, background: view === item.key ? "rgba(74,144,217,0.18)" : "transparent", color: view === item.key ? "#4A90D9" : "#8899BB" }}>
              <span style={{ fontSize: 15 }}>{item.icon}</span>{item.label}
            </button>
          ))}
        </nav>

        <div style={{ padding: "12px", display: "flex", flexDirection: "column", gap: 8 }}>
          <button onClick={() => { setForm(emptyForm); setEditId(null); setView("nova"); }} style={btn("#4A90D9", "#fff")} style={{ width: "100%", ...btn("#4A90D9", "#fff") }}>➕ Nova OS</button>
          <button onClick={fetchFromSheets} disabled={loading} style={btn("#27AE60", "#fff")} style={{ width: "100%", opacity: loading ? 0.6 : 1, ...btn("#27AE60", "#fff") }}>{loading ? "⏳ Sincronizando..." : "🔄 Sincronizar"}</button>
          <button onClick={handleExport} style={btn("#F5A623", "#fff")} style={{ width: "100%", ...btn("#F5A623", "#fff") }}>💾 Exportar</button>
        </div>

        <div style={{ padding: "16px 20px", borderTop: "1px solid rgba(255,255,255,0.08)", fontSize: 11, color: "#6B7A99" }}>
          <div>Total: <span style={{ color: "#fff", fontWeight: 700, fontSize: 16 }}>{os.length}</span></div>
          {lastSync && <div style={{ marginTop: 8 }}>Sync: {lastSync}</div>}
        </div>
      </div>

      {/* Conteúdo */}
      <div style={{ marginLeft: isMobile ? 0 : 220, padding: isMobile ? "16px 12px" : "32px", paddingTop: isMobile ? 64 : 32, minHeight: "100vh" }}>
        {view === "dashboard" && (
          <div>
            <div style={{ marginBottom: 24 }}>
              <div style={{ fontSize: 24, fontWeight: 700 }}>Dashboard</div>
              <div style={{ fontSize: 13, color: "#6B7A99", marginTop: 2 }}>Visão geral das OS</div>
            </div>

            {error && <div style={{ ...card, background: "#FDEDEC", borderLeft: "4px solid #E74C3C", marginBottom: 24 }}><div style={{ color: "#E74C3C", fontWeight: 700 }}>⚠️ {error}</div></div>}

            <div style={{ display: "grid", gridTemplateColumns: isMobile ? "repeat(2,1fr)" : "repeat(4,1fr)", gap: isMobile ? 10 : 16, marginBottom: 24 }}>
              <KpiCard icon="📋" value={os.length} label="Total" color="#4A90D9" />
              <KpiCard icon="✅" value={os.filter(o => diasRestantes(o.prazoEntrega) >= 0).length} label="No Prazo" color="#27AE60" />
              <KpiCard icon="⏰" value={os.filter(o => diasRestantes(o.prazoEntrega) < 0).length} label="Vencidas" color="#E74C3C" />
              <KpiCard icon="📊" value={os.length > 0 ? Math.round(os.filter(o => diasRestantes(o.prazoEntrega) >= 0).length / os.length * 100) + "%" : "—"} label="Taxa" color="#F5A623" />
            </div>

            <div style={{ ...card, textAlign: "center", padding: 40 }}>
              <div style={{ fontSize: 32, marginBottom: 8 }}>📊</div>
              <div style={{ fontWeight: 700, fontSize: 16 }}>Gráficos em desenvolvimento</div>
              <div style={{ fontSize: 13, marginTop: 4, color: "#6B7A99" }}>Mais análises virão em breve</div>
            </div>
          </div>
        )}

        {view === "lista" && (
          <div>
            <div style={{ marginBottom: 24 }}>
              <div style={{ fontSize: 24, fontWeight: 700 }}>Solicitações</div>
              <div style={{ fontSize: 13, color: "#6B7A99", marginTop: 2 }}>{lista.length} OS encontrada{lista.length !== 1 ? "s" : ""}</div>
            </div>

            <div style={{ ...card, padding: 0, overflow: "hidden" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                <thead><tr style={{ background: "#F8F9FB", borderBottom: "1px solid #E0E4EC" }}>{["ID", "Cliente", "Praça", "Atendimento", "Prazo", "Dias", ""].map(h => <th key={h} style={{ padding: "12px 16px", textAlign: "left", fontWeight: 700, color: "#6B7A99", fontSize: 11, letterSpacing: 0.8 }}>{h}</th>)}</tr></thead>
                <tbody>
                  {lista.length === 0 ? <tr><td colSpan={7} style={{ padding: 32, textAlign: "center", color: "#6B7A99" }}>Nenhuma OS encontrada</td></tr> :
                    lista.map((o, i) => (
                      <tr key={o.id} style={{ borderBottom: "1px solid #F0F2F5", background: i % 2 === 0 ? "#fff" : "#FAFBFC" }}>
                        <td style={{ padding: "12px 16px" }}><span style={{ fontWeight: 700, color: "#4A90D9", fontFamily: "monospace", fontSize: 12 }}>{o.id}</span></td>
                        <td style={{ padding: "12px 16px", fontWeight: 600 }}>{o.cliente}</td>
                        <td style={{ padding: "12px 16px", color: "#6B7A99" }}>{o.praca}</td>
                        <td style={{ padding: "12px 16px", color: "#6B7A99" }}>{o.atendimento || "—"}</td>
                        <td style={{ padding: "12px 16px" }}>{fmtDate(o.prazoEntrega)}</td>
                        <td style={{ padding: "12px 16px" }}>{o.dias === null ? "—" : <span style={{ fontWeight: 700, color: o.dias < 0 ? "#E74C3C" : o.dias <= 3 ? "#F5A623" : "#27AE60" }}>{o.dias}d</span>}</td>
                        <td style={{ padding: "12px 16px" }}>
                          <button onClick={() => handleEdit(o)} style={{ background: "none", border: "1px solid #E0E4EC", borderRadius: 6, padding: "4px 10px", fontSize: 12, cursor: "pointer", color: "#4A90D9", fontFamily: "inherit", marginRight: 4 }}>Editar</button>
                          <button onClick={() => handleDelete(o.id)} style={{ background: "none", border: "1px solid #E0E4EC", borderRadius: 6, padding: "4px 10px", fontSize: 12, cursor: "pointer", color: "#E74C3C", fontFamily: "inherit" }}>Deletar</button>
                        </td>
                      </tr>
                    ))
                  }
                </tbody>
              </table>
            </div>
          </div>
        )}

        {view === "nova" && (
          <div style={{ maxWidth: 740 }}>
            <div style={{ marginBottom: 24 }}>
              <div style={{ fontSize: 24, fontWeight: 700 }}>{editId ? `Editar — ${editId}` : "Nova Solicitação"}</div>
            </div>

            <div style={card}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
                <F label="ID da OS *" k="id" ph="CHK-000000" /><F label="Nº Campanha" k="nrCampanha" ph="460000" />
                <F label="Cliente *" k="cliente" ph="Nome do cliente" /><F label="Praça" k="praca" ph="FORTALEZA" />
                <F label="OPEC" k="opec" ph="Nome" /><F label="Atendimento" k="atendimento" ph="Nome" />
                <F label="Data Solicitação" k="dataSolicitacao" type="date" /><F label="Qtd. Pontos" k="qtdPontos" type="number" />
                <F label="Início" k="inicio" type="date" /><F label="Fim" k="fim" type="date" />
                <F label="Prazo Entrega *" k="prazoEntrega" type="date" />
                <div style={{ gridColumn: "span 2" }}>
                  <label style={lbl}>Formato</label>
                  <select value={form.formato || FORMATOS[0]} onChange={e => setForm(p => ({ ...p, formato: e.target.value }))} style={inp}>
                    {FORMATOS.map(f => <option key={f} value={f}>{f}</option>)}
                  </select>
                </div>
                <F label="Campanha" k="campanha" ph="Nome" span={2} />
                <div style={{ gridColumn: "span 2" }}>
                  <label style={lbl}>Observações</label>
                  <textarea value={form.obs || ""} onChange={e => setForm(p => ({ ...p, obs: e.target.value }))} rows={3} style={{ ...inp, width: "100%", resize: "vertical" }} />
                </div>
              </div>

              <div style={{ display: "flex", gap: 10, marginTop: 24 }}>
                <button onClick={handleSave} style={btn("#4A90D9", "#fff")}>{editId ? "Salvar" : "Cadastrar"}</button>
                <button onClick={() => { setView("lista"); setForm(emptyForm); setEditId(null); }} style={btn("#F0F2F5", "#6B7A99")}>Cancelar</button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
