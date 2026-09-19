// Supabase persistence, RLS-scoped operations, and offline retry queue.
const SUPABASE_URL = "https://zgrinrjufkczplkdnemr.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_Ksl6eBYDxcXiQOC9YcHEtw_IrLVMtts";
const supabaseConfigured = !SUPABASE_URL.startsWith("REEMPLAZA_") && !SUPABASE_ANON_KEY.startsWith("REEMPLAZA_");
const supabaseClient = supabaseConfigured ? window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY) : null;
const BUFFER_PREFIX = "gymtracker_buffer_v2_";
let syncInProgress = false;

function bufferKey() { return BUFFER_PREFIX + (state.user?.id || "guest"); }
function readBuffer() { try { return JSON.parse(localStorage.getItem(bufferKey()) || "null"); } catch (error) { return null; } }
function writeBuffer() {
  if (!state.user) return;
  try { localStorage.setItem(bufferKey(), JSON.stringify({ routines: state.routines, sessions: state.sessions, method: state.method, pending: state.pendingOperations || [] })); }
  catch (error) { console.error("Local buffer error", error); }
}
function clearBuffer() {
  try { const buffered = readBuffer(); if (buffered) { buffered.pending = []; localStorage.setItem(bufferKey(), JSON.stringify(buffered)); } } catch (error) {}
}
function operationPayload(operation) {
  if (operation.table === "routines") return { id: operation.record.id, user_id: state.user.id, name: operation.record.name, exercises: operation.record.exercises };
  if (operation.table === "sessions") return { id: operation.record.id, user_id: state.user.id, date: operation.record.date, routine_name: operation.record.routineName, exercises: operation.record.exercises, notes: operation.record.notes || "", rpe: operation.record.rpe ?? null };
  return { user_id: state.user.id, one_rm: operation.record.oneRm };
}
async function sendOperation(operation) {
  if (!supabaseClient || !state.user) return;
  const result = operation.type === "delete"
    ? await supabaseClient.from(operation.table).delete().eq("id", operation.id).eq("user_id", state.user.id)
    : await supabaseClient.from(operation.table).upsert(operationPayload(operation));
  if (result.error) throw result.error;
}
async function flushPendingOperations() {
  if (syncInProgress || !navigator.onLine || !state.user) return;
  syncInProgress = true;
  try {
    while (state.pendingOperations?.length) { await sendOperation(state.pendingOperations[0]); state.pendingOperations.shift(); writeBuffer(); }
    if (!state.pendingOperations?.length) clearBuffer();
  } catch (error) { console.error("Supabase sync pending", error); }
  finally { syncInProgress = false; updateOfflineStatus(); }
}
function saveData(operation) {
  if (!state.user || !operation) return Promise.resolve();
  state.pendingOperations = state.pendingOperations || [];
  state.pendingOperations.push(operation);
  writeBuffer();
  return flushPendingOperations();
}
function updateOfflineStatus() {
  const existing = document.getElementById("offline-bar");
  if (!existing) return;
  const pending = state.pendingOperations?.length || 0;
  existing.hidden = navigator.onLine && pending === 0;
  existing.textContent = navigator.onLine ? `Sincronizando ${pending} cambio${pending === 1 ? "" : "s"}...` : "Sin conexión. Tus cambios quedan guardados en este dispositivo.";
}
window.addEventListener("online", flushPendingOperations);
window.addEventListener("online", updateOfflineStatus);
window.addEventListener("offline", updateOfflineStatus);

async function loadUserData(user) {
  const [routinesResult, sessionsResult, preferencesResult] = await Promise.all([
    supabaseClient.from("routines").select("id,name,exercises").eq("user_id", user.id).order("created_at"),
    supabaseClient.from("sessions").select("id,date,routine_name,exercises,notes,rpe").eq("user_id", user.id).order("date"),
    supabaseClient.from("preferences").select("one_rm").eq("user_id", user.id).maybeSingle()
  ]);
  const failure = [routinesResult, sessionsResult, preferencesResult].find(result => result.error);
  if (failure) throw failure.error;
  const buffered = readBuffer();
  state.pendingOperations = buffered?.pending || [];
  const useBufferedState = buffered && (buffered.pending?.length || !navigator.onLine);
  state.routines = useBufferedState ? (buffered.routines || DEFAULT_ROUTINES) : (routinesResult.data.length ? routinesResult.data : DEFAULT_ROUTINES);
  state.sessions = useBufferedState ? (buffered.sessions || []) : sessionsResult.data.map(s => ({ ...s, routineName: s.routine_name }));
  state.method = useBufferedState ? (buffered.method || { oneRm: 120 }) : { oneRm: preferencesResult.data?.one_rm || 120 };
  if (!routinesResult.data.length && !buffered) state.routines.forEach(r => saveData({ type: "upsert", table: "routines", record: r }));
  writeBuffer();
  await flushPendingOperations();
}
async function removeCloudRecord(table, id) { return saveData({ type: "delete", table, id }); }
