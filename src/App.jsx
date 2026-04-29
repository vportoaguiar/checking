import { useState, useEffect, useMemo, useRef } from "react";

const MESES = ["Jan","Fev","Mar","Abr","Mai","Jun","Jul","Ago","Set","Out","Nov","Dez"];
const MESES_FULL = ["Janeiro","Fevereiro","Março","Abril","Maio","Junho","Julho","Agosto","Setembro","Outubro","Novembro","Dezembro"];
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
const STORAGE_KEY = "checking_vol_v1";
const STATUS_ENVIO_MAP = {"CHK-000071": "REENVIADO", "CHK-000082": "REENVIADO", "CHK-000097": "REENVIADO", "CHK-000157": "PENDENTE", "CHK-000159": "PENDENTE", "CHK-000337": "PENDENTE", "CHK-000338": "PENDENTE", "CHK-000372": "PENDENTE", "CHK-000430": "PENDENTE", "CHK-000470": "PENDENTE", "CHK-000499": "PENDENTE", "CHK-000527": "PENDENTE", "CHK-000549": "PENDENTE", "CHK-000575": "PENDENTE", "CHK-000622": "PENDENTE", "CHK-000713": "PENDENTE", "CHK-000817": "PENDENTE", "CHK-000863": "PENDENTE", "CHK-000945": "PENDENTE", "CHK-000951": "PENDENTE", "CHK-000978": "PENDENTE", "CHK-001034": "PENDENTE", "CHK-001067": "PENDENTE", "CHK-001075": "PENDENTE", "CHK-001088": "PENDENTE", "CHK-001108": "PENDENTE", "CHK-001167": "PENDENTE", "CHK-001169": "PENDENTE", "CHK-001190": "PENDENTE", "CHK-001201": "PENDENTE", "CHK-001212": "PENDENTE", "CHK-001220": "REENVIADO", "CHK-001243": "PENDENTE", "CHK-001268": "PENDENTE", "CHK-001364": "PENDENTE", "CHK-001372": "PENDENTE", "CHK-001380": "PENDENTE", "CHK-001402": "PENDENTE", "CHK-001479": "PENDENTE", "CHK-001493": "PENDENTE", "CHK-001494": "PENDENTE", "CHK-001518": "PENDENTE", "CHK-001556": "PENDENTE", "CHK-001557": "PENDENTE", "CHK-001559": "PENDENTE", "CHK-001613": "PENDENTE", "CHK-001629": "CANCELADO", "CHK-001693": "PENDENTE", "CHK-001746": "PENDENTE", "CHK-001750": "PENDENTE", "CHK-001822": "PENDENTE", "CHK-001858": "PENDENTE", "CHK-001969": "PENDENTE", "CHK-001989": "CANCELADO", "CHK-002002": "PENDENTE", "CHK-002010": "PENDENTE", "CHK-002194": "PENDENTE", "CHK-002309": "PENDENTE", "CHK-002369": "CANCELADO", "CHK-002391": "PENDENTE", "CHK-002485": "PENDENTE", "CHK-002497": "PENDENTE", "CHK-002517": "PENDENTE", "CHK-002519": "CANCELADO", "CHK-002529": "CANCELADO", "CHK-002531": "CANCELADO", "CHK-002532": "CANCELADO", "CHK-002548": "PENDENTE", "CHK-002554": "PENDENTE", "CHK-002602": "CANCELADO", "CHK-002611": "CANCELADO", "CHK-002622": "REENVIADO", "CHK-002665": "PENDENTE", "CHK-002680": "PENDENTE", "CHK-002827": "PENDENTE", "CHK-002835": "PENDENTE", "CHK-002900": "REENVIADO", "CHK-002901": "PENDENTE", "CHK-002937": "CANCELADO", "CHK-002938": "PENDENTE", "CHK-002955": "PENDENTE", "CHK-002962": "PENDENTE", "CHK-002974": "PENDENTE", "CHK-003015": "PENDENTE", "CHK-003033": "CANCELADO", "CHK-003069": "CANCELADO", "CHK-003160": "PENDENTE", "CHK-003161": "PENDENTE"};
const PRACA_ESTADO = {"FORTALEZA":"CE","SOBRAL":"CE","JUAZEIRO DO NORTE":"CE","CRATO":"CE","TERESINA":"PI","SÃO LUIS":"MA","BELÉM":"PA","MANAUS":"AM","MACEIO":"AL"};
const ESTADO_COR = {"CE":"#4A90D9","PI":"#F5A623","MA":"#27AE60","PA":"#8B5CF6","AM":"#E74C3C","AL":"#F97316"};
const CORTE_HISTORICO = "2026-04-19";
const hoje = () => new Date().toISOString().split("T")[0];
const fmtDate = (d) => { if(!d) return "—"; const [y,m,dd]=d.split("-"); return `${dd}/${m}/${y.slice(2)}`; };
const diasRestantes = (prazo) => prazo ? Math.ceil((new Date(prazo+"T00:00:00") - new Date(hoje()+"T00:00:00")) / 86400000) : null;

