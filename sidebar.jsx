const { useState } = React;

function Field({ label, hint, hintTone, children }) {
  return (
    <div className="side-row">
      <label>{label}</label>
      {children}
      {hint && <div className={"field-hint" + (hintTone ? " " + hintTone : "")}>{hint}</div>}
    </div>
  );
}

function Sidebar({ state, setState, onLoadSession, onClearSession }) {
  const ipv6Modes = [
    { value: "ula", label: "ULA · fd00::/8 (Recomendado)", hint: "Enrutable entre VLANs", tone: "ok" },
    { value: "ll",  label: "Link-Local · fe80::",         hint: "Solo dentro del mismo segmento", tone: "warn" },
    { value: "off", label: "Sin IPv6 · Solo IPv4",        hint: "IPv6 desactivado", tone: null },
  ];
  const ipv6Sel = ipv6Modes.find(m => m.value === state.ipv6Mode);
  const fileRef = React.useRef(null);

  const handleLoad = (e) => {
    const f = e.target.files?.[0];
    if (!f) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const data = JSON.parse(reader.result);
        onLoadSession && onLoadSession(data);
      } catch (err) {
        alert("Archivo JSON inválido: " + err.message);
      }
    };
    reader.readAsText(f);
    e.target.value = "";          // permite re-cargar el mismo archivo
  };

  const handleClear = () => {
    if (confirm("¿Vaciar la sesión actual? Esta acción no se puede deshacer.")) {
      onClearSession && onClearSession();
    }
  };

  return (
    <aside className="sidebar">
      <div className="side-group">
        <div className="side-title">Proyecto</div>
        <Field label="Nombre del proyecto">
          <input className="field" value={state.project} onChange={e => setState({...state, project: e.target.value})}/>
        </Field>
        <div style={{display:'flex', gap:6, marginTop: 10}}>
          <input ref={fileRef} type="file" accept=".json,application/json"
                 style={{display:'none'}} onChange={handleLoad}/>
          <button className="btn ghost" style={{flex:1}} onClick={() => fileRef.current?.click()}>
            {Icons.Folder}<span>Cargar</span>
          </button>
          <button className="btn ghost" style={{flex:1}} onClick={handleClear}>
            {Icons.Reset}<span>Limpiar</span>
          </button>
        </div>
      </div>

      <div className="side-group">
        <div className="side-title">Direccionamiento</div>
        <Field label="Modo IPv6" hint={ipv6Sel.hint} hintTone={ipv6Sel.tone}>
          <select className="field" value={state.ipv6Mode} onChange={e => setState({...state, ipv6Mode: e.target.value})}>
            {ipv6Modes.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
          </select>
        </Field>
      </div>

      <div className="side-group">
        <div className="side-title">Protocolos de Enrutamiento</div>
        <Field label="IPv4">
          <select className="field" value={state.protoV4} onChange={e => setState({...state, protoV4: e.target.value})}>
            <option>Ninguno</option><option>RIP v2</option><option>EIGRP</option><option>BGP</option><option>OSPF</option>
          </select>
        </Field>
        <Field label="IPv6">
          <select className="field" value={state.protoV6} onChange={e => setState({...state, protoV6: e.target.value})}
                  disabled={state.ipv6Mode === "off"}>
            <option>Ninguno</option><option>RIPng</option><option>OSPFv3</option><option>EIGRPv6</option>
          </select>
        </Field>
        {(state.protoV4 === "BGP" || state.protoV4 === "EIGRP" || state.protoV6 === "EIGRPv6") && (
          <Field label="AS Local"><input className="field" value={state.asNumber} onChange={e => setState({...state, asNumber: e.target.value})}/></Field>
        )}
        {state.protoV4 === "BGP" && (
          <>
            <Field label="Vecino BGP"><input className="field" value={state.bgpPeer} onChange={e => setState({...state, bgpPeer: e.target.value})}/></Field>
            <Field label="AS del vecino"><input className="field" value={state.bgpPeerAs} onChange={e => setState({...state, bgpPeerAs: e.target.value})}/></Field>
          </>
        )}
      </div>

      <div className="side-group">
        <div className="side-title">Alta Disponibilidad</div>
        <div className="ha-list">
          {[
            { v: "none", n: "Ninguno",           d: "Sin redundancia" },
            { v: "hsrp", n: "HSRP / VRRP",       d: "Gateway redundante" },
            { v: "ipsla", n: "IP SLA + Floating", d: "Ruta de respaldo activa" },
            { v: "stp", n: "Rapid PVST + LACP",  d: "Loop-free + agregación" },
            { v: "full", n: "Completo",          d: "Las tres políticas" },
          ].map(o => (
            <div key={o.v} className={"ha-opt" + (state.ha === o.v ? " sel" : "")}
                 onClick={() => setState({...state, ha: o.v})}>
              <div className="ha-radio"></div>
              <div>
                <div className="ha-name">{o.n}</div>
                <div className="ha-desc">{o.d}</div>
              </div>
            </div>
          ))}
        </div>
        {state.ha !== "none" && (
          <>
            <Field label="IP de respaldo / próximo salto">
              <input className="field" value={state.haBackup} onChange={e => setState({...state, haBackup: e.target.value})}/>
            </Field>
            <div className="toggle-row">
              <span className="lbl">Equipo activo / primario</span>
              <div className={"toggle" + (state.haActive ? " on" : "")} onClick={() => setState({...state, haActive: !state.haActive})}></div>
            </div>
          </>
        )}
      </div>

      <div className="side-group">
        <div className="side-title">Credenciales por Defecto</div>
        <div className="creds">
          <div className="line"><span className="k">SSH</span><span className="v">ntxadmin / NtxAdmin2026</span></div>
          <div className="line"><span className="k">BASE</span><span className="v">192.168.x.1</span></div>
          <div className="line"><span className="k">MGMT</span><span className="v">192.168.255.1 · VLAN 10</span></div>
        </div>
        <div className="field-hint" style={{marginTop: 8, lineHeight: 1.5}}>
          Cumple política Huawei (≥6 chars usuario, ≥8 mixto password).
        </div>
      </div>
    </aside>
  );
}

window.Sidebar = Sidebar;
