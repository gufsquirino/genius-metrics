"use client";
import { useState, useEffect } from "react";

// ─── HELPERS ──────────────────────────────────────────────────────────────────
const fmt = (n, d = 2) =>
  isNaN(+n) ? "-" : (+n).toLocaleString("pt-BR", { minimumFractionDigits: d, maximumFractionDigits: d });

function calcMetrics(inp) {
  const spend = +inp.ad_spend || 0, cpm = +inp.cpm || 0, ctr = +inp.ctr || 0;
  const atc = +inp.add_to_cart || 0, chk = +inp.checkout_initiated || 0, pay = +inp.payment_info || 0;
  const ot = +inp.orders_total || 0, op = +inp.orders_paid || 0, rev = +inp.revenue_total || 0;
  const imp = cpm > 0 ? Math.round((spend / cpm) * 1000) : 0;
  const clicks = Math.round(imp * (ctr / 100));
  const cpc = clicks > 0 ? spend / clicks : 0;
  const atc_rate = clicks > 0 ? (atc / clicks) * 100 : 0;
  const chk_atc = atc > 0 ? (chk / atc) * 100 : 0;
  const pay_chk = chk > 0 ? (pay / chk) * 100 : 0;
  const pur_pay = pay > 0 ? (ot / pay) * 100 : 0;
  const prate = ot > 0 ? (op / ot) * 100 : 0;
  const cpa = op > 0 ? spend / op : 0;
  const rev_paid = ot > 0 && op > 0 ? (rev / ot) * op : 0;
  const roas = spend > 0 ? rev_paid / spend : 0;
  const ticket = op > 0 ? rev_paid / op : 0;
  const ps = +inp.products_sold || 0;
  const ipo = ot > 0 && ps > 0 ? ps / ot : 0;
  return {
    imp, clicks,
    cpc: +cpc.toFixed(2), atc_rate: +atc_rate.toFixed(1), chk_atc: +chk_atc.toFixed(1),
    pay_chk: +pay_chk.toFixed(1), pur_pay: +pur_pay.toFixed(1), prate: +prate.toFixed(1),
    cpa: +cpa.toFixed(2), rev_paid: +rev_paid.toFixed(2), roas: +roas.toFixed(2),
    ticket: +ticket.toFixed(2), ipo: +ipo.toFixed(2),
  };
}

function buildPrompt(inp, c, type) {
  const cat = type === "catalog";
  return `Você é gestor sênior de e-commerce/dropshipping. Analise as métricas abaixo e retorne SOMENTE JSON válido, sem texto antes ou depois, sem markdown.

CAMPANHA: ${inp.campaign_name || "Sem nome"} | TIPO: ${cat ? "CATÁLOGO" : "PRODUTO ÚNICO"} | CRIATIVO: ${inp.creative_type} | PREÇO: R$${inp.price || "N/I"} | FRETE: ${inp.shipping || "N/I"}

MÉTRICAS:
Gasto:R$${inp.ad_spend} | CPM:R$${inp.cpm} | CTR:${inp.ctr}% | Imp:${c.imp} | Cliques:${c.clicks} | CPC:R$${c.cpc}
ATC:${inp.add_to_cart} | Checkout:${inp.checkout_initiated} | InfoPgto:${inp.payment_info}
PedidosTotal:${inp.orders_total} | PedidosPagos:${inp.orders_paid} | FatTotal:R$${inp.revenue_total} | FatPago:R$${c.rev_paid}
TaxaATC:${c.atc_rate}% | ATC→Chk:${c.chk_atc}% | Chk→Pgto:${c.pay_chk}% | Pgto→Pedido:${c.pur_pay}% | Confirmação:${c.prate}% | CPA:R$${c.cpa} | ROAS:${c.roas}x | Ticket:R$${c.ticket}${cat ? ` | Itens/pedido:${c.ipo}` : ""}

BENCHMARKS: CPM≤45bom/>70caro | CTR<1.5ruim/>2.5bom/>3.5excelente | CPC≤1.2exc/>2ruim | ATC<3ruim/>6bom | ATC→Chk>50bom | Confirmação<75recuperar | ROAS<2prob/>2.5bom

Retorne EXATAMENTE este JSON preenchido com sua análise:
{"diagnostico_geral":"...","saude_campanha":"excelente","gargalo_principal":{"etapa":"...","taxa_atual":"X%","benchmark":"Y%","impacto":"..."},"analise_por_etapa":[{"etapa":"Topo do Funil","status":"bom","diagnostico":"...","recomendacoes":["...","..."]},{"etapa":"Meio do Funil","status":"atencao","diagnostico":"...","recomendacoes":["...","..."]},{"etapa":"Fundo do Funil","status":"critico","diagnostico":"...","recomendacoes":["...","..."]},{"etapa":"Confirmação de Pagamento","status":"bom","diagnostico":"...","recomendacoes":["...","..."]}],"plano_de_acao":[{"prioridade":1,"prazo":"Hoje (0-24h)","titulo":"...","acao_detalhada":"...","impacto_esperado":"..."},{"prioridade":2,"prazo":"Próximos 3 dias","titulo":"...","acao_detalhada":"...","impacto_esperado":"..."},{"prioridade":3,"prazo":"Próximos 7 dias","titulo":"...","acao_detalhada":"...","impacto_esperado":"..."}],"decisao_trafego":{"decisao":"Manter","justificativa":"...","observacao_tempo":"...","ajuste_orcamento":"..."},"insights_adicionais":"..."}`;
}

