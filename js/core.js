// Shared state, utilities, icons, and root rendering.
const DEFAULT_ROUTINES = [
  { id: "tren-inferior", name: "Tren inferior", exercises: ["Sentadilla", "Peso muerto", "Prensa", "Zancadas"] },
  { id: "empuje", name: "Empuje", exercises: ["Press banca", "Press militar", "Press inclinado", "Extensión de tríceps"] },
  { id: "tiron", name: "Tirón", exercises: ["Remo con barra", "Dominadas", "Jalón al pecho", "Curl de bíceps"] },
];

const state = {
  user: null,
  tab: "inicio",
  routines: DEFAULT_ROUTINES,
  sessions: [],
  pendingOperations: [],
  reg: { selected: null, entries: {}, editingSessionId: null },
  cal: { year: new Date().getFullYear(), month: new Date().getMonth(), selectedDate: null },
  res: { year: new Date().getFullYear(), month: new Date().getMonth() },
  prog: { exercise: null },
  method: { oneRm: 120 },
  rest: { seconds: 0, running: false },
};

let restTimerInterval = null;
function uid() { return Math.random().toString(36).slice(2, 10); }
function fmtDateKey(d) { return d.toISOString().slice(0, 10); }
const DAY_LABELS = ["L","M","M","J","V","S","D"];
const MONTH_LABELS = ["Enero","Febrero","Marzo","Abril","Mayo","Junio","Julio","Agosto","Septiembre","Octubre","Noviembre","Diciembre"];
function daysInMonth(y,m){ return new Date(y, m+1, 0).getDate(); }
function mondayIndex(date){ return (date.getDay()+6)%7; }
function esc(s){ return String(s).replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c])); }

const ICONS = {
  dumbbell: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M6.5 6.5l11 11M4 9l3-3M17 20l3-3M2 12l2-2M22 12l-2 2M9 4l-3 3M20 17l-3 3"/></svg>`,
  list: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M9 6h11M9 12h11M9 18h11M4 6h.01M4 12h.01M4 18h.01"/></svg>`,
  trend: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 17 9 11 13 15 21 6"/><polyline points="14 6 21 6 21 13"/></svg>`,
  calendar: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/></svg>`,
  chart: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M3 3v18h18M8 17V9M13 17V5M18 17v-7"/></svg>`,
  home: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 10.5L12 3l9 7.5"/><path d="M5 9v11h14V9M9 20v-6h6v6"/></svg>`,
  plus: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><path d="M12 5v14M5 12h14"/></svg>`,
  x: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><path d="M18 6L6 18M6 6l12 12"/></svg>`,
  check: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>`,
  trash: `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18M8 6V4a2 2 0 012-2h4a2 2 0 012 2v2m3 0l-1 14a2 2 0 01-2 2H7a2 2 0 01-2-2L4 6"/></svg>`,
  chevL: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><polyline points="15 18 9 12 15 6"/></svg>`,
  chevR: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 18 15 12 9 6"/></svg>`,
};

function render() {
  renderNav();
  const el = document.getElementById("content");
  const headerHtml = `<div class="account-bar"><span>${esc(state.user?.email || "")}</span><button onclick="signOut()">Cerrar sesión</button></div><div class="header"><h1 class="display">${titleFor(state.tab)}</h1><div class="bar"></div></div><div style="padding:0 0">`;
  let body = "";
  if (state.tab === "inicio") body = renderInicio();
  if (state.tab === "registrar") body = renderRegistrar();
  if (state.tab === "rutinas") body = renderRutinas();
  if (state.tab === "progreso") body = renderProgreso();
  if (state.tab === "calendario") body = renderCalendario();
  if (state.tab === "resumen") body = renderResumen();
  if (state.tab === "metodo") body = renderMetodo();
  el.innerHTML = headerHtml + `<div id="offline-bar" class="offline-bar" hidden></div><div style="padding:0 0 0;">${body}</div></div>`;
  updateOfflineStatus();
}
function titleFor(t){ return { inicio:"Inicio", registrar:"Registrar", rutinas:"Rutinas", progreso:"Progreso", calendario:"Calendario", resumen:"Resumen", metodo:"Método" }[t]; }
function renderNav() {
  const tabs = [
    { id: "inicio", label: "Inicio", icon: ICONS.home },
    { id: "registrar", label: "Registrar", icon: ICONS.dumbbell },
    { id: "rutinas", label: "Rutinas", icon: ICONS.list },
    { id: "progreso", label: "Progreso", icon: ICONS.trend },
    { id: "calendario", label: "Calendario", icon: ICONS.calendar },
    { id: "resumen", label: "Resumen", icon: ICONS.chart },
    { id: "metodo", label: "Método", icon: ICONS.list },
  ];
  document.getElementById("navbar").innerHTML = tabs.map(t => `<button class="navbtn ${state.tab===t.id?'active':''}" onclick="setTab('${t.id}')">${t.icon}<span>${t.label}</span></button>`).join("");
}
function setTab(t){ state.tab = t; render(); }
