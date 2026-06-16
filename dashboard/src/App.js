import React, { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { FixedSizeList } from "react-window";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ReferenceLine, ResponsiveContainer, Cell, PieChart, Pie,
} from "recharts";
import {
  TrendingUp, TrendingDown, Minus, Building2, BarChart2,
  FileDown, Search, ChevronUp, ChevronDown, ChevronsUpDown,
  Activity, Layers, Target, RefreshCw, X,
} from "lucide-react";

// ─── SGH Teal Palette ─────────────────────────────────────────────────────────
const C = {
  canvas:    "#F4F7F6",
  teal:      "#005F73",
  tealMid:   "#007A8C",
  tealLight: "#0A9396",
  mint:      "#94D2BD",
  mintGold:  "#E9D8A6",
  border:    "#E2E8F0",
  white:     "#FFFFFF",
  slate:     "#475569",
  muted:     "#94A3B8",
  // status
  green:     "#059669",  greenLt: "#D1FAE5",
  amber:     "#B45309",  amberLt: "#FEF3C7",
  red:       "#B91C1C",  redLt:   "#FEE2E2",
  violet:    "#6D28D9",  violetLt:"#EDE9FE",
};
const PIE_FILLS = [C.tealLight, C.amber, C.red];

// ─── Status helpers ───────────────────────────────────────────────────────────
const statusOf = (v) => v == null ? null : Math.abs(v) <= 5 ? "aligned" : v > 5 ? "above" : "below";
const fmt      = (n, d = 2) => n == null ? "—" : Number(n).toFixed(d);
const varFmt   = (v) => v == null ? "—" : `${v >= 0 ? "+" : ""}${Number(v).toFixed(1)}%`;

const STATUS = {
  aligned: { bg: C.greenLt,  text: C.green, border: "#6EE7B7", label: "Aligned", icon: Minus,       fill: C.tealLight },
  above:   { bg: C.amberLt,  text: C.amber, border: "#FCD34D", label: "Above",   icon: TrendingUp,   fill: C.amber },
  below:   { bg: C.redLt,    text: C.red,   border: "#FCA5A5", label: "Below",   icon: TrendingDown, fill: C.red },
};