// ─── STYLES ───────────────────────────────────────────────────────────────────
const S = {
  header: { background: "rgba(8,12,20,0.97)", borderBottom: "1px solid rgba(255,255,255,0.07)", padding: "12px 20px", display: "flex", alignItems: "center", gap: 10, position: "sticky", top: 0, zIndex: 100 },
  logo: { width: 34, height: 34, background: "linear-gradient(135deg,#6366f1,#4f46e5)", borderRadius: 10, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 17, boxShadow: "0 0 16px rgba(99,102,241,0.4)" },
  main: { maxWidth: 820, margin: "0 auto", padding: "24px 16px" },
  card: { background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 14, padding: "18px 20px", marginBottom: 14 },
  secTitle: { fontSize: 10, fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", color: "#64748b", marginBottom: 12 },
  lbl: { fontSize: 11, color: "#94a3b8", marginBottom: 4, display: "block", fontWeight: 500 },
  input: { background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8, color: "#f1f5f9", padding: "8px 10px", fontSize: 13, width: "100%", outline: "none", fontFamily: "inherit" },
  btn: { background: "linear-gradient(135deg,#6366f1,#4f46e5)", border: "none", borderRadius: 10, color: "#fff", fontWeight: 700, fontSize: 14, padding: "12px 24px", cursor: "pointer", width: "100%", fontFamily: "inherit", boxShadow: "0 4px 20px rgba(99,102,241,0.35)" },
  btnSec: { background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8, color: "#94a3b8", fontWeight: 600, fontSize: 12, padding: "6px 14px", cursor: "pointer", fontFamily: "inherit" },
  g2: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 },
  g3: { display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 },
  g4: { display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: 10 },
  hint: { fontSize: 10, color: "#475569", marginTop: 3 },
};

// ─── SMALL COMPONENTS ─────────────────────────────────────────────────────────
function Header() {
  return (
    <div style={S.header}>
      <div style={S.logo}>📊</div>
      <div>
        <div style={{ fontWeight: 800, fontSize: 15, color: "#f1f5f9" }}>Genius Metrics</div>
        <div style={{ fontSize: 10, color: "#334155", letterSpacing: "0.08em" }}>DIAGNÓSTICO INTELIGENTE DE FUNIL</div>
      </div>
    </div>
  );
}

function Field({ label, value, onChange, placeholder, prefix, type = "number", hint }) {
  return (
    <div>
      <label style={S.lbl}>{label}</label>
      <div style={{ position: "relative" }}>
        {prefix && <span style={{ position: "absolute", left: 9, top: "50%", transform: "translateY(-50%)", color: "#64748b", fontSize: 12, pointerEvents: "none" }}>{prefix}</span>}
        <input
          type={type} value={value} onChange={e => onChange(e.target.value)}
          placeholder={placeholder} min="0" step="any"
          style={{ ...S.input, paddingLeft: prefix ? 26 : 10 }}
          onFocus={e => (e.target.style.borderColor = "rgba(99,102,241,0.6)")}
          onBlur={e => (e.target.style.borderColor = "rgba(255,255,255,0.1)")}
        />
      </div>
      {hint && <div style={S.hint}>{hint}</div>}
    </div>
  );
}

