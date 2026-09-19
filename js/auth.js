// Supabase email authentication and screen switching.
let authMode = "login";
function renderAuth(errorMessage = "") {
  const screen = document.getElementById("auth-screen");
  screen.hidden = false;
  document.getElementById("app").hidden = true;
  screen.innerHTML = `<div class="auth-card">
    <h1 class="display">Gym Tracker</h1>
    <p>${authMode === "login" ? "Ingresá para ver tus rutinas y progresos en cualquier dispositivo." : "Creá tu cuenta para guardar tus rutinas y progresos."}</p>
    <form onsubmit="submitAuth(event)">
      <label for="authEmail">Email</label><input id="authEmail" type="email" autocomplete="email" required>
      <label for="authPassword">Contraseña</label><input id="authPassword" type="password" minlength="6" autocomplete="${authMode === "login" ? "current-password" : "new-password"}" required>
      <button class="btn btn-primary" style="margin-top:18px;" type="submit">${authMode === "login" ? "Iniciar sesión" : "Crear cuenta"}</button>
    </form>
    <div class="auth-error">${esc(errorMessage)}</div>
    <button class="auth-toggle" onclick="toggleAuthMode()">${authMode === "login" ? "¿No tenés cuenta? Crear una" : "Ya tengo una cuenta"}</button>
  </div>`;
}
function toggleAuthMode() { authMode = authMode === "login" ? "signup" : "login"; renderAuth(); }
async function submitAuth(event) {
  event.preventDefault();
  if (!supabaseClient) { renderAuth("Primero configurá las credenciales de Supabase."); return; }
  const email = document.getElementById("authEmail").value.trim();
  const password = document.getElementById("authPassword").value;
  try {
    const result = authMode === "login" ? await supabaseClient.auth.signInWithPassword({ email, password }) : await supabaseClient.auth.signUp({ email, password });
    if (result.error) { renderAuth(result.error.message); return; }
    if (authMode === "signup" && !result.data.session) renderAuth("Cuenta creada. Revisá tu email para confirmar la cuenta.");
  } catch (error) { renderAuth("No se pudo conectar con el servidor. Revisá tu conexión e intentá otra vez."); }
}
async function signOut() { await supabaseClient.auth.signOut(); }
async function applySession(session) {
  state.user = session?.user || null;
  if (!state.user) { renderAuth(); return; }
  try {
    await loadUserData(state.user);
    document.getElementById("auth-screen").hidden = true;
    document.getElementById("app").hidden = false;
    render();
  } catch (error) {
    console.error("Supabase load error", error);
    const buffered = readBuffer();
    if (!buffered) { renderAuth("No se pudieron cargar tus datos. Revisá tu conexión e intentá otra vez."); return; }
    state.routines = buffered.routines || DEFAULT_ROUTINES;
    state.sessions = buffered.sessions || [];
    state.method = buffered.method || { oneRm: 120 };
    state.pendingOperations = buffered.pending || [];
    document.getElementById("auth-screen").hidden = true;
    document.getElementById("app").hidden = false;
    render();
  }
}
async function initializeApp() {
  if (!supabaseConfigured) { renderAuth("Configurá SUPABASE_URL y SUPABASE_ANON_KEY en este archivo para comenzar."); return; }
  supabaseClient.auth.onAuthStateChange((_event, session) => applySession(session));
  const { data, error } = await supabaseClient.auth.getSession();
  if (error) renderAuth(error.message);
  else if (data.session) await applySession(data.session);
  else renderAuth();
}
