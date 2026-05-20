const { useState, useEffect } = React;

const TWEAK_DEFAULTS = /*EDITMODE-BEGIN*/{
  "accent": "#4ec9c6",
  "density": "default",
  "theme": "dark",
  "showTopology": true,
  "showInspector": true
}/*EDITMODE-END*/;

const ACCENT_MAP = {
  "#4ec9c6": "teal",
  "#e6b265": "amber",
  "#9d8cf0": "violet",
  "#b5d36b": "lime",
};

function App() {
  const [tweaks, setTweak] = useTweaks(TWEAK_DEFAULTS);
  const importRef = React.useRef(null);

  const [tab, setTab] = useState("switches");
  const [showResumen, setShowResumen] = useState(false);
  const [sessionData, setSessionData] = useState({
    proyecto: "FIBERTEC_OP_2026",
    creada: new Date().toISOString().slice(0,16).replace("T", " "),
    switches: [], routers: [], firewalls: [], vlans_globales: [], log: [],
  });

  const addToSession = (kind, items) => {
    const ts = new Date().toISOString().slice(0,19).replace("T", " ");
    setSessionData(s => {
      const next = {...s};
      next[kind] = [...(s[kind] || []), ...items.map(i => ({...i, ts}))];
      next.log = [...(s.log || []), {
        ts, tipo: kind.toUpperCase().slice(0, -1),
        desc: `${items.length} ${kind.slice(0,-1)}(s) guardados`,
      }];
      return next;
    });
  };

  const saveSessionToDisk = async () => {
    try {
      const r = await api.saveSession(sessionData);
      alert(`Sesión guardada con id ${r.id}`);
    } catch (e) {
      alert(`Error al guardar: ${e.message}`);
    }
  };

  const loadSession = (data) => {
    setSessionData({
      proyecto: data.proyecto || sessionData.proyecto,
      creada:   data.creada   || sessionData.creada,
      switches: data.switches || [],
      routers:  data.routers  || [],
      firewalls:data.firewalls|| [],
      vlans_globales: data.vlans_globales || [],
      log: data.log || [],
    });
    alert(`Sesión "${data.proyecto || "(sin nombre)"}" cargada · ${(data.switches||[]).length}sw ${(data.routers||[]).length}rt ${(data.firewalls||[]).length}fw`);
  };

  const clearSession = () => {
    setSessionData({
      proyecto: sessionData.proyecto,
      creada: new Date().toISOString().slice(0,16).replace("T", " "),
      switches: [], routers: [], firewalls: [], vlans_globales: [], log: [],
    });
  };
  const [globalState, setGlobalState] = useState({
    project: "FIBERTEC_OP_2026",
    ipv6Mode: "ula",
    protoV4: "OSPF",
    protoV6: "Ninguno",
    asNumber: "65001",
    bgpPeer: "192.168.0.254",
    bgpPeerAs: "65002",
    ha: "hsrp",
    haBackup: "192.168.0.254",
    haActive: true,
  });

  useEffect(() => {
    const root = document.documentElement;
    root.dataset.accent  = ACCENT_MAP[tweaks.accent] || "teal";
    root.dataset.density = tweaks.density;
    root.dataset.theme   = tweaks.theme;
  }, [tweaks.accent, tweaks.density, tweaks.theme]);

  useEffect(() => {
    const onKey = (e) => { if (e.key === "Escape") setShowResumen(false); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const tabs = [
    { id: "switches", label: "Switches", icon: Icons.Switch, count: sessionData.switches.length },
    { id: "routers",  label: "Routers",  icon: Icons.Router, count: sessionData.routers.length },
    { id: "firewall", label: "Firewall", icon: Icons.Firewall, count: sessionData.firewalls.length },
    { id: "format",   label: "Formateo previo", icon: Icons.Reset },
  ];

  return (
    <div className="app">
      <div className="brand">
        <div className="brand-mark"></div>
        <div className="brand-name">CORE<em>·</em>NEXUS</div>
        <span className="chip" style={{marginLeft: 6, fontSize: 9}}>v4.5</span>
      </div>

      <div className="header">
        <div className="header-crumbs">
          <span>NOC</span>
          <span className="sep">/</span>
          <span>{globalState.project}</span>
          <span className="sep">/</span>
          <span className="here">{tabs.find(x => x.id === tab)?.label}</span>
        </div>

        <div className="header-spacer"></div>

        <div className="header-actions">
          <div className="session-pill">
            <span className="dot"></span>
            <span className="proj">{sessionData.proyecto}</span>
            <span className="count">· {sessionData.switches.length}sw {sessionData.routers.length}rt {sessionData.firewalls.length}fw</span>
          </div>
          <input ref={importRef} type="file" accept=".json,application/json"
                 style={{display:'none'}}
                 onChange={(e) => {
                   const f = e.target.files?.[0];
                   if (!f) return;
                   const r = new FileReader();
                   r.onload = () => {
                     try { loadSession(JSON.parse(r.result)); }
                     catch (err) { alert("JSON inválido: " + err.message); }
                   };
                   r.readAsText(f);
                   e.target.value = "";
                 }}/>
          <button className="btn ghost" onClick={() => importRef.current?.click()}>
            {Icons.Upload}<span>Importar</span>
          </button>
          <button className="btn ghost" onClick={() => setShowResumen(true)}>{Icons.Eye}<span>Resumen</span></button>
          <button className="btn ghost icon-only" title={tweaks.theme === "dark" ? "Cambiar a modo claro" : "Cambiar a modo oscuro"}
                  onClick={() => setTweak("theme", tweaks.theme === "dark" ? "light" : "dark")}>
            {tweaks.theme === "dark" ? Icons.Sun : Icons.Moon}
          </button>
          <button className="btn primary" onClick={saveSessionToDisk}>{Icons.Download}<span>Exportar</span></button>
        </div>
      </div>

      <Sidebar state={globalState} setState={setGlobalState}
               onLoadSession={loadSession} onClearSession={clearSession}/>

      <main className="main">
        <div className="main-inner">
          <div className="page-head">
            <div>
              <h1>{tabs.find(x => x.id === tab)?.label}</h1>
              <div className="sub">
                CORE-NEXUS Enterprise Network Engine · automation platform · multi-vendor
              </div>
            </div>
            <div className="meta">
              <span className="meta-chip"><span className="k">ipv6</span><span className="v">{globalState.ipv6Mode.toUpperCase()}</span></span>
              <span className="meta-chip"><span className="k">routing</span><span className="v">{globalState.protoV4}</span></span>
              <span className="meta-chip"><span className="k">ha</span><span className="v">{globalState.ha === "none" ? "off" : "on"}</span></span>
              <span className="meta-chip"><span className="k">mgmt</span><span className="v">192.168.255.0/24</span></span>
            </div>
          </div>

          <div className="sub-actions">
            <div style={{flex:1}}></div>
            <span style={{fontFamily:'var(--font-mono)', fontSize:11, color:'var(--text-3)'}}>
              <span className="kbd">⌘</span> <span className="kbd">K</span> comandos rápidos
            </span>
          </div>

          <div className="tabs">
            {tabs.map(x => (
              <button key={x.id} className={"tab" + (tab === x.id ? " active" : "")} onClick={() => setTab(x.id)}>
                {x.icon}
                <span>{x.label}</span>
                {x.count > 0 && <span className="tab-count">{x.count}</span>}
              </button>
            ))}
          </div>

          <div style={{display: tab === "switches" ? "block" : "none"}}>
            <SwitchesTab globalState={globalState} onSave={items => addToSession("switches", items)}/>
          </div>
          <div style={{display: tab === "routers" ? "block" : "none"}}>
            <RoutersTab globalState={globalState} onSave={items => addToSession("routers", items)}/>
          </div>
          <div style={{display: tab === "firewall" ? "block" : "none"}}>
            <FirewallTab globalState={globalState} onSave={items => addToSession("firewalls", items)}/>
          </div>
          <div style={{display: tab === "format" ? "block" : "none"}}>
            <FormatTab/>
          </div>

          <div className="statusbar">
            <span className="item"><span className="dot"></span>online</span>
            <span className="item">session: <span style={{color:'var(--text)'}}>{globalState.project}</span></span>
            <span className="item">vlan-admin: <span style={{color:'var(--text)'}}>10</span></span>
            <span className="item">mgmt: <span style={{color:'var(--text)'}}>192.168.255.1</span></span>
            <span className="spacer"></span>
            <span className="item">build · v4.5.0</span>
            <span className="item">{new Date().toISOString().slice(0,19).replace("T", " ")}</span>
          </div>
        </div>
      </main>

      <TweaksPanel title="Tweaks">
        <TweakSection label="Apariencia">
          <TweakRadio label="Tema" value={tweaks.theme}
            options={[{value:"dark", label:"Oscuro"}, {value:"light", label:"Claro"}]}
            onChange={v => setTweak("theme", v)}/>
          <TweakColor label="Acento" value={tweaks.accent}
            options={["#4ec9c6", "#e6b265", "#9d8cf0", "#b5d36b"]}
            onChange={v => setTweak("accent", v)}/>
          <TweakRadio label="Densidad" value={tweaks.density}
            options={[
              {value:"compact", label:"Compacta"},
              {value:"default", label:"Normal"},
              {value:"comfortable", label:"Amplia"},
            ]}
            onChange={v => setTweak("density", v)}/>
        </TweakSection>
        <TweakSection label="Componentes">
          <TweakToggle label="Topología visible" value={tweaks.showTopology} onChange={v => setTweak("showTopology", v)}/>
          <TweakToggle label="Inspector visible" value={tweaks.showInspector} onChange={v => setTweak("showInspector", v)}/>
        </TweakSection>
      </TweaksPanel>

      {showResumen && <Resumen session={sessionData} onClose={() => setShowResumen(false)}/>}
    </div>
  );
}

ReactDOM.createRoot(document.getElementById("root")).render(<App/>);