function Select({ label, value, onChange, options }) {
  return (
    <div>
      <label style={S.lbl}>{label}</label>
      <select value={value} onChange={e => onChange(e.target.value)}
        style={{ ...S.input, cursor: "pointer" }}
        onFocus={e => (e.target.style.borderColor = "rgba(99,102,241,0.6)")}
        onBlur={e => (e.target.style.borderColor = "rgba(255,255,255,0.1)")}
      >
        {options.map(o => <option key={o.v} value={o.v} style={{ background: "#0f172a" }}>{o.l}</option>)}
      </select>
    </div>
  );
}

function SCard({ color, icon, title, children }) {
  return (
    <div style={{ ...S.card, borderLeft: `3px solid ${color}` }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16 }}>
        <div style={{ width: 26, height: 26, borderRadius: 7, background: color + "22", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14 }}>{icon}</div>
        <span style={{ fontWeight: 700, fontSize: 13, color: "#e2e8f0" }}>{title}</span>
      </div>
      {children}
    </div>
  );
}

function KPI({ label, value, sub, accent }) {
  return (
    <div style={{ background: accent ? "rgba(99,102,241,0.08)" : "rgba(255,255,255,0.03)", border: `1px solid ${accent ? "rgba(99,102,241,0.25)" : "rgba(255,255,255,0.07)"}`, borderRadius: 10, padding: "12px 14px" }}>
      <div style={{ fontSize: 10, color: "#64748b", fontWeight: 600, marginBottom: 4, letterSpacing: "0.04em" }}>{label}</div>
      <div style={{ fontSize: 20, fontWeight: 800, color: accent ? "#818cf8" : "#f1f5f9" }}>{value}</div>
      {sub && <div style={{ fontSize: 10, color: "#475569", marginTop: 3 }}>{sub}</div>}
    </div>
  );
}

function FRow({ icon, label, count, rate, rateLabel, bench, cost, costLabel }) {
  let rc = "#64748b";
  if (rate !== undefined && bench) rc = rate >= bench.good ? "#22c55e" : rate >= bench.warn ? "#f59e0b" : "#ef4444";
  return (
    <div style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)", borderLeft: `3px solid ${rc}`, borderRadius: 8, padding: "10px 14px", display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 6 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <span style={{ fontSize: 16 }}>{icon}</span>
        <div>
          <div style={{ fontSize: 10, color: "#64748b", marginBottom: 1 }}>{label}</div>
          <div style={{ fontSize: 18, fontWeight: 800, color: "#f1f5f9" }}>{(+count || 0).toLocaleString("pt-BR")}</div>
        </div>
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        {rate !== undefined && (
          <div style={{ textAlign: "right" }}>
            <div style={{ fontSize: 10, color: "#64748b" }}>{rateLabel}</div>
            <div style={{ fontSize: 14, fontWeight: 700, color: rc }}>{fmt(rate, 1)}%</div>
          </div>
        )}
        {cost > 0 && (
          <div style={{ textAlign: "right" }}>
            <div style={{ fontSize: 9, color: "#475569" }}>{costLabel}</div>
            <div style={{ fontSize: 11, color: "#94a3b8" }}>R$ {fmt(cost)}</div>
          </div>
        )}
      </div>
    </div>
  );
}

function Badge({ status }) {
  const map = { bom: { c: "#22c55e", bg: "rgba(34,197,94,0.08)", b: "rgba(34,197,94,0.25)", l: "Bom" }, atencao: { c: "#f59e0b", bg: "rgba(245,158,11,0.08)", b: "rgba(245,158,11,0.25)", l: "Atenção" }, critico: { c: "#ef4444", bg: "rgba(239,68,68,0.08)", b: "rgba(239,68,68,0.25)", l: "Crítico" } };
  const s = map[status] || map.atencao;
  return <span style={{ background: s.bg, border: `1px solid ${s.b}`, color: s.c, borderRadius: 20, padding: "2px 8px", fontSize: 10, fontWeight: 700 }}>{s.l}</span>;
}

// ─── MAIN APP ─────────────────────────────────────────────────────────────────
const DEFAULTS = { campaign_name: "", creative_type: "Vídeo", price: "", shipping: "", delivery: "", ad_spend: "", cpm: "", ctr: "", add_to_cart: "", checkout_initiated: "", payment_info: "", orders_total: "", orders_paid: "", revenue_total: "", products_sold: "" };

