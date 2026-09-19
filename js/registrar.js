// Workout registration, previous-session guidance, notes, RPE, and rest timer.
function previousSessionForExercise(exerciseName) { return state.sessions.filter(session => session.exercises.some(exercise => exercise.name === exerciseName)).sort((a, b) => b.date.localeCompare(a.date))[0]; }
function previousExerciseFor(exerciseName) { return previousSessionForExercise(exerciseName)?.exercises.find(item => item.name === exerciseName); }
function previousSessionForRoutine(routineName) { return state.sessions.slice().sort((a, b) => b.date.localeCompare(a.date)).find(session => session.routineName === routineName); }
function formatTimer(seconds) { return `${String(Math.floor(seconds / 60)).padStart(2, "0")}:${String(seconds % 60).padStart(2, "0")}`; }
function renderRestTimer() {
  const presets = [90, 120, 180];
  return `<div class="rest-timer"><div><div class="tag" style="color:#B8B1A5;">DESCANSO</div><div class="timer-value">${formatTimer(state.rest.seconds)}</div></div><div class="timer-controls">${presets.map(seconds => `<button onclick="startRestTimer(${seconds})">${seconds / 60} min</button>`).join("")}<button onclick="stopRestTimer()">Parar</button></div></div>`;
}
function startRestTimer(seconds) {
  clearInterval(restTimerInterval); state.rest.seconds = seconds; state.rest.running = true;
  restTimerInterval = setInterval(() => {
    state.rest.seconds -= 1;
    if (state.rest.seconds <= 0) { stopRestTimer(); if (navigator.vibrate) navigator.vibrate([250, 100, 250]); if (window.Notification?.permission === "granted") new Notification("Descanso terminado"); else if (navigator.vibrate) navigator.vibrate(400); return; }
    const timer = document.querySelector(".timer-value"); if (timer) timer.textContent = formatTimer(state.rest.seconds);
  }, 1000); render();
}
function stopRestTimer() { clearInterval(restTimerInterval); restTimerInterval = null; state.rest.seconds = 0; state.rest.running = false; render(); }
function requestNotificationPermission() { if (window.Notification && Notification.permission === "default") Notification.requestPermission(); }
function renderRegistrar() {
  if (!state.reg.selected) {
    let html = state.routines.map(r => `<button class="btn-routine" onclick="startRoutine('${r.id}')"><div style="font-weight:600;font-size:17px;">${esc(r.name)}</div><div class="sub" style="margin-top:2px;">${esc(r.exercises.join(" · "))}</div></button>`).join("");
    html += `<button class="btn-ghost" onclick="startFree()">+ Sesión libre</button>`; return html;
  }
  const sel = state.reg.selected;
  let html = `<div class="row" style="justify-content:space-between;margin-bottom:12px;"><div style="font-weight:600;font-size:18px;">${esc(sel.name)}</div><button class="icon-btn" style="color:#8B8680" onclick="cancelReg()">${ICONS.x}</button></div>`;
  if (sel.id === "libre") html += `<div class="row" style="margin-bottom:12px;"><input id="freeExName" placeholder="Nombre del ejercicio" style="flex:1"/><button class="btn" style="background:#B5502F;color:#F3EFE6;flex-shrink:0" onclick="addFreeExercise()">Agregar</button></div>`;
  html += renderRestTimer();
  html += `<button class="btn btn-ghost" style="padding:10px;margin-bottom:12px;" onclick="requestNotificationPermission()">Activar aviso de fin de descanso</button>`;
  if (state.reg.editingSessionId) html += `<div style="margin-bottom:10px;color:#8B8680;font-size:12px;">Editando sesión del ${new Date(state.sessions.find(s => s.id === state.reg.editingSessionId)?.date || Date.now()).toLocaleDateString("es-AR", {day:"2-digit", month:"short", year:"numeric"})}</div>`;
  Object.keys(state.reg.entries).forEach(ex => {
    const sets = state.reg.entries[ex];
    const previousExercise = previousExerciseFor(ex);
    const previousWeight = previousExercise?.sets[previousExercise.sets.length - 1]?.weight;
    const previousHtml = previousExercise ? previousExercise.sets.map((set, index) => `<div class="previous-set">${index + 1}. ${esc(set.weight)} kg × ${esc(set.reps)}</div>`).join("") : `<div class="previous-empty">Todavía no hay registros.</div>`;
    html += `<div class="card"><h3>${esc(ex)}</h3>${previousWeight == null ? "" : `<div class="previous-weight">Peso sugerido: ${esc(previousWeight)} kg</div>`}<div class="exercise-log" style="margin-top:8px;"><div>`;
    sets.forEach((s, idx) => { html += `<div class="row-set"><span class="set-num">${idx+1}</span><div class="weight-control"><button class="weight-step" onclick="adjustWeight('${esc(ex)}',${idx},-2.5)" aria-label="Restar 2.5 kg">−2.5</button><input type="number" inputmode="decimal" step="0.5" placeholder="kg" value="${esc(s.weight)}" oninput="updateSet('${esc(ex)}',${idx},'weight',this.value)"/><button class="weight-step" onclick="adjustWeight('${esc(ex)}',${idx},2.5)" aria-label="Sumar 2.5 kg">+2.5</button></div><input type="number" inputmode="numeric" placeholder="reps" value="${esc(s.reps)}" style="flex:1" oninput="updateSet('${esc(ex)}',${idx},'reps',this.value)"/><button class="icon-btn" onclick="removeSet('${esc(ex)}',${idx})">${ICONS.x}</button></div>`; });
    html += `<button class="icon-btn" style="display:flex;align-items:center;gap:4px;font-size:13px;font-weight:600;margin-top:4px;" onclick="addSet('${esc(ex)}')">${ICONS.plus} Serie</button></div><div class="previous-log"><span class="tag">ÚLTIMA SESIÓN</span>${previousHtml}</div></div></div>`;
  });
  html += `<div class="card"><label for="sessionNotes" style="font-size:13px;font-weight:600;">Notas de la sesión</label><textarea id="sessionNotes" class="note-input" placeholder="Cómo te sentiste, técnica, molestias...">${esc(state.reg.notes || "")}</textarea><label for="sessionRpe" style="display:block;font-size:13px;font-weight:600;margin-top:10px;">RPE (1-10)</label><input id="sessionRpe" type="number" min="1" max="10" step="1" value="${esc(state.reg.rpe || "")}" placeholder="Opcional"></div>`;
  html += `<button class="btn btn-primary" style="margin-top:8px;" onclick="finishSession()">${ICONS.check} ${state.reg.editingSessionId ? "Guardar cambios" : "Guardar sesión"}</button>`;
  return html;
}
function editSession(id) {
  const session = state.sessions.find(s => s.id === id); if (!session) return;
  state.tab = "registrar"; state.reg.selected = { id: `edit-${session.id}`, name: session.routineName }; state.reg.entries = {}; state.reg.editingSessionId = id; state.reg.notes = session.notes || ""; state.reg.rpe = session.rpe || "";
  session.exercises.forEach(ex => { state.reg.entries[ex.name] = ex.sets.map(set => ({ weight: String(set.weight), reps: String(set.reps) })); }); render();
}
function startRoutine(routineId) {
  const r = state.routines.find(x => x.id === routineId); const previous = previousSessionForRoutine(r.name);
  state.reg.selected = r; state.reg.entries = {}; state.reg.editingSessionId = null; state.reg.notes = ""; state.reg.rpe = "";
  r.exercises.forEach(ex => { const previousExercise = previous?.exercises.find(item => item.name === ex); const previousWeight = previousExercise?.sets[previousExercise.sets.length - 1]?.weight; state.reg.entries[ex] = [{weight: previousWeight == null ? "" : String(previousWeight), reps:""}]; }); render();
}
function startFree() { state.reg.selected = { id: "libre", name: "Sesión libre" }; state.reg.entries = {}; state.reg.editingSessionId = null; state.reg.notes = ""; state.reg.rpe = ""; render(); }
function cancelReg() { state.reg.selected = null; state.reg.entries = {}; state.reg.editingSessionId = null; state.reg.notes = ""; state.reg.rpe = ""; render(); }
function addFreeExercise() { const input = document.getElementById("freeExName"); const name = input.value.trim(); if (!name) return; const previous = previousExerciseFor(name); const previousWeight = previous?.sets[previous.sets.length - 1]?.weight; state.reg.entries[name] = [{weight: previousWeight == null ? "" : String(previousWeight), reps:""}]; render(); }
function addSet(ex) { const sets = state.reg.entries[ex]; const lastWeight = sets[sets.length - 1]?.weight || previousExerciseFor(ex)?.sets.slice(-1)[0]?.weight || ""; sets.push({weight: lastWeight === "" ? "" : String(lastWeight), reps:""}); render(); }
function adjustWeight(ex, idx, amount) { const current = parseFloat(state.reg.entries[ex][idx].weight) || 0; state.reg.entries[ex][idx].weight = String(Math.max(0, current + amount).toFixed(1).replace(/\.0$/, "")); render(); }
function updateSet(ex, idx, field, value) { state.reg.entries[ex][idx][field] = value; }
function removeSet(ex, idx) { state.reg.entries[ex] = state.reg.entries[ex].filter((_,i)=>i!==idx); render(); }
function finishSession() {
  const exercisesLogged = Object.entries(state.reg.entries).map(([name, sets]) => ({ name, sets: sets.filter(s => s.weight !== "" && s.reps !== "").map(s => ({ weight: parseFloat(s.weight)||0, reps: parseInt(s.reps)||0 })) })).filter(e => e.sets.length > 0);
  if (exercisesLogged.length === 0) { alert("Cargá al menos una serie con peso y reps."); return; }
  const notes = document.getElementById("sessionNotes")?.value.trim() || ""; const rpeValue = parseInt(document.getElementById("sessionRpe")?.value, 10); const rpe = Number.isFinite(rpeValue) && rpeValue >= 1 && rpeValue <= 10 ? rpeValue : null;
  const sessionDate = state.reg.editingSessionId ? state.sessions.find(s => s.id === state.reg.editingSessionId)?.date || fmtDateKey(new Date()) : fmtDateKey(new Date());
  if (state.reg.editingSessionId) { const idx = state.sessions.findIndex(s => s.id === state.reg.editingSessionId); if (idx >= 0) { state.sessions[idx] = {...state.sessions[idx], routineName: state.reg.selected.name, exercises: exercisesLogged, notes, rpe}; saveData({type:"upsert",table:"sessions",record:state.sessions[idx]}); } }
  else { const session = {id:uid(),date:sessionDate,routineName:state.reg.selected.name,exercises:exercisesLogged,notes,rpe}; state.sessions.push(session); saveData({type:"upsert",table:"sessions",record:session}); }
  clearInterval(restTimerInterval); restTimerInterval = null; state.rest.seconds = 0; state.reg.selected = null; state.reg.entries = {}; state.reg.editingSessionId = null; state.reg.notes = ""; state.reg.rpe = ""; render();
}