const parseCSV = (text) => {
  const lines = text.trim().split('\n');
  if (lines.length < 2) return [];
  const headers = lines[0].split(',').map(h => h.trim());
  return lines.slice(1).map(line => {
    const values = line.split(',').map(v => v.trim());
    const obj = {};
    headers.forEach((header, idx) => { obj[header] = values[idx] || ''; });
    return obj;
  }).filter(obj => obj['ID CHECKING'] || obj['id']);
};

const mapCSVToOS = (csvData) => {
  return csvData.map(row => {
    const getField = (names) => {
      for (const name of names) {
        for (const key of Object.keys(row)) {
          if (key.toLowerCase().includes(name.toLowerCase())) return row[key];
        }
      }
      return '';
    };
    return {
      id: getField(['ID CHECKING', 'id']) || '',
      cliente: getField(['CLIENTE', 'cliente']) || '—',
      praca: getField(['PRAÇA', 'praca']) || '—',
      prazoEntrega: getField(['PRAZO', 'prazo entrega']) || '',
      dataSolicitacao: getField(['DATA', 'data solicitacao']) || '',
      formato: getField(['FORMATO']) || FORMATOS[0],
      atendimento: getField(['ATENDIMENTO', 'atendimento']) || '—',
      campanha: getField(['CAMPANHA', 'nome campanha']) || '—',
      nrCampanha: getField(['N°', 'numero campanha']) || '—',
      opec: getField(['OPEC', 'opec solicitante']) || '—',
      qtdPontos: getField(['QTD', 'quantidade']) || '1',
      inicio: getField(['INICIO']) || '',
      fim: getField(['FIM']) || '',
      obs: getField(['OBS', 'observacao']) || '—',
    };
  }).filter(o => o.id);
};

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
  const [filtroCliente, setFiltroCliente] = useState("");
  const [filtroPraca, setFiltroPraca] = useState("");
  const [filtroDataDe, setFiltroDataDe] = useState("");
  const [filtroDataAte, setFiltroDataAte] = useState("");
  const [filterVencidas, setFilterVencidas] = useState(false);
  const [sel, setSel] = useState(null);
  const [showArquivadas, setShowArquivadas] = useState(false);
  const csvFileRef = useRef(null);
  const importRef = useRef(null);

  useEffect(() => {
    loadData();
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

  const saveData = (data) => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ os: data, lastSync: new Date().toISOString() }));
  };

  const loadData = () => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      try {
        const { os: osData, lastSync } = JSON.parse(stored);
        setOs(osData || []);
        setLastSync(new Date(lastSync).toLocaleTimeString('pt-BR'));
      } catch {
        showToast("Erro ao carregar dados", "erro");
      }
    }
  };

  const handleCSVUpload = (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setLoading(true);
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const csvData = parseCSV(e.target?.result);
        const mapped = mapCSVToOS(csvData);
        if (mapped.length === 0) {
          showToast("Nenhum dado válido no CSV", "erro");
          setLoading(false);
          return;
        }
        setOs(mapped);
        saveData(mapped);
        setLastSync(new Date().toLocaleTimeString('pt-BR'));
        showToast(`${mapped.length} OS carregadas`);
        setError(null);
      } catch (err) {
        console.error(err);
        showToast("Erro ao processar CSV", "erro");
      } finally {
        setLoading(false);
        if (csvFileRef.current) csvFileRef.current.value = "";
      }
    };
    reader.readAsText(file);
  };

  const handleImport = (file) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = JSON.parse(e.target?.result);
        setOs(data.os || []);
        saveData(data.os || []);
        showToast(`${data.os?.length || 0} OS importadas`);
      } catch {
        showToast("Erro ao importar", "erro");
      }
    };
    reader.readAsText(file);
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
    status: undefined,
    arquivada: undefined,
  };

  const handleSave = () => {
    if (!form.id || !form.cliente || !form.prazoEntrega) {
      showToast("Preencha ID, Cliente e Prazo", "erro");
      return;
    }
    if (editId) {
      const newOs = os.map(o => o.id === editId ? { ...form } : o);
      setOs(newOs);
      saveData(newOs);
      showToast("OS atualizada");
    } else {
      if (os.find(o => o.id === form.id)) {
        showToast("ID já existe", "erro");
        return;
      }
      const newOs = [...os, { ...form }];
      setOs(newOs);
      saveData(newOs);
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

  const handleDel = (id) => {
    const newOs = os.filter(o => o.id !== id);
    setOs(newOs);
    saveData(newOs);
    showToast("OS removida");
    setSel(null);
  };

  const handleBaixar = (ids) => {
    const newOs = os.map(o => ids.includes(o.id) ? { ...o, status: "entregue" } : o);
    setOs(newOs);
    saveData(newOs);
    showToast(`${ids.length} OS baixada${ids.length > 1 ? "s" : ""}`);
  };

  const handleArquivar = (ids) => {
    const newOs = os.map(o => ids.includes(o.id) ? { ...o, arquivada: true } : o);
    setOs(newOs);
    saveData(newOs);
    showToast(`${ids.length} OS arquivada${ids.length > 1 ? "s" : ""}`);
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

  const osC = useMemo(() => {
    return os.map(o => {
      const isEntregue = o.status === "entregue" || (o.prazoEntrega && o.prazoEntrega <= CORTE_HISTORICO);
      const statusEnvio = STATUS_ENVIO_MAP[o.id] || "ENVIADO";
      return { ...o, dias: isEntregue ? null : diasRestantes(o.prazoEntrega), entregue: isEntregue, statusEnvio, arquivada: o.arquivada };
    });
  }, [os]);

  const lista = useMemo(() => {
    let filtered = osC;
    if (filterVencidas) {
      filtered = filtered.filter(o => o.dias !== null && o.dias < 0);
    } else {
      if (filtroCliente) filtered = filtered.filter(o => o.cliente.toLowerCase().includes(filtroCliente.toLowerCase()));
      if (filtroPraca) filtered = filtered.filter(o => o.praca === filtroPraca);
      if (filtroDataDe) filtered = filtered.filter(o => o.dataSolicitacao >= filtroDataDe);
      if (filtroDataAte) filtered = filtered.filter(o => o.dataSolicitacao <= filtroDataAte);
    }
    return filtered.sort((a, b) => (a.dias ?? 999) - (b.dias ?? 999));
  }, [osC, filtroCliente, filtroPraca, filtroDataDe, filtroDataAte, filterVencidas]);

  const inconsistentes = useMemo(() => {
    return osC.filter(o => o.statusEnvio !== "ENVIADO" && (!showArquivadas ? !o.arquivada : true));
  }, [osC, showArquivadas]);

  const clientes = useMemo(() => [...new Set(osC.map(o => o.cliente).filter(Boolean))], [osC]);
  const pracas = useMemo(() => [...new Set(osC.map(o => o.praca).filter(Boolean))], [osC]);

  const dashData = useMemo(() => {
    const filtered = osC.filter(o => {
      const d = new Date(o.dataSolicitacao);
      return d.getMonth() + 1 === dashMes && d.getFullYear() === dashAno;
    });
    return {
      total: filtered.length,
      noPrazo: filtered.filter(o => o.dias !== null && o.dias >= 0).length,
      vencidas: filtered.filter(o => o.dias !== null && o.dias < 0).length,
    };
  }, [osC, dashMes, dashAno]);

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

  const F = ({ label, k, ph, type = "text", span = 1, dis = false }) => (
    <div style={{ gridColumn: span > 1 ? `span ${span}` : "auto" }}>
      <label style={lbl}>{label}</label>
      <input disabled={dis} type={type} placeholder={ph} value={form[k] || ""} onChange={e => setForm(p => ({ ...p, [k]: e.target.value }))} style={{ ...inp, width: "100%", opacity: dis ? 0.6 : 1 }} />
    </div>
  );

  const gerarRelatVencidas = () => {
    const vencidas = lista.filter(o => o.dias !== null && o.dias < 0);
    const grouped = {};
    vencidas.forEach(o => {
      const key = new Date(o.dataSolicitacao).getMonth() + 1;
      if (!grouped[key]) grouped[key] = [];
      grouped[key].push(o);
    });

    let html = `<!DOCTYPE html><html><head><meta charset="UTF-8"><style>body{font-family:system-ui;padding:40px;background:#f5f6f8}table{width:100%;border-collapse:collapse;margin-bottom:30px}th,td{padding:12px;text-align:left;border-bottom:1px solid #e0e4ec}th{background:#f8f9fb;font-weight:700;color:#6b7a99}tr:nth-child(even){background:#fafbfc}.header{margin-bottom:30px}.title{font-size:24px;font-weight:700;margin-bottom:8px}.subtitle{color:#6b7a99;font-size:13px}.id{font-family:monospace;color:#4a90d9;font-weight:700}.prazo{color:#e74c3c;font-weight:700}</style></head><body>`;
    html += `<div class="header"><div class="title">🔴 OS com Prazo Vencido</div><div class="subtitle">Gerado em ${new Date().toLocaleDateString('pt-BR')} · Total: ${vencidas.length}</div></div>`;
    
    Object.keys(grouped).sort((a, b) => b - a).forEach(mes => {
      const mesNome = MESES_FULL[parseInt(mes) - 1];
      html += `<h3>${mesNome}</h3><table><tr><th>ID</th><th>Cliente</th><th>Praça</th><th>Data Solicitação</th><th>Prazo</th><th>Atendimento</th></tr>`;
      grouped[mes].forEach(o => {
        html += `<tr><td class="id">${o.id}</td><td>${o.cliente}</td><td>${o.praca}</td><td>${fmtDate(o.dataSolicitacao)}</td><td class="prazo">${fmtDate(o.prazoEntrega)}</td><td>${o.atendimento}</td></tr>`;
      });
      html += `</table>`;
    });
    html += `<script>window.print();</script></body></html>`;

    const blob = new Blob([html], { type: "text/html" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `os-vencidas-${new Date().toISOString().slice(0, 10)}.html`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    showToast(`Relatório gerado · ${vencidas.length} OS`);
  };

  const gerarRelatOPEC = () => {
    const grouped = {};
    inconsistentes.forEach(o => {
      if (!grouped[o.statusEnvio]) grouped[o.statusEnvio] = [];
      grouped[o.statusEnvio].push(o);
    });

    let html = `<!DOCTYPE html><html><head><meta charset="UTF-8"><style>body{font-family:system-ui;padding:40px;background:#f5f6f8}table{width:100%;border-collapse:collapse;margin-bottom:30px}th,td{padding:12px;text-align:left;border-bottom:1px solid #e0e4ec}th{background:#f8f9fb;font-weight:700;color:#6b7a99}.id{font-family:monospace;color:#4a90d9;font-weight:700}</style></head><body>`;
    html += `<h2>Inconsistentes - OPEC</h2><p>Gerado em ${new Date().toLocaleDateString('pt-BR')}</p>`;
    
    Object.keys(grouped).forEach(status => {
      html += `<h3>${status}</h3><table><tr><th>ID</th><th>Cliente</th><th>Praça</th><th>Data</th><th>Prazo</th><th>Atendimento</th></tr>`;
      grouped[status].forEach(o => {
        html += `<tr><td class="id">${o.id}</td><td>${o.cliente}</td><td>${o.praca}</td><td>${fmtDate(o.dataSolicitacao)}</td><td>${fmtDate(o.prazoEntrega)}</td><td>${o.atendimento}</td></tr>`;
      });
      html += `</table>`;
    });
    html += `<script>window.print();</script></body></html>`;

    const blob = new Blob([html], { type: "text/html" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `inconsistentes-opec-${new Date().toISOString().slice(0, 10)}.html`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    showToast(`Relatório OPEC gerado · ${inconsistentes.length} OS`);
  };

  return (
    <div style={{ background: "#F5F6F8", minHeight: "100vh", fontFamily: "system-ui, -apple-system, sans-serif" }}>
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
            { key: "consulta", icon: "🔍", label: "Consulta" },
            { key: "inconsistentes", icon: "⚠️", label: "Inconsistentes" },
            { key: "lista", icon: "📋", label: "Solicitações" },
          ].map(item => (
            <button key={item.key} onClick={() => { setView(item.key); if (isMobile) setSidebarOpen(false); }} style={{ display: "flex", alignItems: "center", gap: 10, width: "100%", padding: "10px 12px", borderRadius: 8, border: "none", cursor: "pointer", marginBottom: 4, fontSize: 14, fontFamily: "inherit", textAlign: "left", fontWeight: view === item.key ? 700 : 400, background: view === item.key ? "rgba(74,144,217,0.18)" : "transparent", color: view === item.key ? "#4A90D9" : "#8899BB" }}>
              <span style={{ fontSize: 15 }}>{item.icon}</span>{item.label}
            </button>
          ))}
        </nav>

        <div style={{ padding: "12px", display: "flex", flexDirection: "column", gap: 8 }}>
          <button onClick={() => { setForm(emptyForm); setEditId(null); setView("nova"); }} style={{ width: "100%", ...btn("#4A90D9", "#fff") }}>➕ Nova OS</button>
          <button onClick={() => csvFileRef.current?.click()} disabled={loading} style={{ width: "100%", opacity: loading ? 0.6 : 1, ...btn("#3498DB", "#fff") }}>{loading ? "⏳ Carregando..." : "📤 CSV"}</button>
          <button onClick={() => importRef.current?.click()} style={{ width: "100%", ...btn("#9B59B6", "#fff") }}>📂 Importar</button>
          <button onClick={handleExport} style={{ width: "100%", ...btn("#F5A623", "#fff") }}>💾 Exportar</button>
        </div>

        <div style={{ padding: "16px 20px", borderTop: "1px solid rgba(255,255,255,0.08)", fontSize: 11, color: "#6B7A99" }}>
          <div>Total: <span style={{ color: "#fff", fontWeight: 700, fontSize: 16 }}>{osC.length}</span></div>
          {lastSync && <div style={{ marginTop: 8 }}>Sync: {lastSync}</div>}
        </div>
      </div>

      <div style={{ marginLeft: isMobile ? 0 : 220, padding: isMobile ? "16px 12px" : "32px", paddingTop: isMobile ? 64 : 32, minHeight: "100vh" }}>
        {view === "dashboard" && (
          <div>
            <div style={{ marginBottom: 24 }}>
              <div style={{ fontSize: 24, fontWeight: 700 }}>Dashboard</div>
              <div style={{ fontSize: 13, color: "#6B7A99", marginTop: 2 }}>Visão geral das OS</div>
              <div style={{ display: "flex", gap: 10, marginTop: 16 }}>
                <select value={dashMes} onChange={e => setDashMes(parseInt(e.target.value))} style={inp}>
                  {MESES_FULL.map((m, i) => <option key={i} value={i + 1}>{m}</option>)}
                </select>
                <select value={dashAno} onChange={e => setDashAno(parseInt(e.target.value))} style={inp}>
                  {[2025, 2026].map(a => <option key={a} value={a}>{a}</option>)}
                </select>
              </div>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: isMobile ? "repeat(2,1fr)" : "repeat(4,1fr)", gap: isMobile ? 10 : 16, marginBottom: 24 }}>
              <KpiCard icon="📋" value={dashData.total} label="Total" color="#4A90D9" />
              <KpiCard icon="✅" value={dashData.noPrazo} label="No Prazo" color="#27AE60" />
              <KpiCard icon="⏰" value={dashData.vencidas} label="Vencidas" color="#E74C3C" />
              <KpiCard icon="📊" value={dashData.total > 0 ? Math.round(dashData.noPrazo / dashData.total * 100) + "%" : "—"} label="Taxa" color="#F5A623" />
            </div>

            <div style={{ ...card, textAlign: "center", padding: 40 }}>
              <div style={{ fontSize: 32, marginBottom: 8 }}>📊</div>
              <div style={{ fontWeight: 700, fontSize: 16 }}>Gráficos em desenvolvimento</div>
              <div style={{ fontSize: 13, marginTop: 4, color: "#6B7A99" }}>Mais análises virão em breve</div>
            </div>
          </div>
        )}

        {view === "consulta" && (
          <div>
            <div style={{ marginBottom: 24 }}>
              <div style={{ fontSize: 24, fontWeight: 700 }}>Consulta</div>
              <div style={{ fontSize: 13, color: "#6B7A99", marginTop: 2 }}>Filtros avançados</div>
            </div>

            <div style={{ ...card, marginBottom: 24 }}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
                <div>
                  <label style={lbl}>Cliente</label>
                  <input type="text" placeholder="Filtrar por cliente" value={filtroCliente} onChange={e => setFiltroCliente(e.target.value)} style={{ ...inp, width: "100%" }} />
                </div>
                <div>
                  <label style={lbl}>Praça</label>
                  <select value={filtroPraca} onChange={e => setFiltroPraca(e.target.value)} style={{ ...inp, width: "100%" }}>
                    <option value="">Todas</option>
                    {pracas.map(p => <option key={p} value={p}>{p}</option>)}
                  </select>
                </div>
                <div>
                  <label style={lbl}>Data De</label>
                  <input type="date" value={filtroDataDe} onChange={e => setFiltroDataDe(e.target.value)} style={{ ...inp, width: "100%" }} />
                </div>
                <div>
                  <label style={lbl}>Data Até</label>
                  <input type="date" value={filtroDataAte} onChange={e => setFiltroDataAte(e.target.value)} style={{ ...inp, width: "100%" }} />
                </div>
              </div>
              <button onClick={() => { setFiltroCliente(""); setFiltroPraca(""); setFiltroDataDe(""); setFiltroDataAte(""); }} style={{ marginTop: 16, ...btn("#F0F2F5", "#6B7A99") }}>Limpar</button>
            </div>

            <div style={{ ...card, padding: 0, overflow: "hidden" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                <thead><tr style={{ background: "#F8F9FB", borderBottom: "1px solid #E0E4EC" }}>{["ID", "Cliente", "Praça", "Atendimento", "Prazo", "Dias", ""].map(h => <th key={h} style={{ padding: "12px 16px", textAlign: "left", fontWeight: 700, color: "#6B7A99", fontSize: 11, letterSpacing: 0.8 }}>{h}</th>)}</tr></thead>
                <tbody>
                  {lista.length === 0 ? <tr><td colSpan={7} style={{ padding: 32, textAlign: "center", color: "#6B7A99" }}>Nenhuma OS encontrada</td></tr> :
                    lista.map((o, i) => (
                      <tr key={o.id} style={{ borderBottom: "1px solid #F0F2F5", background: i % 2 === 0 ? "#fff" : "#FAFBFC", cursor: "pointer" }} onClick={() => { setSel(o); setView("detalhe"); }}>
                        <td style={{ padding: "12px 16px" }}><span style={{ fontWeight: 700, color: "#4A90D9", fontFamily: "monospace", fontSize: 12 }}>{o.id}</span></td>
                        <td style={{ padding: "12px 16px", fontWeight: 600 }}>{o.cliente}</td>
                        <td style={{ padding: "12px 16px", color: "#6B7A99" }}>{o.praca}</td>
                        <td style={{ padding: "12px 16px", color: "#6B7A99" }}>{o.atendimento || "—"}</td>
                        <td style={{ padding: "12px 16px" }}>{fmtDate(o.prazoEntrega)}</td>
                        <td style={{ padding: "12px 16px" }}>{o.dias === null ? "—" : <span style={{ fontWeight: 700, color: o.dias < 0 ? "#E74C3C" : o.dias <= 3 ? "#F5A623" : "#27AE60" }}>{o.dias}d</span>}</td>
                        <td style={{ padding: "12px 16px" }}><button onClick={e => { e.stopPropagation(); handleEdit(o); }} style={{ background: "none", border: "1px solid #E0E4EC", borderRadius: 6, padding: "4px 10px", fontSize: 12, cursor: "pointer", color: "#4A90D9", fontFamily: "inherit" }}>Editar</button></td>
                      </tr>
                    ))
                  }
                </tbody>
              </table>
            </div>

            {lista.filter(o => o.dias !== null && o.dias < 0).length > 0 && (
              <div style={{ marginTop: 20 }}>
                <button onClick={gerarRelatVencidas} style={{ ...btn("#E74C3C", "#fff") }}>📄 Relatório Vencidas</button>
              </div>
            )}
          </div>
        )}

        {view === "inconsistentes" && (
          <div>
            <div style={{ marginBottom: 24 }}>
              <div style={{ fontSize: 24, fontWeight: 700 }}>Inconsistentes</div>
              <div style={{ fontSize: 13, color: "#6B7A99", marginTop: 2 }}>Status: PENDENTE, CANCELADO, REENVIADO</div>
            </div>

            <div style={{ marginBottom: 16 }}>
              <label style={{ display: "flex", alignItems: "center", gap: 10, cursor: "pointer" }}>
                <input type="checkbox" checked={showArquivadas} onChange={e => setShowArquivadas(e.target.checked)} />
                <span style={{ fontWeight: 600, fontSize: 13 }}>Ver arquivadas</span>
              </label>
            </div>

            <div style={{ ...card, padding: 0, overflow: "hidden" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                <thead><tr style={{ background: "#F8F9FB", borderBottom: "1px solid #E0E4EC" }}>{["ID", "Status", "Cliente", "Praça", "Prazo", ""].map(h => <th key={h} style={{ padding: "12px 16px", textAlign: "left", fontWeight: 700, color: "#6B7A99", fontSize: 11, letterSpacing: 0.8 }}>{h}</th>)}</tr></thead>
                <tbody>
                  {inconsistentes.length === 0 ? <tr><td colSpan={6} style={{ padding: 32, textAlign: "center", color: "#6B7A99" }}>Nenhuma OS inconsistente</td></tr> :
                    inconsistentes.map((o, i) => (
                      <tr key={o.id} style={{ borderBottom: "1px solid #F0F2F5", background: i % 2 === 0 ? "#fff" : "#FAFBFC" }}>
                        <td style={{ padding: "12px 16px" }}><span style={{ fontWeight: 700, color: "#4A90D9", fontFamily: "monospace", fontSize: 12 }}>{o.id}</span></td>
                        <td style={{ padding: "12px 16px" }}><span style={{ background: o.statusEnvio === "PENDENTE" ? "#FFF8EC" : o.statusEnvio === "CANCELADO" ? "#FDEDEC" : "#EBF5FF", color: o.statusEnvio === "PENDENTE" ? "#F5A623" : o.statusEnvio === "CANCELADO" ? "#E74C3C" : "#4A90D9", padding: "4px 10px", borderRadius: 6, fontWeight: 700, fontSize: 11 }}>{o.statusEnvio}</span></td>
                        <td style={{ padding: "12px 16px" }}>{o.cliente}</td>
                        <td style={{ padding: "12px 16px" }}>{o.praca}</td>
                        <td style={{ padding: "12px 16px" }}>{fmtDate(o.prazoEntrega)}</td>
                        <td style={{ padding: "12px 16px" }}><button onClick={() => handleArquivar([o.id])} style={{ background: "none", border: "1px solid #E0E4EC", borderRadius: 6, padding: "4px 10px", fontSize: 12, cursor: "pointer", color: "#F5A623", fontFamily: "inherit" }}>Arquivar</button></td>
                      </tr>
                    ))
                  }
                </tbody>
              </table>
            </div>

            {inconsistentes.length > 0 && (
              <div style={{ marginTop: 20 }}>
                <button onClick={gerarRelatOPEC} style={{ ...btn("#F5A623", "#fff") }}>📄 Relatório para OPEC</button>
              </div>
            )}
          </div>
        )}

        {view === "lista" && (
          <div>
            <div style={{ marginBottom: 24 }}>
              <div style={{ fontSize: 24, fontWeight: 700 }}>Solicitações</div>
              <div style={{ fontSize: 13, color: "#6B7A99", marginTop: 2 }}>{osC.length} OS no total</div>
            </div>

            <div style={{ ...card, padding: 0, overflow: "hidden" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                <thead><tr style={{ background: "#F8F9FB", borderBottom: "1px solid #E0E4EC" }}>{["ID", "Cliente", "Praça", "Atendimento", "Prazo", "Dias", "Status"].map(h => <th key={h} style={{ padding: "12px 16px", textAlign: "left", fontWeight: 700, color: "#6B7A99", fontSize: 11, letterSpacing: 0.8 }}>{h}</th>)}</tr></thead>
                <tbody>
                  {osC.length === 0 ? <tr><td colSpan={7} style={{ padding: 32, textAlign: "center", color: "#6B7A99" }}>Nenhuma OS. Faça upload de um CSV para começar.</td></tr> :
                    osC.map((o, i) => (
                      <tr key={o.id} style={{ borderBottom: "1px solid #F0F2F5", background: i % 2 === 0 ? "#fff" : "#FAFBFC", cursor: "pointer", opacity: o.arquivada ? 0.6 : 1 }} onClick={() => { setSel(o); setView("detalhe"); }}>
                        <td style={{ padding: "12px 16px" }}><span style={{ fontWeight: 700, color: "#4A90D9", fontFamily: "monospace", fontSize: 12 }}>{o.id}</span></td>
                        <td style={{ padding: "12px 16px", fontWeight: 600 }}>{o.cliente}</td>
                        <td style={{ padding: "12px 16px", color: "#6B7A99" }}>{o.praca}</td>
                        <td style={{ padding: "12px 16px", color: "#6B7A99" }}>{o.atendimento || "—"}</td>
                        <td style={{ padding: "12px 16px" }}>{fmtDate(o.prazoEntrega)}</td>
                        <td style={{ padding: "12px 16px" }}>{o.dias === null ? "✅" : <span style={{ fontWeight: 700, color: o.dias < 0 ? "#E74C3C" : o.dias <= 3 ? "#F5A623" : "#27AE60" }}>{o.dias}d</span>}</td>
                        <td style={{ padding: "12px 16px" }}>{o.status === "entregue" ? <span style={{ color: "#27AE60", fontWeight: 700 }}>Entregue</span> : o.statusEnvio !== "ENVIADO" ? <span style={{ color: "#F5A623" }}>{o.statusEnvio}</span> : "—"}</td>
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
                <F label="ID da OS *" k="id" ph="CHK-000000" dis={!!editId} /><F label="Nº Campanha" k="nrCampanha" ph="460000" />
                <F label="Cliente *" k="cliente" ph="Nome do cliente" /><F label="Praça" k="praca" ph="FORTALEZA" />
                <F label="OPEC" k="opec" ph="Nome" /><F label="Atendimento" k="atendimento" ph="Nome" />
                <F label="Data Solicitação" k="dataSolicitacao" type="date" /><F label="Qtd. Pontos" k="qtdPontos" type="number" ph="1" />
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

        {view === "detalhe" && sel && (
          <div style={{ maxWidth: 680 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 24 }}>
              <button onClick={() => setView("lista")} style={btn("#F0F2F5", "#6B7A99")}>← Voltar</button>
              <div>
                <div style={{ fontSize: 20, fontWeight: 700, fontFamily: "DM Mono,monospace" }}>{sel.id}</div>
                <div style={{ fontSize: 13, color: "#6B7A99" }}>{sel.cliente} · {sel.praca}</div>
              </div>
              {sel.dias !== null && <span style={{ marginLeft: "auto", background: sel.dias < 0 ? "#FDEDEC" : sel.dias <= 3 ? "#FFF8EC" : "#EAFAF1", color: sel.dias < 0 ? "#E74C3C" : sel.dias <= 3 ? "#F5A623" : "#27AE60", padding: "5px 14px", borderRadius: 20, fontSize: 12, fontWeight: 700 }}>{sel.dias < 0 ? `Vencido há ${Math.abs(sel.dias)}d` : sel.dias === 0 ? "Prazo hoje" : `${sel.dias}d restantes`}</span>}
            </div>
            <div style={{ ...card, marginBottom: 16 }}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
                {[["Campanha", sel.campanha], ["Nº Campanha", sel.nrCampanha], ["Cliente", sel.cliente], ["Praça", sel.praca], ["OPEC", sel.opec], ["Atendimento", sel.atendimento], ["Formato", sel.formato], ["Qtd. Pontos", sel.qtdPontos], ["Início", fmtDate(sel.inicio)], ["Fim", fmtDate(sel.fim)], ["Prazo Entrega", fmtDate(sel.prazoEntrega)], ["Solicitado em", fmtDate(sel.dataSolicitacao)]].map(([k, v]) => (
                  <div key={k}><div style={lbl}>{k}</div><div style={{ fontSize: 14, fontWeight: 500, marginTop: 4 }}>{v || "—"}</div></div>
                ))}
              </div>
              {sel.obs && <div style={{ marginTop: 20, padding: "12px 16px", background: "#FFF8EC", borderRadius: 8, borderLeft: "3px solid #F5A623" }}><div style={{ fontSize: 11, fontWeight: 700, color: "#F5A623", marginBottom: 4 }}>OBSERVAÇÕES</div><div style={{ fontSize: 13 }}>{sel.obs}</div></div>}
              <div style={{ display: "flex", gap: 10, marginTop: 20 }}>
                <button onClick={() => handleEdit(sel)} style={btn("#4A90D9", "#fff")}>Editar OS</button>
                <button onClick={() => { if (window.confirm("Remover esta OS?")) handleDel(sel.id); }} style={btn("#FDEDEC", "#E74C3C")}>Remover</button>
                <button onClick={() => handleBaixar([sel.id])} style={btn("#EAFAF1", "#27AE60")}>Baixar</button>
              </div>
            </div>
          </div>
        )}
      </div>

      <input ref={csvFileRef} type="file" accept=".csv" style={{ display: "none" }} onChange={handleCSVUpload} />
      <input ref={importRef} type="file" accept=".json" style={{ display: "none" }} onChange={e => { if (e.target.files[0]) handleImport(e.target.files[0]); e.target.value = ""; }} />
    </div>
  );
}
