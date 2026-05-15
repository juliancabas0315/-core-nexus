// CORE-NEXUS · API client
// Wrappers around fetch() to the FastAPI backend.

const API_BASE = "";  // mismo origen

async function postJson(path, payload) {
  const r = await fetch(API_BASE + path, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!r.ok) {
    const txt = await r.text();
    throw new Error(`API ${path} ${r.status}: ${txt}`);
  }
  return r.json();
}

async function getJson(path) {
  const r = await fetch(API_BASE + path);
  if (!r.ok) throw new Error(`API ${path} ${r.status}`);
  return r.json();
}

// ── Endpoints ────────────────────────────────────────────────────────────
const api = {
  switch:   (p) => postJson("/api/generate/switch", p),
  router:   (p) => postJson("/api/generate/router", p),
  firewall: (p) => postJson("/api/generate/firewall", p),
  format:   (p) => postJson("/api/generate/format", p),

  sessions: () => getJson("/api/sessions"),
  session:  (id) => getJson(`/api/sessions/${id}`),
  saveSession: (p) => postJson("/api/sessions", p),
  deleteSession: (id) => fetch(API_BASE + `/api/sessions/${id}`, { method: "DELETE" }),
};

// ── Hook: useApiCli ──────────────────────────────────────────────────────
// Debounced fetch para que cada cambio en el formulario regenere el CLI.
function useApiCli(endpoint, payload, deps = []) {
  const [out, setOut] = React.useState({ deploy: "// generando…", rollback: "" });
  const [err, setErr] = React.useState(null);

  React.useEffect(() => {
    let alive = true;
    setErr(null);
    const t = setTimeout(async () => {
      try {
        const r = await endpoint(payload);
        if (alive) setOut(r);
      } catch (e) {
        if (alive) {
          setErr(e.message);
          setOut({ deploy: `// ERROR: ${e.message}`, rollback: "" });
        }
      }
    }, 250);   // debounce
    return () => { alive = false; clearTimeout(t); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  return { ...out, err };
}

window.api = api;
window.useApiCli = useApiCli;