export default function GeniusMetrics() {
  const [v, setV] = useState(DEFAULTS);
  const [type, setType] = useState("single");
  const [page, setPage] = useState("form");
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");
  const [loadMsg, setLoadMsg] = useState("Analisando topo do funil...");

  const set = f => val => setV(p => ({ ...p, [f]: val }));
  const c = calcMetrics(v);
  const confirmRate = +v.orders_total > 0 && +v.orders_paid > 0 ? ((+v.orders_paid / +v.orders_total) * 100).toFixed(1) : null;
  const isValid = v.ad_spend && v.cpm && v.ctr && v.orders_total && v.orders_paid && v.revenue_total;

  useEffect(() => {
    if (page !== "loading") return;
    const msgs = ["Analisando topo do funil...", "Correlacionando métricas...", "Identificando gargalos...", "Gerando plano de ação..."];
    let i = 0;
    const t = setInterval(() => { i = (i + 1) % msgs.length; setLoadMsg(msgs[i]); }, 2000);
    return () => clearInterval(t);
  }, [page]);

  async function analyze() {
    if (!isValid) return;
    setPage("loading"); setError("");
    const inp = { ...v };
    const calc = calcMetrics(inp);
    const prompt = buildPrompt(inp, calc, type);
    try {
      const res = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: [{ role: "user", content: prompt }] }),
      });
      const data = await res.json();
      if (data.error) { setPage("form"); setError("Erro API: " + (data.error.message || JSON.stringify(data.error))); return; }
      if (!res.ok) { setPage("form"); setError("HTTP " + res.status); return; }
      const raw = (data.content || []).map(b => b.text || "").join("").trim();
      if (!raw) { setPage("form"); setError("API retornou vazio"); return; }
      const clean = raw.replace(/^```json\s*/i, "").replace(/\s*```$/i, "").trim();
      let ai;
      try { ai = JSON.parse(clean); }
      catch (e) { setPage("form"); setError("JSON inválido: " + e.message); return; }
      setResult({ inp, calc, ai, type });
      setPage("results");
    } catch (e) {
      setPage("form"); setError("Erro: " + e.message);
    }
  }

  // ── LOADING ──
  if (page === "loading") return (
    <div style={{ minHeight: "100vh", background: "#080c14", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 20, textAlign: "center" }}>
      <div style={{ width: 60, height: 60, background: "linear-gradient(135deg,#6366f1,#4f46e5)", borderRadius: 16, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 26, boxShadow: "0 0 30px rgba(99,102,241,0.5)", animation: "pulse 1.5s ease-in-out infinite" }}>🧠</div>
      <div>
        <div style={{ fontSize: 17, fontWeight: 700, color: "#e2e8f0" }}>IA analisando sua campanha...</div>
        <div style={{ fontSize: 12, color: "#64748b", marginTop: 4 }}>{loadMsg}</div>
      </div>
      <style>{`@keyframes pulse{0%,100%{transform:scale(1)}50%{transform:scale(1.06)}}`}</style>
    </div>
  );

  // ── RESULTS ──
  if (page === "results" && result) {
    const { inp: ri, calc: rc, ai, type: rt } = result;
    const hmap = { excelente: { l: "🚀 Excelente", g: "linear-gradient(135deg,#10b981,#059669)" }, bom: { l: "✅ Bom", g: "linear-gradient(135deg,#3b82f6,#2563eb)" }, atencao: { l: "⚠️ Atenção", g: "linear-gradient(135deg,#f59e0b,#d97706)" }, critico: { l: "🚨 Crítico", g: "linear-gradient(135deg,#ef4444,#dc2626)" } };
    const tmap = { Escalar: { c: "#10b981", i: "↑" }, Manter: { c: "#3b82f6", i: "→" }, Pausar: { c: "#ef4444", i: "⏸" } };
    const smap = { bom: { bg: "rgba(34,197,94,0.08)", b: "rgba(34,197,94,0.25)", c: "#22c55e" }, atencao: { bg: "rgba(245,158,11,0.08)", b: "rgba(245,158,11,0.25)", c: "#f59e0b" }, critico: { bg: "rgba(239,68,68,0.08)", b: "rgba(239,68,68,0.25)", c: "#ef4444" } };
    const h = hmap[ai.saude_campanha] || hmap.atencao;
    const tr = tmap[ai.decisao_trafego?.decisao] || tmap.Manter;

    return (
      <div style={{ minHeight: "100vh", background: "#080c14", color: "#e2e8f0", fontFamily: "'DM Sans',sans-serif" }}>
        <Header />
        <div style={S.main}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20, flexWrap: "wrap", gap: 10 }}>
            <div>
              <div style={{ fontSize: 19, fontWeight: 800, color: "#f1f5f9" }}>{ri.campaign_name || "Análise da Campanha"}</div>
              <div style={{ fontSize: 11, color: "#475569", marginTop: 3 }}>{rt === "catalog" ? "🗂️ Catálogo" : "🎯 Produto Único"} · Meta Ads · {ri.creative_type === "Vídeo" ? "🎬 Vídeo" : "🖼️ Imagem"}</div>
            </div>
            <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
              <span style={{ background: h.g, borderRadius: 20, padding: "4px 14px", fontWeight: 700, fontSize: 12 }}>{h.l}</span>
              <button style={S.btnSec} onClick={() => setPage("form")}>↺ Nova análise</button>
            </div>
          </div>

          <div style={{ ...S.g4, marginBottom: 14 }}>
            <KPI label="ROAS" value={fmt(rc.roas) + "x"} sub={rc.roas >= 2.5 ? "✅ Lucrativo" : rc.roas >= 2 ? "⚠️ Marginal" : "❌ Problemático"} accent />
            <KPI label="CPA" value={"R$ " + fmt(rc.cpa)} sub={"Ticket: R$ " + fmt(rc.ticket)} />
            <KPI label="Fat. vs Gasto" value={"R$ " + fmt(+ri.revenue_total - +ri.ad_spend, 0)} sub="Resultado bruto" />
            <KPI label="Confirmação Pgto" value={fmt(rc.prate, 1) + "%"} sub={ri.orders_paid + " de " + ri.orders_total + " pedidos"} />
          </div>

          <div style={S.card}>
            <div style={S.secTitle}>Funil de Conversão</div>
            {[
              { icon: "👁️", label: "Impressões", count: rc.imp, rate: +ri.ctr, rateLabel: "CTR", bench: { good: 2.5, warn: 1.5 }, cost: rc.cpc, costLabel: "CPC" },
              null,
              { icon: "🖱️", label: "Cliques", count: rc.clicks, rate: rc.atc_rate, rateLabel: "→ ATC", bench: { good: 6, warn: 3 }, cost: rc.clicks > 0 ? +ri.ad_spend / rc.clicks : 0, costLabel: "Custo/Clique" },
              null,
              { icon: "🛒", label: "Adição ao Carrinho", count: ri.add_to_cart, rate: rc.chk_atc, rateLabel: "→ Checkout", bench: { good: 50, warn: 40 } },
              null,
              { icon: "📋", label: "Checkout Iniciado", count: ri.checkout_initiated, rate: rc.pay_chk, rateLabel: "→ Pgto", bench: { good: 60, warn: 40 } },
              null,
              { icon: "💳", label: "Info de Pagamento", count: ri.payment_info, rate: rc.pur_pay, rateLabel: "→ Pedido", bench: { good: 60, warn: 40 } },
              null,
              { icon: "📦", label: "Pedidos Totais", count: ri.orders_total, rate: rc.prate, rateLabel: "→ Pagos", bench: { good: 80, warn: 65 }, cost: +ri.orders_total > 0 ? +ri.revenue_total / +ri.orders_total : 0, costLabel: "Ticket médio" },
              null,
              { icon: "✅", label: "Pedidos Pagos", count: ri.orders_paid, cost: rc.cpa, costLabel: "CPA" },
            ].map((row, i) =>
              row === null
                ? <div key={i} style={{ textAlign: "center", color: "#334155", padding: "2px 0" }}>↓</div>
                : <FRow key={i} {...row} />
            )}
          </div>

          <div style={S.secTitle}>Análise da IA</div>

          <div style={{ ...S.card, borderLeft: "3px solid #6366f1", marginBottom: 12 }}>
            <div style={{ display: "flex", gap: 8, marginBottom: 8 }}><span>⚡</span><span style={{ fontWeight: 700, fontSize: 13 }}>Diagnóstico Geral</span></div>
            <p style={{ fontSize: 13, color: "#cbd5e1", lineHeight: 1.6 }}>{ai.diagnostico_geral}</p>
          </div>

          {ai.gargalo_principal && (
            <div style={{ background: "rgba(239,68,68,0.06)", border: "1px solid rgba(239,68,68,0.2)", borderRadius: 12, padding: "16px 18px", marginBottom: 12 }}>
              <div style={{ display: "flex", gap: 8, marginBottom: 8, fontWeight: 700, fontSize: 13, color: "#fca5a5" }}>🚨 Gargalo Principal: {ai.gargalo_principal.etapa}</div>
              <div style={{ display: "flex", gap: 8, marginBottom: 8, flexWrap: "wrap" }}>
                <span style={{ background: "rgba(239,68,68,0.12)", border: "1px solid rgba(239,68,68,0.25)", borderRadius: 7, padding: "3px 10px", fontSize: 11, color: "#f87171" }}>Taxa atual: {ai.gargalo_principal.taxa_atual}</span>
                <span style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 7, padding: "3px 10px", fontSize: 11, color: "#94a3b8" }}>Benchmark: {ai.gargalo_principal.benchmark}</span>
              </div>
              <p style={{ fontSize: 12, color: "#fca5a5", opacity: 0.85, lineHeight: 1.55 }}>{ai.gargalo_principal.impacto}</p>
            </div>
          )}

          {ai.analise_por_etapa?.length > 0 && (
            <div style={{ marginBottom: 14 }}>
              <div style={S.secTitle}>Análise por Etapa</div>
              {ai.analise_por_etapa.map((s, i) => {
                const sm = smap[s.status] || smap.atencao;
                return (
                  <div key={i} style={{ background: sm.bg, border: `1px solid ${sm.b}`, borderRadius: 10, padding: "14px 16px", marginBottom: 8 }}>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 6 }}>
                      <span style={{ fontWeight: 700, fontSize: 12, color: "#e2e8f0" }}>{s.etapa}</span>
                      <Badge status={s.status} />
                    </div>
                    <p style={{ fontSize: 12, color: "#94a3b8", lineHeight: 1.55, marginBottom: 8 }}>{s.diagnostico}</p>
                    {(s.recomendacoes || []).map((r, j) => (
                      <div key={j} style={{ display: "flex", gap: 6, marginBottom: 3, fontSize: 11, color: "#64748b", lineHeight: 1.45 }}>
                        <span style={{ color: sm.c, flexShrink: 0 }}>›</span>{r}
                      </div>
                    ))}
                  </div>
                );
              })}
            </div>
          )}

          {ai.plano_de_acao?.length > 0 && (
            <div style={{ marginBottom: 14 }}>
              <div style={S.secTitle}>Plano de Ação Priorizado</div>
              {ai.plano_de_acao.map((a, i) => (
                <div key={i} style={{ display: "flex", gap: 12, padding: "14px 16px", background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 10, marginBottom: 8 }}>
                  <div style={{ width: 28, height: 28, borderRadius: "50%", background: "linear-gradient(135deg,#6366f1,#4f46e5)", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 800, fontSize: 13, flexShrink: 0, boxShadow: "0 2px 8px rgba(99,102,241,0.3)" }}>{a.prioridade}</div>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 3, flexWrap: "wrap" }}>
                      <span style={{ fontWeight: 700, fontSize: 13, color: "#e2e8f0" }}>{a.titulo}</span>
                      <span style={{ fontSize: 10, color: "#475569", background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.06)", padding: "1px 7px", borderRadius: 20 }}>{a.prazo}</span>
                    </div>
                    <p style={{ fontSize: 12, color: "#94a3b8", lineHeight: 1.55, margin: "3px 0 6px" }}>{a.acao_detalhada}</p>
                    {a.impacto_esperado && <div style={{ background: "rgba(99,102,241,0.08)", border: "1px solid rgba(99,102,241,0.15)", borderRadius: 7, padding: "5px 10px", fontSize: 11, color: "#818cf8" }}><strong>Impacto: </strong>{a.impacto_esperado}</div>}
                  </div>
                </div>
              ))}
            </div>
          )}

          {ai.decisao_trafego && (
            <div style={{ background: tr.c + "0d", border: `1px solid ${tr.c}33`, borderRadius: 12, padding: "16px 18px", marginBottom: 14 }}>
              <div style={{ fontSize: 16, fontWeight: 800, color: tr.c, marginBottom: 10 }}>{tr.i} Decisão de Tráfego: {ai.decisao_trafego.decisao}</div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                {[["Justificativa", ai.decisao_trafego.justificativa], ["Observação", ai.decisao_trafego.observacao_tempo], ["Orçamento", ai.decisao_trafego.ajuste_orcamento]].filter(x => x[1]).map(([k, val]) => (
                  <div key={k} style={{ background: "rgba(255,255,255,0.03)", borderRadius: 8, padding: "8px 12px" }}>
                    <div style={{ fontSize: 10, color: "#64748b", marginBottom: 2 }}>{k}</div>
                    <div style={{ fontSize: 12, color: "#cbd5e1", lineHeight: 1.45 }}>{val}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {ai.insights_adicionais && (
            <div style={{ ...S.card, borderLeft: "3px solid #f59e0b" }}>
              <div style={{ display: "flex", gap: 8, marginBottom: 6 }}><span>💡</span><span style={{ fontWeight: 700, fontSize: 13 }}>Insights Adicionais</span></div>
              <p style={{ fontSize: 12, color: "#94a3b8", lineHeight: 1.6 }}>{ai.insights_adicionais}</p>
            </div>
          )}
        </div>
      </div>
    );
  }

  // ── FORM ──
  return (
    <div style={{ minHeight: "100vh", background: "#080c14", color: "#e2e8f0", fontFamily: "'DM Sans',sans-serif" }}>
      <Header />
      <div style={S.main}>
        <div style={{ textAlign: "center", marginBottom: 24 }}>
          <h1 style={{ fontSize: 24, fontWeight: 800, color: "#f1f5f9", letterSpacing: "-0.02em", marginBottom: 6 }}>Analise seu Funil com IA</h1>
          <p style={{ fontSize: 13, color: "#475569" }}>Preencha as métricas e receba diagnóstico completo com plano de ação</p>
        </div>

        {error && <div style={{ background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.3)", borderRadius: 10, padding: "10px 14px", marginBottom: 14, fontSize: 12, color: "#f87171", lineHeight: 1.5 }}>⚠️ {error}</div>}

        <div style={{ ...S.card, padding: "14px 18px", marginBottom: 14 }}>
          <div style={S.secTitle}>Tipo de Campanha</div>
          <div style={{ display: "flex", gap: 10 }}>
            {[{ val: "single", l: "🎯 Produto Único", s: "Uma oferta, uma LP" }, { val: "catalog", l: "🗂️ Catálogo", s: "Múltiplos produtos / SKUs" }].map(o => (
              <button key={o.val} onClick={() => setType(o.val)} style={{ flex: 1, padding: "10px 14px", borderRadius: 10, cursor: "pointer", fontWeight: 700, fontSize: 12, textAlign: "left", fontFamily: "inherit", border: `2px solid ${type === o.val ? "rgba(99,102,241,0.5)" : "rgba(255,255,255,0.07)"}`, background: type === o.val ? "rgba(99,102,241,0.15)" : "rgba(255,255,255,0.03)", color: type === o.val ? "#818cf8" : "#64748b" }}>
                <div>{o.l}</div>
                <div style={{ fontWeight: 400, fontSize: 10, marginTop: 2, opacity: 0.7 }}>{o.s}</div>
              </button>
            ))}
          </div>
        </div>

        <SCard color="#6366f1" icon="⚙️" title="Informações da Campanha">
          <div style={{ marginBottom: 12 }}>
            <label style={S.lbl}>Nome da Campanha (opcional)</label>
            <input type="text" value={v.campaign_name} onChange={e => set("campaign_name")(e.target.value)} placeholder="Ex: Produto X — Conversão — Broad" style={S.input} onFocus={e => (e.target.style.borderColor = "rgba(99,102,241,0.6)")} onBlur={e => (e.target.style.borderColor = "rgba(255,255,255,0.1)")} />
          </div>
          <div style={S.g3}>
            <Select label="Tipo de Criativo" value={v.creative_type} onChange={set("creative_type")} options={[{ v: "Vídeo", l: "🎬 Vídeo" }, { v: "Imagem", l: "🖼️ Imagem" }]} />
            <Field label="Preço (R$)" value={v.price} onChange={set("price")} placeholder="99.90" prefix="R$" />
            <Field label="Frete" value={v.shipping} onChange={set("shipping")} placeholder="Grátis / R$15" type="text" />
          </div>
        </SCard>

        <SCard color="#22c55e" icon="💰" title="Financeiro">
          <div style={S.g3}>
            <Field label="Valor Gasto (R$) *" value={v.ad_spend} onChange={set("ad_spend")} placeholder="0.00" prefix="R$" hint="Total em anúncios" />
            <Field label="Faturamento Total (R$) *" value={v.revenue_total} onChange={set("revenue_total")} placeholder="0.00" prefix="R$" hint="Todos os pedidos (pagos + não pagos)" />
            <div />
            <Field label="Nº Pedidos Total *" value={v.orders_total} onChange={set("orders_total")} placeholder="0" hint="Pagos + não pagos" />
            <Field label="Nº Pedidos Pagos *" value={v.orders_paid} onChange={set("orders_paid")} placeholder="0" hint="Só confirmados" />
            {confirmRate ? (
              <div style={{ display: "flex", flexDirection: "column", justifyContent: "flex-end" }}>
                <div style={{ background: "rgba(34,197,94,0.08)", border: "1px solid rgba(34,197,94,0.2)", borderRadius: 8, padding: "8px 12px" }}>
                  <div style={{ fontSize: 10, color: "#16a34a" }}>Taxa de confirmação</div>
                  <div style={{ fontSize: 18, fontWeight: 800, color: "#4ade80" }}>{confirmRate}%</div>
                </div>
              </div>
            ) : <div />}
          </div>
        </SCard>

        <SCard color="#8b5cf6" icon="📡" title="Topo do Funil — Anúncio">
          <div style={S.g3}>
            <Field label="CPM (R$) *" value={v.cpm} onChange={set("cpm")} placeholder="0.00" prefix="R$" hint="Custo por 1.000 impressões" />
            <Field label="CTR (%) *" value={v.ctr} onChange={set("ctr")} placeholder="2.5" hint="Taxa de cliques no link" />
            <div style={{ display: "flex", flexDirection: "column", justifyContent: "flex-end" }}>
              <div style={{ background: "rgba(139,92,246,0.08)", border: "1px solid rgba(139,92,246,0.2)", borderRadius: 8, padding: "8px 12px" }}>
                <div style={{ fontSize: 10, color: "#7c3aed" }}>CPC calculado</div>
                <div style={{ fontSize: 18, fontWeight: 800, color: "#a78bfa" }}>{v.ad_spend && v.cpm && v.ctr ? "R$ " + fmt(c.cpc) : "—"}</div>
              </div>
            </div>
          </div>
        </SCard>

        <SCard color="#f59e0b" icon="🛒" title="Meio do Funil">
          <div style={S.g3}>
            <Field label="Adição ao Carrinho" value={v.add_to_cart} onChange={set("add_to_cart")} placeholder="0" hint="Qtd. ATC" />
            <Field label="Checkout Iniciado" value={v.checkout_initiated} onChange={set("checkout_initiated")} placeholder="0" hint="Qtd. checkout" />
            <Field label="Info de Pagamento" value={v.payment_info} onChange={set("payment_info")} placeholder="0" hint="Qtd. info pgto" />
          </div>
        </SCard>

        <SCard color="#10b981" icon="✅" title="Fundo do Funil — Conversão">
          <div style={type === "catalog" ? S.g3 : S.g2}>
            <Field label="Compras Realizadas *" value={v.orders_total} onChange={set("orders_total")} placeholder="0" hint="Total de pedidos" />
            <Field label="Compras Pagas *" value={v.orders_paid} onChange={set("orders_paid")} placeholder="0" hint="Pagamentos confirmados" />
            {type === "catalog" && <Field label="Produtos vendidos (itens)" value={v.products_sold} onChange={set("products_sold")} placeholder="0" hint="Itens no catálogo" />}
          </div>
        </SCard>

        <button style={{ ...S.btn, opacity: isValid ? 1 : 0.4, cursor: isValid ? "pointer" : "not-allowed" }} disabled={!isValid} onClick={analyze}>
          🔍 Analisar Funil com IA
        </button>
        <p style={{ textAlign: "center", fontSize: 10, color: "#334155", marginTop: 8 }}>* Campos obrigatórios</p>
      </div>
    </div>
  );
}
