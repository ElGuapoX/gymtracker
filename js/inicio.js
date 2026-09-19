// Authenticated home dashboard with quick navigation and training overview.
function renderInicio() {
  const firstName = (state.user?.email || "atleta").split("@")[0];
  const sortedSessions = state.sessions.slice().sort((a, b) => b.date.localeCompare(a.date));
  const stats = streakStats();
  const recent = sortedSessions.slice(0, 3);
  const totalVolume = state.sessions.reduce((total, session) => total + session.exercises.reduce((sessionTotal, exercise) => sessionTotal + exercise.sets.reduce((setTotal, set) => setTotal + set.weight * set.reps, 0), 0), 0);
  const actions = [
    ["registrar", ICONS.dumbbell, "Registrar", "Cargar una sesión"],
    ["rutinas", ICONS.list, "Rutinas", "Crear o editar"],
    ["progreso", ICONS.trend, "Progreso", "Ver evolución"],
    ["calendario", ICONS.calendar, "Calendario", "Revisar sesiones"],
    ["resumen", ICONS.chart, "Resumen", "Métricas y CSV"],
    ["metodo", ICONS.list, "Método", "Plan de 12 semanas"],
  ];
  let html = `<section class="home-welcome"><div class="tag">GYM TRACKER</div><h2 class="display">Hola, ${esc(firstName)}</h2><p>¿Qué querés hacer hoy?</p></section>`;
  html += `<div class="home-actions">${actions.map(([tab, icon, label, description]) => `<button class="home-action" onclick="setTab('${tab}')"><span class="home-action-icon">${icon}</span><span><strong>${label}</strong><small>${description}</small></span>${ICONS.chevR}</button>`).join("")}</div>`;
  html += `<div class="home-metrics"><div class="card"><div class="tag">SESIONES</div><div class="stat-val">${state.sessions.length}</div></div><div class="card"><div class="tag">VOLUMEN TOTAL</div><div class="stat-val">${Math.round(totalVolume)}<span class="metric-unit"> kg</span></div></div><div class="card"><div class="tag">RACHA ACTUAL</div><div class="stat-val">${stats.current}<span class="metric-unit"> días</span></div></div><div class="card"><div class="tag">MEJOR RACHA</div><div class="stat-val">${stats.best}<span class="metric-unit"> días</span></div></div></div>`;
  html += `<div class="home-section-heading"><span>Actividad reciente</span><button onclick="setTab('calendario')">Ver todo ${ICONS.chevR}</button></div>`;
  html += recent.length ? recent.map(session => `<button class="home-session" onclick="setTab('calendario')"><span class="home-session-date">${formatHomeDate(session.date)}</span><span><strong>${esc(session.routineName)}</strong><small>${session.exercises.length} ejercicio${session.exercises.length === 1 ? "" : "s"}</small></span>${ICONS.chevR}</button>`).join("") : `<div class="empty">Todavía no registraste sesiones.</div>`;
  return html;
}
function formatHomeDate(dateKey) { return new Date(`${dateKey}T12:00:00`).toLocaleDateString("es-AR", { day: "2-digit", month: "short" }); }
