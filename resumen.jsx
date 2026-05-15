const { useState: useStateSM } = React;

function tpColor(tp) {
  switch (tp) {
    case "SWITCH":   return "accent";
    case "ROUTER":   return "green";
    case "FIREWALL": return "amber";
    default: return "";
  }
}

function EmptyRow({ label }) {
  return (
    <div className="dev-list-row" style={{gridTemplateColumns: '1fr', justifyContent: 'center'}}>
      <div className="c" style={{color: 'var(--text-4)', textAlign: 'center', fontStyle: 'italic'}}>
        — sin {label} guardados aún —
      </div>
    </div>
  );
}

function Resumen({ session, onClose }) {
  const s = session || { switches: [], routers: [], firewalls: [], vlans_globales: [], log: [] };
  const totalDevices = (s.switches?.length || 0) + (s.routers?.length || 0) + (s.firewalls?.length || 0);

  return (
    <div className="overlay" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <div className="modal-head">
          <div className="titles">
            <h2>Resumen de sesión · {s.proyecto || "—"}</h2>
            <div className="meta">
              creada {s.creada || "—"}
              <span style={{color:'var(--text-4)'}}> · </span>
              {totalDevices} equipos · {(s.log?.length || 0)} acciones registradas
            </div>
          </div>
          <div style={{display:'flex', alignItems:'center', gap: 8}}>
            <button className="btn ghost"
                    onClick={() => navigator.clipboard.writeText(JSON.stringify(s, null, 2))}>
              {Icons.Copy}<span>Copiar JSON</span>
            </button>
            <button className="btn primary"
                    onClick={() => {
                      const blob = new Blob([JSON.stringify(s, null, 2)], {type: "application/json"});
                      const a = document.createElement("a");
                      a.href = URL.createObjectURL(blob);
                      a.download = `SESION_${(s.proyecto||"sesion").replace(/\s/g,"_")}.json`;
                      a.click();
                    }}>
              {Icons.Download}<span>Descargar .json</span>
            </button>
            <div className="close" onClick={onClose}>×</div>
          </div>
        </div>

        <div className="modal-body">
          {/* KPI strip */}
          <div className="summary-grid">
            <div className="kpi accent">
              <div className="kpi-label">{Icons.Switch}Switches</div>
              <div className="kpi-value">{s.switches?.length || 0}</div>
              <div className="kpi-delta">guardados</div>
            </div>
            <div className="kpi">
              <div className="kpi-label">{Icons.Router}Routers</div>
              <div className="kpi-value">{s.routers?.length || 0}</div>
              <div className="kpi-delta">guardados</div>
            </div>
            <div className="kpi">
              <div className="kpi-label">{Icons.Firewall}Firewalls</div>
              <div className="kpi-value">{s.firewalls?.length || 0}</div>
              <div className="kpi-delta">guardados</div>
            </div>
            <div className="kpi">
              <div className="kpi-label">{Icons.Layers}Equipos</div>
              <div className="kpi-value">{totalDevices}</div>
              <div className="kpi-delta">en sesión</div>
            </div>
            <div className="kpi">
              <div className="kpi-label">{Icons.Activity}Acciones</div>
              <div className="kpi-value">{s.log?.length || 0}</div>
              <div className="kpi-delta">registradas</div>
            </div>
          </div>

          {/* Switches */}
          <div className="summary-section">
            <h3>Switches <span className="count">{s.switches?.length || 0}</span></h3>
            <div className="dev-list">
              <div className="dev-list-row head">
                <div className="c ico"></div>
                <div className="c">Hostname</div>
                <div className="c">Vendor</div>
                <div className="c">Mgmt IP</div>
                <div className="c">VLANs</div>
                <div className="c">HA · rol</div>
                <div className="c">Hora</div>
              </div>
              {(s.switches?.length || 0) === 0 ? <EmptyRow label="switches"/> : s.switches.map((d, i) => (
                <div className="dev-list-row" key={d.host + i}>
                  <div className="c ico">{Icons.Switch}</div>
                  <div className="c host">{d.host}</div>
                  <div className="c vendor">{d.vendor}</div>
                  <div className="c">{d.ip || "—"}</div>
                  <div className="c">{d.vlans} vlans</div>
                  <div className="c">
                    <span className={"chip " + (d.role === "primary" ? "green" : "amber")} style={{fontSize: 10}}>
                      <span className="dot"></span>{d.ha || "—"} · {d.role || "—"}
                    </span>
                  </div>
                  <div className="c" style={{color: 'var(--text-3)'}}>{d.ts}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Routers */}
          <div className="summary-section">
            <h3>Routers <span className="count">{s.routers?.length || 0}</span></h3>
            <div className="dev-list">
              <div className="dev-list-row head">
                <div className="c ico"></div>
                <div className="c">Hostname</div>
                <div className="c">Vendor</div>
                <div className="c">LAN</div>
                <div className="c">WAN</div>
                <div className="c">Protocolo</div>
                <div className="c">Hora</div>
              </div>
              {(s.routers?.length || 0) === 0 ? <EmptyRow label="routers"/> : s.routers.map((d, i) => (
                <div className="dev-list-row" key={d.host + i}>
                  <div className="c ico">{Icons.Router}</div>
                  <div className="c host">{d.host}</div>
                  <div className="c vendor">{d.vendor}</div>
                  <div className="c">{d.lan}</div>
                  <div className="c">{d.wan}</div>
                  <div className="c"><span className="chip accent" style={{fontSize: 10}}>{d.proto || "—"}</span></div>
                  <div className="c" style={{color: 'var(--text-3)'}}>{d.ts}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Firewalls */}
          <div className="summary-section">
            <h3>Firewalls <span className="count">{s.firewalls?.length || 0}</span></h3>
            <div className="dev-list">
              <div className="dev-list-row head">
                <div className="c ico"></div>
                <div className="c">Hostname</div>
                <div className="c">Vendor</div>
                <div className="c">LAN</div>
                <div className="c">WAN</div>
                <div className="c">IPv6</div>
                <div className="c">Hora</div>
              </div>
              {(s.firewalls?.length || 0) === 0 ? <EmptyRow label="firewalls"/> : s.firewalls.map((d, i) => (
                <div className="dev-list-row" key={d.host + i}>
                  <div className="c ico">{Icons.Firewall}</div>
                  <div className="c host">{d.host}</div>
                  <div className="c vendor">{d.vendor}</div>
                  <div className="c">{d.ip_lan}</div>
                  <div className="c">{d.ip_wan}</div>
                  <div className="c" style={{color: 'var(--text-3)'}}>{d.ipv6 || "—"}</div>
                  <div className="c" style={{color: 'var(--text-3)'}}>{d.ts}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Activity log */}
          <div className="summary-section">
            <h3>Registro de actividad <span className="count">{s.log?.length || 0}</span></h3>
            <div className="log-table">
              {(s.log?.length || 0) === 0 ? (
                <div className="log-row" style={{gridTemplateColumns: '1fr'}}>
                  <div style={{color: 'var(--text-4)', textAlign: 'center', fontStyle: 'italic'}}>
                    — sin actividad aún · guarda equipos en sesión para empezar a registrar —
                  </div>
                </div>
              ) : s.log.map((l, i) => (
                <div className="log-row" key={i}>
                  <div className="ts">{l.ts}</div>
                  <div className="tp"><span className={"chip " + tpColor(l.tipo || l.tp)} style={{fontSize: 10}}>{l.tipo || l.tp}</span></div>
                  <div className="ds">{l.desc || l.ds}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

window.Resumen = Resumen;