// ─── MultiSelect ──────────────────────────────────────────────────────────────
function MultiSelect({ label, options, selected, onChange, width = 180 }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  useEffect(() => {
    const close = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, []);
  const toggle = (opt) =>
    onChange(selected.includes(opt) ? selected.filter((s) => s !== opt) : [...selected, opt]);

  return (
    <div ref={ref} style={{ position: "relative" }}>
      <button onClick={() => setOpen((o) => !o)} style={{
        display: "flex", alignItems: "center", gap: 6, padding: "7px 12px",
        borderRadius: 8, border: `1.5px solid ${open ? C.tealLight : C.border}`,
        background: C.white, cursor: "pointer", fontSize: 12, fontWeight: 600,
        color: C.teal, whiteSpace: "nowrap", outline: "none",
        boxShadow: open ? `0 0 0 3px ${C.tealLight}22` : "none", transition: "all .15s",
      }}>
        {selected.length === 0 ? `All ${label}` : `${selected.length} ${label}`}
        <ChevronDown size={12} style={{ opacity: .5, transform: open ? "rotate(180deg)" : "none", transition: "transform .2s" }} />
      </button>
      {open && (
        <div style={{
          position: "absolute", top: "calc(100% + 4px)", left: 0, zIndex: 500,
          background: C.white, border: `1px solid ${C.border}`, borderRadius: 10,
          boxShadow: "0 8px 28px rgba(0,95,115,.15)", minWidth: width, maxHeight: 260, overflowY: "auto",
        }}>
          {selected.length > 0 && (
            <div style={{ padding: "7px 12px 5px", borderBottom: `1px solid ${C.border}` }}>
              <button onClick={() => onChange([])} style={{
                border: "none", background: "none", cursor: "pointer",
                fontSize: 11, color: C.muted, fontWeight: 600,
                display: "flex", alignItems: "center", gap: 4,
              }}>
                <X size={10} /> Clear all
              </button>
            </div>
          )}
          {options.map((opt) => (
            <label key={opt} style={{
              display: "flex", alignItems: "center", gap: 8, padding: "7px 12px",
              cursor: "pointer", fontSize: 12, color: C.teal,
              background: selected.includes(opt) ? C.canvas : "transparent", transition: "background .1s",
            }}>
              <input type="checkbox" checked={selected.includes(opt)} onChange={() => toggle(opt)}
                style={{ accentColor: C.tealLight, width: 13, height: 13 }} />
              <span style={{ fontWeight: selected.includes(opt) ? 700 : 400 }}>{opt}</span>
            </label>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Atoms ────────────────────────────────────────────────────────────────────
function StatusBadge({ value }) {
  if (value == null) return <span style={{ color: C.muted, fontSize: 11 }}>—</span>;
  const s = STATUS[statusOf(value)]; const Icon = s.icon;
  return (
    <span style={{
      display: "inline-flex", alignItems: "center", gap: 3,
      background: s.bg, color: s.text, border: `1px solid ${s.border}`,
      padding: "2px 8px", borderRadius: 20, fontSize: 10, fontWeight: 700, whiteSpace: "nowrap",
    }}>
      <Icon size={9} strokeWidth={2.5} /> {s.label} ({varFmt(value)})
    </span>
  );
}

function AlignBar({ aligned, above, below, h = 7 }) {
  const t = (aligned + above + below) || 1;
  return (
    <div style={{ display: "flex", height: h, borderRadius: h, overflow: "hidden", background: C.border }}>
      <div style={{ width: `${(aligned/t)*100}%`, background: `linear-gradient(90deg,${C.tealLight},${C.mint})`, transition: "width .4s" }} />
      <div style={{ width: `${(above/t)*100}%`,   background: `linear-gradient(90deg,${C.amber},#FBBF24)`, transition: "width .4s" }} />
      <div style={{ width: `${(below/t)*100}%`,   background: `linear-gradient(90deg,${C.red},#F87171)`,   transition: "width .4s" }} />
    </div>
  );
}

function SortIcon({ active, dir }) {
  if (!active) return <ChevronsUpDown size={11} style={{ opacity: .3 }} />;
  return dir === "asc"
    ? <ChevronUp size={11} style={{ color: C.mint }} />
    : <ChevronDown size={11} style={{ color: C.mint }} />;
}

function KpiCard({ icon: Icon, label, value, sub, accent, tintColor }) {
  return (
    <div style={{
      borderRadius: 14, padding: "14px 18px", flexShrink: 0,
      background: accent ? `linear-gradient(135deg,${C.teal},${C.tealMid})` : C.white,
      border: accent ? "none" : `1px solid ${C.border}`,
      boxShadow: accent ? "0 6px 20px rgba(0,95,115,.28)" : "0 1px 4px rgba(0,0,0,.05)",
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 6 }}>
        {Icon && (
          <div style={{ width: 24, height: 24, borderRadius: 7,
            background: accent ? "rgba(255,255,255,.15)" : `${C.teal}14`,
            display: "flex", alignItems: "center", justifyContent: "center" }}>
            <Icon size={12} color={accent ? C.mint : C.teal} strokeWidth={2.5} />
          </div>
        )}
        <span style={{ fontSize: 11, fontWeight: 600, color: accent ? `${C.mint}99` : C.muted }}>{label}</span>
      </div>
      <div style={{ fontSize: 24, fontWeight: 900, lineHeight: 1, color: accent ? C.white : (tintColor || C.teal) }}>{value}</div>
      {sub && <div style={{ fontSize: 11, marginTop: 3, color: accent ? "rgba(255,255,255,.5)" : C.muted }}>{sub}</div>}
    </div>
  );
}

// ─── Navigation ───────────────────────────────────────────────────────────────
const VIEWS = [
  { id: "Summary",        icon: BarChart2 },
  { id: "Company Detail", icon: Building2 },
  { id: "Full Table",     icon: Layers    },
  { id: "CPT Deep Dive",  icon: Target    },
];

function Nav({ view, setView, generatedAt, refCount, plCount }) {
  return (
    <div style={{
      background: C.teal, padding: "0 28px", display: "flex", alignItems: "center",
      position: "sticky", top: 0, zIndex: 300,
      boxShadow: "0 4px 20px rgba(0,0,0,.3)", borderBottom: `3px solid ${C.tealLight}`,
    }}>
      {/* SGH Logo */}
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginRight: 28, padding: "8px 0", flexShrink: 0 }}>
        <img
          src={process.env.PUBLIC_URL + "/sgh.png"}
          alt="Saudi German Hospital"
          style={{ height: 44, width: "auto", objectFit: "contain", filter: "brightness(0) invert(1)" }}
          onError={(e) => { e.target.style.display = "none"; }}
        />
        <div>
          <div style={{ color: C.white, fontWeight: 800, fontSize: 13, lineHeight: 1.25 }}>Saudi German Hospital</div>
          <div style={{ color: C.mint, fontSize: 10, fontWeight: 600, letterSpacing: .4 }}>Pricelist Benchmark · UAE Group</div>
        </div>
      </div>

      {/* Tabs */}
      {VIEWS.map(({ id, icon: Icon }) => (
        <button key={id} onClick={() => setView(id)} style={{
          padding: "18px 16px", border: "none", cursor: "pointer",
          fontSize: 12, fontWeight: 700, background: "transparent",
          display: "flex", alignItems: "center", gap: 6, outline: "none",
          color: view === id ? C.mint : "rgba(255,255,255,.5)",
          borderBottom: view === id ? `3px solid ${C.mint}` : "3px solid transparent",
          marginBottom: "-3px", transition: "color .15s",
        }}>
          <Icon size={13} strokeWidth={view === id ? 2.5 : 1.8} />
          {id}
        </button>
      ))}

      {/* Meta */}
      <div style={{
        marginLeft: "auto", display: "flex", alignItems: "center", gap: 6,
        background: "rgba(255,255,255,.1)", borderRadius: 20, padding: "5px 12px",
        border: "1px solid rgba(255,255,255,.12)",
      }}>
        <RefreshCw size={10} color={C.muted} />
        <span style={{ fontSize: 11, color: C.muted }}>{plCount} networks · {refCount?.toLocaleString()} codes</span>
        {generatedAt && (
          <span style={{ fontSize: 11, color: C.mint, fontWeight: 700 }}>
            · {new Date(generatedAt).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })}
          </span>
        )}
      </div>
    </div>
  );
}

// ─── SUMMARY VIEW ─────────────────────────────────────────────────────────────
function SummaryView({ data, onSelectCompany }) {
  const g = useMemo(() => {
    let al = 0, ab = 0, be = 0;
    data.companies.forEach((co) => co.networks.forEach((n) => { al += n.aligned; ab += n.above; be += n.below; }));
    const t = al + ab + be || 1;
    return { aligned: al, above: ab, below: be, total: t, pct: ((al / t) * 100).toFixed(1) };
  }, [data]);

  const donutData = [
    { name: "Aligned", value: g.aligned },
    { name: "Above",   value: g.above   },
    { name: "Below",   value: g.below   },
  ];

  return (
    <div style={{ padding: "24px 28px" }}>
      {/* KPI row */}
      <div style={{ display: "flex", flexWrap: "wrap", gap: 12, marginBottom: 28, alignItems: "stretch" }}>
        <KpiCard icon={Building2} label="Companies"         value={data.company_count}                                        accent />
        <KpiCard icon={Layers}    label="Pricelists"        value={data.pricelist_count}                                       accent />
        <KpiCard icon={Activity}  label="Reference Codes"   value={data.reference_count.toLocaleString()}                     accent />
        <KpiCard icon={BarChart2} label="Codes Benchmarked" value={Object.keys(data.code_stats || {}).length.toLocaleString()} />
        <KpiCard icon={Target}    label="Global Alignment"  value={`${g.pct}%`}
          tintColor={parseFloat(g.pct) >= 30 ? C.green : C.red} />

        {/* Donut — CSS overlay so label is always centred */}
        <div style={{
          display: "flex", alignItems: "center", gap: 16,
          background: C.white, borderRadius: 14, border: `1px solid ${C.border}`,
          padding: "12px 20px", boxShadow: "0 1px 4px rgba(0,0,0,.05)", flex: 1, minWidth: 240,
        }}>
          <div style={{ position: "relative", width: 120, height: 120, flexShrink: 0 }}>
            <PieChart width={120} height={120}>
              <Pie data={donutData} cx={60} cy={60} innerRadius={37} outerRadius={54}
                paddingAngle={2} dataKey="value" startAngle={90} endAngle={-270}>
                {donutData.map((_, i) => <Cell key={i} fill={PIE_FILLS[i]} />)}
              </Pie>
            </PieChart>
            {/* Absolute overlay — perfectly centred, no SVG text positioning issues */}
            <div style={{
              position: "absolute", inset: 0, display: "flex",
              flexDirection: "column", alignItems: "center", justifyContent: "center",
              pointerEvents: "none",
            }}>
              <div style={{ fontSize: 21, fontWeight: 900, color: C.teal, lineHeight: 1 }}>{g.pct}%</div>
              <div style={{ fontSize: 9, fontWeight: 700, color: C.muted, textTransform: "uppercase", letterSpacing: .5, marginTop: 2 }}>Aligned</div>
            </div>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 7 }}>
            {donutData.map((d, i) => (
              <div key={d.name} style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <div style={{ width: 10, height: 10, borderRadius: 3, background: PIE_FILLS[i], flexShrink: 0 }} />
                <span style={{ fontSize: 11, color: C.slate, flex: 1 }}>{d.name}</span>
                <span style={{ fontSize: 11, fontWeight: 800, color: C.teal }}>{d.value.toLocaleString()}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Section header */}
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16 }}>
        <div style={{ width: 4, height: 20, borderRadius: 4, background: `linear-gradient(180deg,${C.tealLight},${C.teal})` }} />
        <h2 style={{ fontSize: 15, fontWeight: 800, color: C.teal, margin: 0 }}>Company Scorecards</h2>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(340px, 1fr))", gap: 14 }}>
        {data.companies.map((co) => {
          const tot = co.networks.reduce((s, n) => s + n.aligned + n.above + n.below, 0) || 1;
          const al  = co.networks.reduce((s, n) => s + n.aligned, 0);
          const pct = ((al / tot) * 100).toFixed(1);
          const accentCol = parseFloat(pct) >= 50 ? C.tealLight : parseFloat(pct) >= 20 ? C.amber : C.red;
          return (
            <div key={co.company}
              onClick={() => onSelectCompany(co.company)}
              style={{
                background: C.white, borderRadius: 14, border: `1px solid ${C.border}`,
                borderTop: `4px solid ${accentCol}`, boxShadow: "0 1px 4px rgba(0,0,0,.06)",
                cursor: "pointer", overflow: "hidden", transition: "all .18s",
              }}
              onMouseEnter={(e) => { e.currentTarget.style.boxShadow = "0 10px 28px rgba(0,95,115,.14)"; e.currentTarget.style.transform = "translateY(-2px)"; }}
              onMouseLeave={(e) => { e.currentTarget.style.boxShadow = "0 1px 4px rgba(0,0,0,.06)"; e.currentTarget.style.transform = ""; }}
            >
              <div style={{ padding: "14px 18px 12px", borderBottom: `1px solid ${C.border}`,
                display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ fontWeight: 800, fontSize: 16, color: C.teal }}>{co.company}</span>
                <div style={{ textAlign: "right" }}>
                  <div style={{ fontSize: 24, fontWeight: 900, color: accentCol, lineHeight: 1 }}>{pct}%</div>
                  <div style={{ fontSize: 9, color: C.muted, marginTop: 2 }}>overall aligned</div>
                </div>
              </div>
              <div style={{ padding: "12px 18px 14px" }}>
                {co.networks.map((net) => (
                  <div key={net.network} style={{ marginBottom: 9 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 3 }}>
                      <span style={{ fontSize: 11, fontWeight: 600, color: C.tealMid,
                        overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: "60%" }}>
                        {net.network}
                      </span>
                      <span style={{ fontSize: 10, fontFamily: "monospace" }}>
                        <span style={{ color: C.tealLight, fontWeight: 700 }}>{net.aligned}</span>
                        <span style={{ color: C.muted }}>/</span>
                        <span style={{ color: C.amber, fontWeight: 700 }}>{net.above}</span>
                        <span style={{ color: C.muted }}>/</span>
                        <span style={{ color: C.red, fontWeight: 700 }}>{net.below}</span>
                      </span>
                    </div>
                    <AlignBar aligned={net.aligned} above={net.above} below={net.below} h={5} />
                    <div style={{ display: "flex", justifyContent: "space-between", marginTop: 2, fontSize: 10, color: C.muted }}>
                      <span>{net.total_codes.toLocaleString()} codes</span>
                      <span style={{ fontWeight: 600 }}>{varFmt(net.avg_variance_pct)}</span>
                    </div>
                  </div>
                ))}
                <div style={{ marginTop: 8, paddingTop: 8, borderTop: `1px dashed ${C.border}`,
                  fontSize: 11, color: C.tealLight, fontWeight: 700, display: "flex", alignItems: "center", gap: 4 }}>
                  View details <TrendingUp size={10} />
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── COMPANY DETAIL VIEW ──────────────────────────────────────────────────────
function CompanyDetailView({ data, selectedCompany, onSelectCompany }) {
  const [activeNet, setActiveNet] = useState(0);
  const [search,    setSearch]    = useState("");
  const [sortKey,   setSortKey]   = useState("varPct");
  const [sortDir,   setSortDir]   = useState("desc");

  const company = useMemo(
    () => data.companies.find((c) => c.company === selectedCompany) || data.companies[0],
    [data, selectedCompany]
  );
  useEffect(() => { setActiveNet(0); setSearch(""); }, [company]);

  const net = useMemo(
    () => (company.networks[activeNet] || {}),
    [company, activeNet]
  );

  const rows = useMemo(() => {
    const ref = data.reference;
    return Object.entries(net.rates || {})
      .filter(([cpt]) => !search ||
        cpt.includes(search) ||
        (ref[cpt]?.description || "").toLowerCase().includes(search.toLowerCase()))
      .map(([cpt, price]) => {
        const rp = ref[cpt]?.price;
        const vp = rp ? ((price - rp) / rp) * 100 : null;
        const st = data.code_stats?.[cpt];
        return { cpt, price, refPrice: rp, varPct: vp,
          desc: ref[cpt]?.description || "", iqrOptimal: st?.iqr_optimal, status: statusOf(vp) };
      })
      .sort((a, b) => {
        const av = a[sortKey] ?? (sortDir === "asc" ? Infinity : -Infinity);
        const bv = b[sortKey] ?? (sortDir === "asc" ? Infinity : -Infinity);
        return sortDir === "asc" ? (av > bv ? 1 : -1) : (av < bv ? 1 : -1);
      });
  }, [net, data, search, sortKey, sortDir]);

  const toggleSort = (k) =>
    sortKey === k ? setSortDir((d) => d === "asc" ? "desc" : "asc") : (setSortKey(k), setSortDir("desc"));

  const TH = ({ label, k, w, align = "left" }) => (
    <div onClick={() => toggleSort(k)} style={{
      width: w, padding: "10px 8px", flexShrink: 0, cursor: "pointer",
      textAlign: align, userSelect: "none",
      display: "flex", alignItems: "center", gap: 3,
      justifyContent: align === "right" ? "flex-end" : "flex-start",
      color: sortKey === k ? C.mint : "rgba(255,255,255,.55)",
      fontSize: 11, fontWeight: 700,
    }}>
      {label} <SortIcon active={sortKey === k} dir={sortDir} />
    </div>
  );

  const ROW_H = 44;
  const Row = useCallback(({ index, style }) => {
    const r  = rows[index];
    const st = r.status ? STATUS[r.status] : null;
    return (
      <div style={{
        ...style, display: "flex", alignItems: "center", fontSize: 12,
        borderBottom: `1px solid ${C.border}`,
        background: st ? `${st.bg}66` : (index % 2 === 0 ? C.white : C.canvas),
      }}>
        <div style={{ width: 90, padding: "0 8px", fontFamily: "monospace", fontWeight: 700, color: C.teal, flexShrink: 0, fontSize: 11 }}>{r.cpt}</div>
        <div style={{ flex: 1, padding: "0 8px", color: C.slate, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{r.desc}</div>
        <div style={{ width: 90, padding: "0 8px", textAlign: "right", flexShrink: 0, color: C.muted, fontSize: 11 }}>{r.refPrice != null ? fmt(r.refPrice) : "—"}</div>
        <div style={{ width: 90, padding: "0 8px", textAlign: "right", fontWeight: 800, flexShrink: 0, color: C.teal }}>{fmt(r.price)}</div>
        <div style={{ width: 90, padding: "0 8px", textAlign: "right", flexShrink: 0, color: C.violet, fontWeight: 600 }}>{r.iqrOptimal != null ? fmt(r.iqrOptimal) : "—"}</div>
        <div style={{ width: 176, padding: "0 8px", flexShrink: 0 }}>
          <StatusBadge value={r.varPct != null ? parseFloat(r.varPct.toFixed(1)) : null} />
        </div>
      </div>
    );
  }, [rows]);

  return (
    <div style={{ padding: "24px 28px" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14, flexWrap: "wrap" }}>
        <select value={company.company} onChange={(e) => onSelectCompany(e.target.value)} style={{
          padding: "8px 14px", borderRadius: 8, border: `1.5px solid ${C.border}`,
          fontSize: 14, fontWeight: 800, background: C.white, color: C.teal, outline: "none", cursor: "pointer",
        }}>
          {data.companies.map((c) => <option key={c.company} value={c.company}>{c.company}</option>)}
        </select>
        <div style={{ display: "flex", alignItems: "center", gap: 7, background: C.white,
          border: `1.5px solid ${C.border}`, borderRadius: 8, padding: "0 12px", flex: 1, maxWidth: 320 }}>
          <Search size={13} color={C.muted} />
          <input placeholder="Search CPT code or keyword…" value={search}
            onChange={(e) => setSearch(e.target.value)} style={{
              border: "none", outline: "none", fontSize: 13, flex: 1, padding: "8px 0",
              background: "transparent", color: C.slate,
            }} />
        </div>
        <div style={{ marginLeft: "auto", background: C.teal, borderRadius: 8,
          padding: "8px 14px", fontSize: 12, fontWeight: 700, color: C.white,
          display: "flex", alignItems: "center", gap: 6 }}>
          <BarChart2 size={12} /> {rows.length.toLocaleString()} codes
        </div>
      </div>

      {/* Network tabs */}
      <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 14 }}>
        {company.networks.map((n, i) => (
          <button key={n.network} onClick={() => setActiveNet(i)} style={{
            padding: "6px 14px", borderRadius: 20, cursor: "pointer", fontSize: 11, fontWeight: 700,
            border: `1.5px solid ${activeNet === i ? C.tealLight : C.border}`,
            background: activeNet === i ? C.teal : C.white,
            color: activeNet === i ? C.mint : C.slate, transition: "all .15s",
            boxShadow: activeNet === i ? "0 2px 8px rgba(0,95,115,.2)" : "none",
          }}>{n.network}</button>
        ))}
      </div>

      {/* Stat pills */}
      {net.align_pct != null && (
        <div style={{ display: "flex", gap: 10, marginBottom: 14, flexWrap: "wrap", alignItems: "center" }}>
          {[
            { l: "Aligned", v: net.aligned?.toLocaleString(),  col: C.tealLight, bg: `${C.tealLight}18`, I: Minus },
            { l: "Above",   v: net.above?.toLocaleString(),    col: C.amber,     bg: C.amberLt,         I: TrendingUp },
            { l: "Below",   v: net.below?.toLocaleString(),    col: C.red,       bg: C.redLt,           I: TrendingDown },
            { l: "Align %", v: `${net.align_pct}%`,            col: C.teal,      bg: C.white },
            { l: "Avg Var", v: varFmt(net.avg_variance_pct),   col: C.slate,     bg: C.white },
          ].map((s) => {
            const I = s.I;
            return (
              <div key={s.l} style={{ background: s.bg, borderRadius: 10, padding: "8px 14px",
                border: `1px solid ${C.border}`, display: "flex", alignItems: "center", gap: 8 }}>
                {I && <div style={{ width: 22, height: 22, borderRadius: 7,
                  background: `${s.col}20`, display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <I size={11} color={s.col} strokeWidth={2.5} />
                </div>}
                <div>
                  <div style={{ fontSize: 9, color: C.slate, fontWeight: 700, textTransform: "uppercase", letterSpacing: .4 }}>{s.l}</div>
                  <div style={{ fontSize: 17, fontWeight: 900, color: s.col, lineHeight: 1.1 }}>{s.v}</div>
                </div>
              </div>
            );
          })}
          <div style={{ flex: 1, minWidth: 160 }}>
            <AlignBar aligned={net.aligned} above={net.above} below={net.below} h={9} />
            <div style={{ display: "flex", gap: 10, fontSize: 10, marginTop: 4 }}>
              {[["Aligned", C.tealLight], ["Above", C.amber], ["Below", C.red]].map(([l, col]) => (
                <span key={l} style={{ color: col }}>■ {l}</span>
              ))}
            </div>
          </div>
        </div>
      )}

      <div style={{ border: `1px solid ${C.border}`, borderRadius: 12, overflow: "hidden", boxShadow: "0 2px 8px rgba(0,0,0,.05)" }}>
        <div style={{ display: "flex", background: C.teal, color: C.white, fontSize: 11, fontWeight: 700 }}>
          <div style={{ width: 90, padding: "10px 8px", flexShrink: 0, color: "rgba(255,255,255,.55)" }}>CPT Code</div>
          <div style={{ flex: 1, padding: "10px 8px", color: "rgba(255,255,255,.55)" }}>Description</div>
          <TH label="Ref Price"    k="refPrice" w={90}  align="right" />
          <TH label="Co. Price"    k="price"    w={90}  align="right" />
          <div style={{ width: 90, padding: "10px 8px", textAlign: "right", flexShrink: 0, color: "#C4B5FD", fontSize: 11 }}>IQR Opt.</div>
          <TH label="Status / Var" k="varPct"   w={176} />
        </div>
        {rows.length > 0
          ? <FixedSizeList height={520} itemCount={rows.length} itemSize={ROW_H} width="100%">{Row}</FixedSizeList>
          : <div style={{ padding: 48, textAlign: "center", color: C.muted }}>
              <Search size={28} style={{ opacity: .2, display: "block", margin: "0 auto 8px" }} />
              No results for "{search}"
            </div>}
      </div>
    </div>
  );
}

// ─── FULL TABLE — PIVOT ───────────────────────────────────────────────────────
function FullTableView({ data }) {
  const allCompanies = useMemo(() => data.companies.map((c) => c.company), [data]);
  const [selCompanies, setSelCompanies] = useState([]);
  const [statusFilter, setStatusFilter] = useState([]);
  const [search,       setSearch]       = useState("");
  const [sortCol,      setSortCol]      = useState(null);
  const [sortDir,      setSortDir]      = useState("asc");

  const allCols = useMemo(() => {
    const cols = [];
    data.companies.forEach((co) =>
      co.networks.forEach((net) =>
        cols.push({ id: `${co.company}||${net.network}`, company: co.company, network: net.network, rates: net.rates })
      )
    );
    return cols;
  }, [data]);

  const visibleCols = useMemo(
    () => selCompanies.length === 0 ? allCols : allCols.filter((c) => selCompanies.includes(c.company)),
    [allCols, selCompanies]
  );

  const allRows = useMemo(() => {
    const ref = data.reference;
    return Object.entries(ref).map(([cpt, rd]) => {
      const row = { cpt, desc: rd.description, refPrice: rd.price, cells: {} };
      allCols.forEach((col) => {
        const price  = col.rates[cpt];
        const varPct = price != null && rd.price ? ((price - rd.price) / rd.price) * 100 : null;
        row.cells[col.id] = { price, varPct, status: statusOf(varPct) };
      });
      return row;
    });
  }, [data, allCols]);

  const filteredRows = useMemo(() => {
    let rows = allRows;
    if (search) rows = rows.filter((r) =>
      r.cpt.includes(search) || r.desc.toLowerCase().includes(search.toLowerCase()));
    if (statusFilter.length > 0)
      rows = rows.filter((r) => visibleCols.some((col) => statusFilter.includes(r.cells[col.id]?.status)));
    if (sortCol) {
      rows = [...rows].sort((a, b) => {
        const av = a.cells[sortCol]?.price ?? (sortDir === "asc" ? Infinity : -Infinity);
        const bv = b.cells[sortCol]?.price ?? (sortDir === "asc" ? Infinity : -Infinity);
        return sortDir === "asc" ? av - bv : bv - av;
      });
    }
    return rows;
  }, [allRows, search, statusFilter, visibleCols, sortCol, sortDir]);

  const toggleColSort = (id) => {
    if (sortCol === id) setSortDir((d) => d === "asc" ? "desc" : "asc");
    else { setSortCol(id); setSortDir("asc"); }
  };

  const exportCSV = useCallback(() => {
    const header = ["CPT Code", "Description", "SGH Ref Price",
      ...visibleCols.map((c) => `${c.company} | ${c.network}`)];
    const lines  = [header.join(","),
      ...filteredRows.map((r) => [
        r.cpt, `"${(r.desc || "").replace(/"/g, '""')}"`, r.refPrice ?? "",
        ...visibleCols.map((c) => r.cells[c.id]?.price?.toFixed(2) ?? ""),
      ].join(","))];
    const a = Object.assign(document.createElement("a"), {
      href: URL.createObjectURL(new Blob([lines.join("\n")], { type: "text/csv" })),
      download: "benchmark_pivot.csv",
    });
    a.click();
  }, [filteredRows, visibleCols]);

  const CPT_W  = 80; const DESC_W = 240; const REF_W = 80; const COL_W = 112;
  const totalW = CPT_W + DESC_W + REF_W + visibleCols.length * COL_W;

  const companyGroups = useMemo(() => {
    const groups = [];
    visibleCols.forEach((col) => {
      const last = groups[groups.length - 1];
      if (last && last.company === col.company) last.count++;
      else groups.push({ company: col.company, count: 1 });
    });
    return groups;
  }, [visibleCols]);

  const fStats = useMemo(() => {
    let al = 0, ab = 0, be = 0;
    filteredRows.forEach((r) => visibleCols.forEach((c) => {
      const s = r.cells[c.id]?.status;
      if (s === "aligned") al++; else if (s === "above") ab++; else if (s === "below") be++;
    }));
    return { al, ab, be };
  }, [filteredRows, visibleCols]);

  const ROW_H = 38;
  const Row = useCallback(({ index, style }) => {
    const r = filteredRows[index];
    return (
      <div style={{ ...style, display: "flex", alignItems: "center", minWidth: totalW,
        borderBottom: `1px solid ${C.border}`, fontSize: 11,
        background: index % 2 === 0 ? C.white : C.canvas }}>
        <div style={{ width: CPT_W, padding: "0 6px", fontFamily: "monospace", fontWeight: 700, color: C.teal, flexShrink: 0, fontSize: 10 }}>{r.cpt}</div>
        <div style={{ width: DESC_W, padding: "0 6px", color: C.slate, flexShrink: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{r.desc}</div>
        <div style={{ width: REF_W, padding: "0 6px", textAlign: "right", flexShrink: 0, color: C.tealLight, fontWeight: 700 }}>{r.refPrice != null ? fmt(r.refPrice) : "—"}</div>
        {visibleCols.map((col) => {
          const cell = r.cells[col.id];
          const st   = cell?.status ? STATUS[cell.status] : null;
          return (
            <div key={col.id} style={{
              width: COL_W, flexShrink: 0, padding: "0 6px", textAlign: "center",
              borderLeft: `1px solid ${C.border}66`,
              background: st ? `${st.bg}88` : "transparent",
            }}>
              {cell?.price != null ? (
                <div style={{ color: st ? st.text : C.teal, fontWeight: 700 }}>
                  {fmt(cell.price)}
                  {cell.varPct != null && (
                    <div style={{ fontSize: 9, fontWeight: 600, color: st ? st.text : C.muted, opacity: .85 }}>
                      {varFmt(cell.varPct)}
                    </div>
                  )}
                </div>
              ) : (
                <span style={{ color: C.border, fontSize: 13 }}>—</span>
              )}
            </div>
          );
        })}
      </div>
    );
  }, [filteredRows, visibleCols, totalW]);

  return (
    <div style={{ padding: "24px 28px" }}>
      {/* Filter bar */}
      <div style={{ background: C.white, borderRadius: 12, border: `1px solid ${C.border}`,
        padding: "12px 16px", marginBottom: 12, boxShadow: "0 1px 4px rgba(0,0,0,.05)" }}>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8, alignItems: "center" }}>
          <MultiSelect label="Companies" options={allCompanies} selected={selCompanies} onChange={setSelCompanies} width={220} />
          <MultiSelect label="Statuses"  options={["aligned", "above", "below"]} selected={statusFilter} onChange={setStatusFilter} width={160} />
          <div style={{ display: "flex", alignItems: "center", gap: 7, background: C.canvas,
            border: `1.5px solid ${C.border}`, borderRadius: 8, padding: "0 10px" }}>
            <Search size={12} color={C.muted} />
            <input placeholder="CPT / keyword" value={search}
              onChange={(e) => setSearch(e.target.value)} style={{
                border: "none", outline: "none", fontSize: 12, width: 160,
                padding: "7px 0", background: "transparent", color: C.slate,
              }} />
          </div>
          {(selCompanies.length > 0 || statusFilter.length > 0 || search) && (
            <button onClick={() => { setSelCompanies([]); setStatusFilter([]); setSearch(""); setSortCol(null); }}
              style={{ padding: "7px 12px", background: C.canvas, border: `1px solid ${C.border}`,
                borderRadius: 8, cursor: "pointer", fontSize: 11, color: C.slate,
                fontWeight: 600, display: "flex", alignItems: "center", gap: 4 }}>
              <X size={11} /> Clear
            </button>
          )}
          <button onClick={exportCSV} style={{
            marginLeft: "auto", padding: "8px 16px",
            background: `linear-gradient(135deg,${C.teal},${C.tealMid})`,
            color: C.white, border: "none", borderRadius: 8, cursor: "pointer",
            fontSize: 12, fontWeight: 700, display: "flex", alignItems: "center",
            gap: 6, boxShadow: "0 2px 8px rgba(0,95,115,.25)",
          }}>
            <FileDown size={13} /> Export CSV
          </button>
        </div>
      </div>

      {/* Summary row */}
      <div style={{ display: "flex", gap: 10, marginBottom: 12, alignItems: "center", flexWrap: "wrap" }}>
        <span style={{ fontSize: 13, fontWeight: 800, color: C.teal }}>
          {filteredRows.length.toLocaleString()} codes · {visibleCols.length} networks
        </span>
        {[
          [fStats.al, C.tealLight, `${C.tealLight}22`, "aligned"],
          [fStats.ab, C.amber,     C.amberLt,           "above"  ],
          [fStats.be, C.red,       C.redLt,             "below"  ],
        ].map(([v, col, bg, l]) => (
          <span key={l} style={{ fontSize: 11, fontWeight: 700, color: col,
            background: bg, padding: "3px 10px", borderRadius: 20, border: `1px solid ${col}44` }}>
            {v.toLocaleString()} {l}
          </span>
        ))}
      </div>

      {/* Pivot table */}
      <div style={{ overflowX: "auto", border: `1px solid ${C.border}`, borderRadius: 12,
        boxShadow: "0 2px 8px rgba(0,0,0,.05)" }}>
        {/* Company header */}
        <div style={{ display: "flex", background: C.teal, minWidth: totalW }}>
          <div style={{ width: CPT_W + DESC_W + REF_W, flexShrink: 0 }} />
          {companyGroups.map((g) => (
            <div key={g.company} style={{
              width: g.count * COL_W, flexShrink: 0, padding: "8px 6px", textAlign: "center",
              fontSize: 11, fontWeight: 800, color: C.mint,
              borderLeft: `2px solid rgba(255,255,255,.12)`, borderBottom: `1px solid rgba(255,255,255,.1)`,
            }}>{g.company}</div>
          ))}
        </div>
        {/* Column header */}
        <div style={{ display: "flex", background: C.tealMid, minWidth: totalW, fontSize: 10, fontWeight: 700 }}>
          <div style={{ width: CPT_W,  padding: "9px 6px", flexShrink: 0, color: "rgba(255,255,255,.55)" }}>CPT</div>
          <div style={{ width: DESC_W, padding: "9px 6px", flexShrink: 0, color: "rgba(255,255,255,.55)" }}>Description</div>
          <div style={{ width: REF_W,  padding: "9px 6px", flexShrink: 0, textAlign: "right", color: C.mint, fontWeight: 800 }}>SGH Ref</div>
          {visibleCols.map((col) => (
            <div key={col.id} onClick={() => toggleColSort(col.id)} style={{
              width: COL_W, padding: "9px 6px", flexShrink: 0, textAlign: "center",
              borderLeft: `1px solid rgba(255,255,255,.1)`, cursor: "pointer",
              color: sortCol === col.id ? C.mint : "rgba(255,255,255,.55)",
              background: sortCol === col.id ? "rgba(0,0,0,.15)" : "transparent",
              overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", lineHeight: 1.3,
            }}>
              {col.network}{sortCol === col.id ? (sortDir === "asc" ? " ↑" : " ↓") : ""}
            </div>
          ))}
        </div>
        {/* Body */}
        <div style={{ minWidth: totalW }}>
          {filteredRows.length > 0
            ? <FixedSizeList height={530} itemCount={filteredRows.length} itemSize={ROW_H} width={totalW}>{Row}</FixedSizeList>
            : <div style={{ padding: 48, textAlign: "center", color: C.muted }}>
                <Layers size={28} style={{ opacity: .2, display: "block", margin: "0 auto 8px" }} />
                No codes match the current filters
              </div>}
        </div>
      </div>
    </div>
  );
}

// ─── CPT DEEP DIVE ────────────────────────────────────────────────────────────
function CptDeepDiveView({ data }) {
  const cptList = useMemo(() => Object.keys(data.reference).sort(), [data]);
  const [cpt,     setCpt]     = useState(() => cptList[0] || "");
  const [search,  setSearch]  = useState("");
  const [showPct, setShowPct] = useState(false);

  const filteredCpts = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return cptList;
    return cptList.filter((c) =>
      c.toLowerCase().includes(q) ||
      (data.reference[c]?.description || "").toLowerCase().includes(q));
  }, [cptList, search, data]);

  const ref   = data.reference[cpt];
  const stats = data.code_stats?.[cpt];

  const chartData = useMemo(() => {
    if (!cpt) return [];
    const refPrice = ref?.price;
    const rows = [];
    data.companies.forEach((co) =>
      co.networks.forEach((net) => {
        const price = net.rates[cpt];
        if (price == null) return;
        const varPct  = refPrice ? ((price - refPrice) / refPrice) * 100 : null;
        const status  = statusOf(varPct);
        rows.push({
          name: `${co.company} — ${net.network}`,
          company: co.company, price, varPct: varPct ?? 0, rawVarPct: varPct, refPrice,
          fill: status === "aligned" ? C.tealLight : status === "above" ? C.amber : C.red,
        });
      })
    );
    return rows.sort((a, b) => b.price - a.price);
  }, [cpt, ref, data]);

  const maxPrice = useMemo(
    () => Math.max(...chartData.map((d) => d.price), ref?.price || 0) * 1.12,
    [chartData, ref]
  );

  const DeepTooltip = ({ active, payload }) => {
    if (!active || !payload?.length) return null;
    const d = payload[0]?.payload;
    if (!d) return null;
    const s = d.rawVarPct != null ? STATUS[statusOf(d.rawVarPct)] : null;
    return (
      <div style={{ background: C.white, border: `1px solid ${C.border}`, borderRadius: 12,
        padding: "12px 16px", boxShadow: "0 8px 24px rgba(0,95,115,.16)", fontSize: 12, minWidth: 210 }}>
        <div style={{ fontWeight: 800, color: C.teal, fontSize: 13, marginBottom: 8,
          paddingBottom: 6, borderBottom: `1px solid ${C.border}` }}>{d.name}</div>
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
          <span style={{ color: C.slate }}>Company price</span>
          <span style={{ fontWeight: 800, color: C.teal }}>AED {fmt(d.price)}</span>
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
          <span style={{ color: C.slate }}>SGH reference</span>
          <span style={{ fontWeight: 700, color: C.tealLight }}>AED {fmt(d.refPrice)}</span>
        </div>
        {s && (
          <span style={{ display: "inline-flex", alignItems: "center", gap: 4,
            background: s.bg, color: s.text, border: `1px solid ${s.border}`,
            padding: "3px 10px", borderRadius: 20, fontSize: 10, fontWeight: 700 }}>
            {s.label} ({varFmt(d.rawVarPct)})
          </span>
        )}
      </div>
    );
  };

  const CustomBar = ({ x, y, width, height, fill }) => {
    if (!width || isNaN(width) || !height || isNaN(height)) return null;
    return <rect x={x} y={y + 2} width={Math.max(2, Math.abs(width))} height={Math.max(1, height - 4)} fill={fill} rx={4} />;
  };

  return (
    <div style={{ padding: "24px 28px" }}>
      <div style={{ display: "flex", gap: 20, marginBottom: 20, flexWrap: "wrap", alignItems: "flex-start" }}>
        {/* Selector */}
        <div style={{ width: 300, background: C.white, borderRadius: 14, border: `1px solid ${C.border}`,
          padding: 16, boxShadow: "0 1px 4px rgba(0,0,0,.05)", flexShrink: 0 }}>
          <div style={{ fontWeight: 800, fontSize: 11, color: C.teal, marginBottom: 10,
            textTransform: "uppercase", letterSpacing: .7 }}>Select CPT Code</div>
          <div style={{ display: "flex", alignItems: "center", gap: 7, background: C.canvas,
            border: `1.5px solid ${C.border}`, borderRadius: 8, padding: "0 10px", marginBottom: 8 }}>
            <Search size={12} color={C.muted} />
            <input placeholder="Search by code or description…" value={search}
              onChange={(e) => setSearch(e.target.value)} style={{
                border: "none", outline: "none", fontSize: 12, flex: 1,
                padding: "8px 0", background: "transparent", color: C.slate,
              }} />
          </div>
          <select value={cpt} onChange={(e) => setCpt(e.target.value)} size={10} style={{
            width: "100%", borderRadius: 8, border: `1.5px solid ${C.border}`,
            fontSize: 11, padding: 4, background: C.canvas, outline: "none", color: C.teal,
          }}>
            {filteredCpts.map((c) => (
              <option key={c} value={c}>{c} — {(data.reference[c]?.description || "").slice(0, 40)}</option>
            ))}
          </select>
          <div style={{ fontSize: 10, color: C.muted, marginTop: 4 }}>
            {filteredCpts.length.toLocaleString()} of {cptList.length.toLocaleString()} codes
          </div>
        </div>

        {/* Stats */}
        {ref && (
          <div style={{ flex: 1, minWidth: 300 }}>
            <div style={{ fontWeight: 800, fontSize: 11, color: C.teal, marginBottom: 10,
              textTransform: "uppercase", letterSpacing: .7 }}>Code Statistics</div>
            {/* Hero card */}
            <div style={{ background: `linear-gradient(135deg,${C.teal},${C.tealLight})`,
              borderRadius: 14, padding: "18px 22px", marginBottom: 12,
              border: `1px solid ${C.tealLight}55`, boxShadow: "0 6px 20px rgba(0,95,115,.25)" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                <div>
                  <div style={{ fontSize: 10, color: C.mint, fontWeight: 700, textTransform: "uppercase", letterSpacing: .7, marginBottom: 4 }}>CPT Code</div>
                  <div style={{ fontSize: 30, fontWeight: 900, color: C.white, fontFamily: "monospace", letterSpacing: 1 }}>{cpt}</div>
                </div>
                <div style={{ textAlign: "right" }}>
                  <div style={{ fontSize: 10, color: C.mint, fontWeight: 700, textTransform: "uppercase", letterSpacing: .7, marginBottom: 4 }}>SGH Reference</div>
                  <div style={{ fontSize: 26, fontWeight: 900, color: C.mint }}>AED {fmt(ref.price)}</div>
                </div>
              </div>
              <div style={{ fontSize: 12, color: "rgba(255,255,255,.65)", marginTop: 10,
                borderTop: `1px solid rgba(148,210,189,.3)`, paddingTop: 10 }}>{ref.description}</div>
            </div>
            {stats && (
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(118px, 1fr))", gap: 10 }}>
                {[
                  { l: "Market Median", v: `AED ${fmt(stats.median)}`,       col: C.teal,      bg: C.white },
                  { l: "Q1",           v: `AED ${fmt(stats.q1)}`,            col: C.slate,     bg: C.white },
                  { l: "Q3",           v: `AED ${fmt(stats.q3)}`,            col: C.slate,     bg: C.white },
                  { l: "IQR Optimal",  v: `AED ${fmt(stats.iqr_optimal)}`,   col: C.tealLight, bg: `${C.tealLight}12`, bold: true },
                  { l: "Aligned",      v: stats.companies_aligned,            col: C.tealLight, bg: `${C.tealLight}18` },
                  { l: "Above",        v: stats.companies_above,              col: C.amber,     bg: C.amberLt },
                  { l: "Below",        v: stats.companies_below,              col: C.red,       bg: C.redLt },
                ].map((s) => (
                  <div key={s.l} style={{
                    background: s.bg, borderRadius: 10, padding: "10px 12px",
                    border: `1px solid ${C.border}`,
                    boxShadow: s.bold ? `0 0 0 2px ${C.tealLight}44` : "none",
                  }}>
                    <div style={{ fontSize: 9, color: C.slate, fontWeight: 700, textTransform: "uppercase", letterSpacing: .4, marginBottom: 3 }}>{s.l}</div>
                    <div style={{ fontSize: s.bold ? 14 : 13, fontWeight: s.bold ? 900 : 800, color: s.col }}>{s.v}</div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Chart controls */}
      <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 12, flexWrap: "wrap" }}>
        <div style={{ display: "flex", gap: 14, fontSize: 12 }}>
          {[[C.tealLight, "Aligned (±5%)"], [C.amber, "Above (>+5%)"], [C.red, "Below (<-5%)"]].map(([col, l]) => (
            <span key={l} style={{ display: "flex", alignItems: "center", gap: 5, color: C.slate }}>
              <span style={{ width: 10, height: 10, borderRadius: 3, background: col, display: "inline-block" }} />
              {l}
            </span>
          ))}
        </div>
        <div style={{ marginLeft: "auto", display: "flex", border: `1px solid ${C.border}`, borderRadius: 8, overflow: "hidden" }}>
          {[["Price (AED)", false], ["Variance %", true]].map(([lbl, val]) => (
            <button key={lbl} onClick={() => setShowPct(val)} style={{
              padding: "6px 14px", border: "none", cursor: "pointer", fontSize: 11, fontWeight: 700,
              background: showPct === val ? C.teal : C.white,
              color: showPct === val ? C.mint : C.slate,
            }}>{lbl}</button>
          ))}
        </div>
      </div>

      {chartData.length > 0 ? (
        <div style={{ background: C.white, borderRadius: 14, border: `1px solid ${C.border}`,
          padding: "20px 8px", boxShadow: "0 2px 8px rgba(0,0,0,.05)" }}>
          <ResponsiveContainer width="100%" height={Math.max(340, chartData.length * 42)}>
            <BarChart data={chartData} layout="vertical" margin={{ left: 16, right: 110, top: 8, bottom: 8 }}>
              <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#EEF2F4" />
              <XAxis type="number"
                domain={showPct ? ["auto", "auto"] : [0, maxPrice]}
                tickFormatter={(v) => showPct
                  ? `${v >= 0 ? "+" : ""}${v.toFixed(0)}%`
                  : `AED ${v >= 1000 ? (v/1000).toFixed(0)+"k" : v}`}
                fontSize={10} tick={{ fill: C.slate }} axisLine={false} tickLine={false} />
              <YAxis type="category" dataKey="name" width={252} fontSize={10} tick={{ fill: C.slate }}
                tickFormatter={(v) => v.length > 44 ? v.slice(0, 42) + "…" : v}
                axisLine={false} tickLine={false} />
              <Tooltip content={<DeepTooltip />} cursor={{ fill: C.canvas }} />
              {!showPct && ref && (
                <ReferenceLine x={ref.price} stroke={C.tealLight} strokeWidth={2.5} strokeDasharray="6 3"
                  label={{ value: `SGH  AED ${fmt(ref.price)}`, position: "insideTopRight",
                    fontSize: 10, fill: C.tealLight, fontWeight: 700 }} />
              )}
              {showPct && (
                <>
                  <ReferenceLine x={0}  stroke={C.teal}  strokeWidth={2} />
                  <ReferenceLine x={5}  stroke={C.amber} strokeDasharray="5 3"
                    label={{ value: "+5%", position: "insideTopRight", fontSize: 10, fill: C.amber }} />
                  <ReferenceLine x={-5} stroke={C.red}   strokeDasharray="5 3"
                    label={{ value: "-5%", position: "insideTopLeft",  fontSize: 10, fill: C.red }} />
                </>
              )}
              <Bar dataKey={showPct ? "varPct" : "price"} shape={<CustomBar />}
                label={({ x, y, width, height, index }) => {
                  const entry = chartData[index];
                  if (!entry || Math.abs(width) < 8) return null;
                  return (
                    <text x={x + Math.abs(width) + 6} y={y + height / 2}
                      fontSize={9} fill={C.slate} dominantBaseline="middle">
                      {showPct ? `AED ${fmt(entry.price)}` : varFmt(entry.rawVarPct)}
                    </text>
                  );
                }}>
                {chartData.map((entry, i) => <Cell key={i} fill={entry.fill} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      ) : cpt ? (
        <div style={{ padding: 60, textAlign: "center", color: C.muted,
          background: C.white, borderRadius: 14, border: `1px solid ${C.border}` }}>
          <Target size={36} style={{ opacity: .2, display: "block", margin: "0 auto 12px" }} />
          No company data found for CPT {cpt}
        </div>
      ) : null}
    </div>
  );
}

// ─── ROOT ─────────────────────────────────────────────────────────────────────
export default function App() {
  const [data,            setData]            = useState(null);
  const [error,           setError]           = useState(null);
  const [view,            setView]            = useState("Summary");
  const [selectedCompany, setSelectedCompany] = useState(null);

  useEffect(() => {
    fetch(process.env.PUBLIC_URL + "/benchmark_data.json")
      .then((r) => { if (!r.ok) throw new Error(`HTTP ${r.status}`); return r.json(); })
      .then((d)  => { setData(d); setSelectedCompany(d.companies[0]?.company || null); })
      .catch((e) => setError(e.message));
  }, []);

  if (error) return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center",
      minHeight: "100vh", background: C.canvas, fontFamily: "Inter, system-ui" }}>
      <div style={{ background: C.white, borderRadius: 16, padding: 32,
        border: `1px solid ${C.border}`, maxWidth: 480, textAlign: "center" }}>
        <div style={{ color: C.red, fontWeight: 800, fontSize: 16, marginBottom: 8 }}>Failed to load benchmark data</div>
        <code style={{ fontFamily: "monospace", color: C.slate, fontSize: 13 }}>{error}</code>
      </div>
    </div>
  );

  if (!data) return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center",
      justifyContent: "center", minHeight: "100vh", gap: 16, background: C.canvas }}>
      <img src={process.env.PUBLIC_URL + "/sgh.png"} alt="SGH" style={{ height: 52, opacity: .7 }}
        onError={(e) => { e.target.style.display = "none"; }} />
      <div style={{ color: C.slate, fontSize: 14, fontWeight: 600 }}>Loading benchmark data…</div>
      <div style={{ display: "flex", gap: 6 }}>
        {[0, 1, 2].map((i) => (
          <div key={i} style={{ width: 8, height: 8, borderRadius: "50%", background: C.tealLight,
            animation: `pulse 1.2s ease ${i * .2}s infinite` }} />
        ))}
      </div>
    </div>
  );

  return (
    <div style={{ fontFamily: "'Inter', system-ui, sans-serif", minHeight: "100vh", background: C.canvas }}>
      <Nav view={view} setView={setView} generatedAt={data.generated_at}
        refCount={data.reference_count} plCount={data.pricelist_count} />
      {view === "Summary"        && <SummaryView       data={data} onSelectCompany={(c) => { setSelectedCompany(c); setView("Company Detail"); }} />}
      {view === "Company Detail" && <CompanyDetailView data={data} selectedCompany={selectedCompany} onSelectCompany={setSelectedCompany} />}
      {view === "Full Table"     && <FullTableView      data={data} />}
      {view === "CPT Deep Dive"  && <CptDeepDiveView    data={data} />}
    </div>
  );
}
