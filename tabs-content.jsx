const { useState: useStateTC } = React;

function downloadText(filename, content) {
  const blob = new Blob([content], { type: "text/plain" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = filename;
  a.click();
  URL.revokeObjectURL(a.href);
}

/* ─── Vendor picker ─── */
function VendorPick({ value, onChange, vendors }) {
  return (
    <div className="vendor-pick">
      {vendors.map(v => (
        <div key={v.id} className={"vendor-opt" + (value === v.id ? " sel" : "")} onClick={() => onChange(v.id)}>
          <div className="vlogo">{v.short}</div>
          <div>
            <div className="vname">{v.name}</div>
            <div className="vdesc">{v.desc}</div>
          </div>
        </div>
      ))}
    </div>
  );
}

/* ─── Number stepper ─── */
function Stepper({ value, onChange, min = 1, max = 50 }) {
  return (
    <div className="stepper">
      <button onClick={() => onChange(Math.max(min, value - 1))}>−</button>
      <input type="text" value={value} onChange={e => {
        const n = parseInt(e.target.value); if (!isNaN(n)) onChange(Math.max(min, Math.min(max, n)));
      }}/>
      <button onClick={() => onChange(Math.min(max, value + 1))}>+</button>
    </div>
  );
}

/* ─── Topology mini ─── */
function TopologyMini({ numSwitches, ha, vlans }) {
  const sw = Array.from({length: numSwitches}).map((_, i) => i);
  return (
    <div className="topo-card">
      <div style={{display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom: 8}}>
        <div style={{display:'flex', alignItems:'center', gap:8}}>
          <span style={{fontSize:12, fontWeight:600, color:'var(--text)'}}>Topología lógica</span>
          <span className="chip">{numSwitches} sw · {vlans} vlan · {ha !== "none" ? "HA" : "single"}</span>
        </div>
        <span style={{fontFamily:'var(--font-mono)', fontSize:10, color:'var(--text-4)'}}>L2/L3 · preview</span>
      </div>
      <svg className="topo-svg" viewBox="0 0 800 180" preserveAspectRatio="xMidYMid meet">
        <defs>
          <linearGradient id="link" x1="0" x2="1">
            <stop offset="0%" stopColor="var(--accent)" stopOpacity="0.15"/>
            <stop offset="50%" stopColor="var(--accent)" stopOpacity="0.6"/>
            <stop offset="100%" stopColor="var(--accent)" stopOpacity="0.15"/>
          </linearGradient>
        </defs>
        {/* Core */}
        <g>
          <rect x="350" y="14" width="100" height="32" rx="6" fill="var(--bg-2)" stroke="var(--border-2)"/>
          <text x="400" y="34" fill="var(--text)" fontFamily="IBM Plex Mono" fontSize="11" fontWeight="600" textAnchor="middle">WAN / CORE</text>
        </g>
        {/* Switch row */}
        {sw.map((_, i) => {
          const x = (800 / (numSwitches + 1)) * (i + 1);
          return (
            <g key={i}>
              <line x1="400" y1="46" x2={x} y2="82" stroke="url(#link)" strokeWidth="1.5"/>
              <rect x={x-44} y="82" width="88" height="34" rx="5" fill="var(--bg-1)" stroke="var(--accent)" strokeOpacity="0.5"/>
              <circle cx={x-32} cy="99" r="3" fill="var(--green)"/>
              <text x={x-22} y="103" fill="var(--text)" fontFamily="IBM Plex Mono" fontSize="11" fontWeight="600">SW-{String(i+1).padStart(2,'0')}</text>
              {/* VLAN trunk ports */}
              {Array.from({length: Math.min(vlans, 6)}).map((_, j) => (
                <rect key={j} x={x-36 + j*12} y="122" width="8" height="3" rx="1" fill="var(--accent)" opacity={0.4 + j*0.1}/>
              ))}
              {/* End-host */}
              <line x1={x} y1="140" x2={x} y2="156" stroke="var(--border-2)" strokeDasharray="2 2"/>
              <circle cx={x} cy="164" r="4" fill="var(--bg-3)" stroke="var(--border-3)"/>
            </g>
          );
        })}
        {/* HA bridge */}
        {ha !== "none" && numSwitches > 1 && (
          <line x1={(800 / (numSwitches + 1))} y1="99" x2={(800 / (numSwitches + 1)) * numSwitches} y2="99"
                stroke="var(--amber)" strokeWidth="1.5" strokeDasharray="4 3" opacity="0.6"/>
        )}
      </svg>
    </div>
  );
}

/* ─── Sample deploy / rollback generation ─── */
function buildSwitchDeploy(vendor, host, vlans, ha, mgmtIp, protoV4) {
  const lines = [];
  lines.push(`! ${"=".repeat(56)}`);
  lines.push(`! CORE-NEXUS · ${host} · vendor=${vendor}`);
  lines.push(`! generated ${new Date().toISOString().slice(0,19).replace("T", " ")}`);
  lines.push(`! ${"=".repeat(56)}`);

  if (vendor === "cisco") {
    lines.push("enable", "configure terminal", `hostname ${host}`);
    lines.push("vlan 10", " name VLAN_ADMIN_MGMT", " exit");
    lines.push("interface vlan 10", ` ip address ${mgmtIp} 255.255.255.0`, " no shutdown", " exit");
    lines.push("ip ssh version 2", "username admin privilege 15 secret admin");
    lines.push("line vty 0 4", " transport input ssh", " login local", " exit");
    vlans.forEach(v => {
      lines.push("");
      lines.push(`! ── ${v.name} (vlan ${v.vlan}) ──`);
      lines.push(`vlan ${v.vlan}`, ` name ${v.name}`, " exit");
      lines.push(`interface vlan ${v.vlan}`, ` ip address ${v.ipv4} 255.255.255.0`);
      if (v.ipv6) lines.push(` ipv6 address ${v.ipv6}`, " ipv6 enable");
      lines.push(" no shutdown", " exit");
      lines.push(`ip dhcp pool POOL_${v.vlan}`,
                 ` network ${v.ipv4.split(".").slice(0,3).join(".")}.0 255.255.255.0`,
                 ` default-router ${v.ipv4}`,
                 " dns-server 8.8.8.8", " exit");
      if (protoV4 === "OSPF") lines.push(`router ospf 1`, ` network ${v.ipv4.split(".").slice(0,3).join(".")}.0 0.0.0.255 area 0`, " exit");
      if (ha === "hsrp" || ha === "full") {
        const virt = v.ipv4.split(".").slice(0,3).join(".") + ".254";
        lines.push(`interface vlan ${v.vlan}`,
                   ` standby 1 ip ${virt}`,
                   ` standby 1 priority 110`,
                   ` standby 1 preempt`,
                   " exit");
      }
    });
    lines.push("", "end", "write memory");
  } else if (vendor === "huawei") {
    lines.push("system-view", `sysname ${host}`, "dhcp enable");
    vlans.forEach(v => {
      lines.push("", `! ── ${v.name} ──`);
      lines.push(`vlan ${v.vlan}`, ` description ${v.name}`, " quit");
      lines.push(`interface Vlanif${v.vlan}`, ` ip address ${v.ipv4} 255.255.255.0`,
                 " dhcp select interface", " quit");
    });
    lines.push("return", "save");
  } else {
    lines.push("config system global", ` set hostname ${host}`, "end");
    vlans.forEach(v => {
      lines.push("config system interface", `    edit vlan${v.vlan}`,
                 `        set vdom root`, `        set ip ${v.ipv4} 255.255.255.0`,
                 `        set vlanid ${v.vlan}`, "        set interface internal",
                 "    next", "end");
    });
  }
  return lines.join("\n");
}

function buildSwitchRollback(vendor, host, vlans) {
  const lines = [];
  lines.push(`! ROLLBACK · ${host}`);
  lines.push(`! ${"=".repeat(56)}`);
  if (vendor === "cisco") {
    lines.push("enable", "configure terminal");
    vlans.forEach(v => {
      lines.push(`no ip dhcp pool POOL_${v.vlan}`);
      lines.push(`no interface vlan ${v.vlan}`);
      lines.push(`no vlan ${v.vlan}`);
    });
    lines.push("end", "write memory");
  } else if (vendor === "huawei") {
    lines.push("system-view");
    vlans.forEach(v => { lines.push(`undo interface Vlanif${v.vlan}`); lines.push(`undo vlan ${v.vlan}`); });
    lines.push("return", "save");
  } else {
    lines.push("config system interface");
    vlans.forEach(v => lines.push(`    delete vlan${v.vlan}`));
    lines.push("end");
  }
  return lines.join("\n");
}

/* ─── Switches Tab ─── */
function SwitchesTab({ globalState, onSave }) {
  const [vendor, setVendor] = useStateTC("cisco");
  const [numSw, setNumSw] = useStateTC(2);
  const [hostBase, setHostBase] = useStateTC("CORE-SW");
  const [vlans, setVlans] = useStateTC(() => ([
    { vlan: 11, name: "VLAN_USERS",    ipv4: "192.168.1.1", ipv6: "fd00:A8:01::01/64", dhcp: true },
    { vlan: 12, name: "VLAN_VOIP",     ipv4: "192.168.2.1", ipv6: "fd00:A8:02::01/64", dhcp: true },
    { vlan: 13, name: "VLAN_GUEST",    ipv4: "192.168.3.1", ipv6: "fd00:A8:03::01/64", dhcp: true },
    { vlan: 14, name: "VLAN_PRINTERS", ipv4: "192.168.4.1", ipv6: "fd00:A8:04::01/64", dhcp: true },
  ]));
  const [activeDevice, setActiveDevice] = useStateTC(0);

  const vendors = [
    { id: "cisco",    short: "C",  name: "Cisco IOS",      desc: "IOS / IOS-XE · Catalyst" },
    { id: "huawei",   short: "H",  name: "Huawei VRP",     desc: "S-series · CloudEngine" },
    { id: "fortinet", short: "F",  name: "Fortinet FortiOS",desc: "FortiSwitch · FortiGate" },
  ];

  const devices = Array.from({length: numSw}).map((_, i) => ({
    host: `${hostBase}-${String(i+1).padStart(2,'0')}`,
    ip:   `192.168.255.${i+1}`,
    role: i === 0 ? "primary" : (globalState.ha !== "none" ? "standby" : "primary"),
  }));

  const currentHost = devices[activeDevice]?.host || "host";

  // Generación de CLI vía API (Python engine)
  const switchPayload = {
    vendor: vendor === "cisco" ? "Cisco" : vendor === "huawei" ? "Huawei" : "Fortinet",
    host: currentHost,
    vlans: vlans.map(v => ({ vlan: v.vlan, name: v.name, ipv4: v.ipv4, ipv6: v.ipv6 })),
    proto_v4: globalState.protoV4,
    proto_v6: globalState.protoV6,
    as_number: parseInt(globalState.asNumber) || 65001,
    bgp_neighbor: globalState.bgpPeer,
    bgp_neighbor_as: parseInt(globalState.bgpPeerAs) || 65002,
    ospf_router_id: "1.1.1.1",
    vlan_admin: 10,
    ip_admin: devices[activeDevice]?.ip || "192.168.255.1",
    modo_ha: ({ none: "Ninguno", hsrp: "HSRP/VRRP", ipsla: "IP SLA + Ruta Flotante",
                stp: "STP Rápido + EtherChannel", full: "Completo" })[globalState.ha],
    ip_respaldo: globalState.haBackup,
    es_activo: globalState.haActive,
  };
  const { deploy, rollback } = useApiCli(api.switch, switchPayload,
    [vendor, currentHost, JSON.stringify(vlans), globalState.protoV4, globalState.protoV6,
     globalState.ha, globalState.haActive, globalState.haBackup, globalState.asNumber,
     globalState.bgpPeer, globalState.bgpPeerAs, activeDevice]);

  return (
    <div>
      {/* KPI strip */}
      <div className="kpi-strip" style={{marginBottom: 16}}>
        <div className="kpi accent">
          <div className="kpi-label">{Icons.Switch}Switches</div>
          <div className="kpi-value">{numSw}</div>
          <div className="kpi-delta up">+ generados</div>
        </div>
        <div className="kpi">
          <div className="kpi-label">{Icons.Layers}VLANs</div>
          <div className="kpi-value">{vlans.length}</div>
          <div className="kpi-delta">{vlans[0]?.vlan}–{vlans[vlans.length-1]?.vlan}</div>
        </div>
        <div className="kpi">
          <div className="kpi-label">{Icons.Globe}IPv6</div>
          <div className="kpi-value">{globalState.ipv6Mode === "off" ? "—" : (globalState.ipv6Mode === "ula" ? "ULA" : "LL")}</div>
          <div className="kpi-delta">{globalState.ipv6Mode === "off" ? "deshabilitado" : "fd00::/8"}</div>
        </div>
        <div className="kpi">
          <div className="kpi-label">{Icons.Shield}HA</div>
          <div className="kpi-value" style={{fontSize: 16, paddingTop: 4}}>
            {{none:"Ninguno", hsrp:"HSRP", ipsla:"IP SLA", stp:"STP+LACP", full:"Completo"}[globalState.ha]}
          </div>
          <div className="kpi-delta">{globalState.ha === "none" ? "single point" : "redundante"}</div>
        </div>
        <div className="kpi">
          <div className="kpi-label">{Icons.Activity}Líneas CLI</div>
          <div className="kpi-value">{deploy.split("\n").length}</div>
          <div className="kpi-delta">deploy script</div>
        </div>
      </div>

      <TopologyMini numSwitches={numSw} ha={globalState.ha} vlans={vlans.length}/>

      <div className="split">
        <div>
          {/* Parameters panel */}
          <div className="panel">
            <div className="panel-head">
              <div className="title">
                <h2>Parámetros del switch</h2>
                <span className="desc">vendor · cantidad · hostname</span>
              </div>
              <div style={{display:'flex', gap:6}}>
                <span className="chip accent"><span className="dot"></span>{vendor}</span>
              </div>
            </div>
            <div className="panel-body">
              <div style={{marginBottom: 14}}>
                <label style={{fontSize:11, color:'var(--text-3)', display:'block', marginBottom:8, fontWeight:500}}>Fabricante</label>
                <VendorPick value={vendor} onChange={setVendor} vendors={vendors}/>
              </div>
              <div className="form-grid">
                <div className="form-cell">
                  <label>Cantidad de switches</label>
                  <Stepper value={numSw} onChange={setNumSw} min={1} max={50}/>
                </div>
                <div className="form-cell">
                  <label>Prefijo de hostname</label>
                  <input className="field" value={hostBase} onChange={e => setHostBase(e.target.value)}/>
                </div>
                <div className="form-cell">
                  <label>Plantilla DHCP por VLAN</label>
                  <select className="field" defaultValue="auto">
                    <option value="auto">Automática · gateway .1, range .10–.250</option>
                    <option value="manual">Manual</option>
                    <option value="off">Sin DHCP</option>
                  </select>
                </div>
              </div>
            </div>
          </div>

          {/* VLAN editor */}
          <div className="panel">
            <div className="panel-head">
              <div className="title">
                <h2>VLANs</h2>
                <span className="desc">independientes del número de switches · todas se aplican a todos los equipos</span>
              </div>
              <div style={{display:'flex', alignItems:'center', gap:6}}>
                <span className="chip">{vlans.length} configuradas</span>
                <span className="chip accent">{globalState.ipv6Mode === "off" ? "IPv4" : "Dual-stack"}</span>
              </div>
            </div>
            <div className="panel-body" style={{padding: 0, background: 'var(--bg-1)'}}>
              <VlanEditor vlans={vlans} setVlans={setVlans} ipv6Mode={globalState.ipv6Mode}/>
            </div>
          </div>

          {/* Devices */}
          <div className="panel">
            <div className="panel-head">
              <div className="title">
                <h2>Equipos generados</h2>
                <span className="desc">selecciona uno para previsualizar su CLI</span>
              </div>
              <div style={{display:'flex', gap:6}}></div>
            </div>
            <div className="panel-body">
              <div className="device-grid">
                {devices.map((d, i) => (
                  <div key={d.host} className="dev-card" style={{borderColor: i === activeDevice ? "var(--accent)" : undefined, cursor:'pointer'}}
                       onClick={() => setActiveDevice(i)}>
                    <div className="top">
                      <span className="host">{d.host}</span>
                      <span className="stat-led"></span>
                    </div>
                    <div className="meta">
                      <div className="row"><span>mgmt</span><span className="v">{d.ip}</span></div>
                      <div className="row"><span>vlans</span><span className="v">{vlans.length}</span></div>
                      <div className="row"><span>rol</span>
                        <span className="v" style={{color: d.role === "primary" ? "var(--green)" : "var(--amber)"}}>
                          {d.role}
                        </span>
                      </div>
                    </div>
                    <div className="bar"><div className="fill"></div></div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Code preview */}
          <CodePreview deploy={deploy} rollback={rollback} hostname={currentHost}/>

          <div style={{display:'flex', gap:8, marginTop: 14}}>
            <button className="btn primary" style={{height: 34, padding: '0 16px'}}
                    onClick={() => onSave && onSave(devices.map(d => ({
                      host: d.host, vendor, ip: d.ip, role: d.role,
                      vlans: vlans.length, vlanIds: vlans.map(v => v.vlan),
                      ha: globalState.ha,
                    })))}>
              {Icons.Save}<span>Guardar {numSw} switch(es) en sesión</span>
            </button>
            <button className="btn" style={{height: 34, padding: '0 16px'}}
                    onClick={() => downloadText(
                      `${currentHost}_${new Date().toISOString().slice(0,10)}.txt`,
                      `! CORE-NEXUS · ${currentHost}\n! Deploy + Rollback\n\n=== DEPLOY ===\n${deploy}\n\n=== ROLLBACK ===\n${rollback}\n`
                    )}>
              {Icons.Download}<span>Descargar .txt</span>
            </button>
            <div style={{flex:1}}></div>
            <span style={{fontFamily:'var(--font-mono)', fontSize:11, color:'var(--text-3)', alignSelf:'center'}}>
              <span className="kbd">⌘</span> <span className="kbd">S</span> para guardar
            </span>
          </div>
        </div>

        {/* Right rail — Inspector */}
        <div>
          <div className="panel">
            <div className="panel-head">
              <div className="title"><h2>Inspector</h2><span className="desc">{currentHost}</span></div>
            </div>
            <div className="panel-body" style={{display:'grid', gap:12}}>
              <InspectorRow k="Vendor"     v={vendor}/>
              <InspectorRow k="Hostname"   v={currentHost}/>
              <InspectorRow k="Mgmt IP"    v={devices[activeDevice]?.ip || "—"}/>
              <InspectorRow k="VLAN mgmt"  v="10"/>
              <InspectorRow k="SSH"        v="admin / ••••"/>
              <InspectorRow k="Routing v4" v={globalState.protoV4}/>
              <InspectorRow k="Routing v6" v={globalState.protoV6}/>
              <InspectorRow k="HA"         v={{none:"Ninguno", hsrp:"HSRP/VRRP", ipsla:"IP SLA", stp:"STP+LACP", full:"Completo"}[globalState.ha]}/>
              <InspectorRow k="Rol"        v={globalState.haActive ? "Primario" : "Standby"}/>
            </div>
          </div>

          <div className="panel">
            <div className="panel-head">
              <div className="title"><h2>Pre-check</h2><span className="desc">validación local</span></div>
            </div>
            <div className="panel-body">
              <CheckRow ok label="Rangos de VLAN dentro de 2–4094"/>
              <CheckRow ok label="Sin colisión de subredes"/>
              <CheckRow ok label="IP de gestión fuera del pool DHCP"/>
              <CheckRow warn label="Considerar 802.1X en VLAN_GUEST"/>
              <CheckRow ok label="SSH v2 + RSA 2048"/>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function InspectorRow({ k, v }) {
  return (
    <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', borderBottom:'1px solid var(--border)', paddingBottom: 8}}>
      <span style={{fontFamily:'var(--font-mono)', fontSize:10, letterSpacing:1, textTransform:'uppercase', color:'var(--text-3)'}}>{k}</span>
      <span style={{fontFamily:'var(--font-mono)', fontSize:12, color:'var(--text)'}}>{v}</span>
    </div>
  );
}

function CheckRow({ ok, warn, label }) {
  return (
    <div style={{display:'flex', alignItems:'center', gap:10, padding: '7px 0', fontSize: 12, color: 'var(--text-2)'}}>
      <span style={{
        width: 14, height: 14, borderRadius: 4,
        background: ok ? "var(--green-bg)" : warn ? "var(--amber-bg)" : "var(--red-bg)",
        color:      ok ? "var(--green)"    : warn ? "var(--amber)"    : "var(--red)",
        display:'grid', placeItems:'center', flexShrink:0,
      }}>
        {ok ? Icons.Check : <span style={{fontWeight:700, fontSize: 11}}>!</span>}
      </span>
      <span>{label}</span>
    </div>
  );
}

/* ─── Router CLI builders ─── */
function buildRouterDeploy(vendor, host, lan, wan, ifaceLan, ifaceWan, protoV4, ha) {
  const lines = [];
  const lanNet = lan.split(".").slice(0,3).join(".") + ".0";
  const wanGw  = wan.split(".").slice(0,3).join(".") + ".254";
  lines.push(`! ${"=".repeat(56)}`);
  lines.push(`! CORE-NEXUS · ${host} · vendor=${vendor}`);
  lines.push(`! ${"=".repeat(56)}`);

  if (vendor === "cisco") {
    lines.push("enable", "crypto key generate rsa modulus 2048", "configure terminal",
               `hostname ${host}`, "ip ssh version 2",
               "username admin privilege 15 secret admin",
               "line vty 0 4", " transport input ssh", " login local", " exit");
    lines.push(`interface ${ifaceLan}`, ` ip address ${lan} 255.255.255.0`,
               " description LAN", " no shutdown", " exit");
    lines.push(`interface ${ifaceWan}`, ` ip address ${wan} 255.255.255.0`,
               " description WAN", " no shutdown", " exit");
    lines.push(`ip route 0.0.0.0 0.0.0.0 ${wanGw}`);
    if (protoV4 === "OSPF") {
      lines.push("router ospf 1", ` network ${lanNet} 0.0.0.255 area 0`, " exit");
    } else if (protoV4 === "BGP") {
      lines.push("router bgp 65001", ` neighbor ${wanGw} remote-as 65002`,
                 ` network ${lanNet} mask 255.255.255.0`, " exit");
    } else if (protoV4 === "EIGRP") {
      lines.push("router eigrp 1", ` network ${lanNet} 0.0.0.255`, " no auto-summary", " exit");
    } else if (protoV4 === "RIP v2") {
      lines.push("router rip", " version 2", ` network ${lanNet}`, " no auto-summary", " exit");
    }
    if (ha === "ipsla" || ha === "full") {
      lines.push("ip sla 1", ` icmp-echo ${wanGw} source-interface ${ifaceLan}`,
                 " frequency 5", " exit",
                 "ip sla schedule 1 life forever start-time now",
                 "track 1 ip sla 1 reachability");
    }
    lines.push("end", "write memory");
  } else if (vendor === "huawei") {
    lines.push("system-view", `sysname ${host}`,
               "rsa local-key-pair create", "stelnet server enable",
               "aaa", " local-user admin password irreversible-cipher admin",
               " local-user admin service-type ssh",
               " local-user admin privilege level 15", " quit");
    lines.push(`interface ${ifaceLan}`, ` ip address ${lan} 255.255.255.0`,
               " description LAN", " quit");
    lines.push(`interface ${ifaceWan}`, ` ip address ${wan} 255.255.255.0`,
               " description WAN", " quit");
    lines.push(`ip route-static 0.0.0.0 0 ${wanGw}`);
    if (protoV4 === "OSPF") {
      lines.push("ospf 1", ` area 0`, ` network ${lanNet} 0.0.0.255`, " quit", " quit");
    }
    lines.push("return", "save");
  } else {
    lines.push("config system global", ` set hostname ${host}`, "end");
    lines.push("config system interface",
               `    edit ${ifaceLan}`,
               "        set mode static",
               `        set ip ${lan} 255.255.255.0`,
               "        set allowaccess ping ssh",
               "        set description LAN", "    next",
               `    edit ${ifaceWan}`,
               "        set mode static",
               `        set ip ${wan} 255.255.255.0`,
               "        set allowaccess ping",
               "        set description WAN", "    next", "end");
    lines.push("config router static", "    edit 1",
               `        set gateway ${wanGw}`,
               `        set device ${ifaceWan}`, "    next", "end");
  }
  return lines.join("\n");
}

function buildRouterRollback(vendor, host, ifaceLan, ifaceWan) {
  const lines = [`! ROLLBACK · ${host}`, `! ${"=".repeat(56)}`];
  if (vendor === "cisco") {
    lines.push("enable", "configure terminal",
               `no interface ${ifaceLan}`, `no interface ${ifaceWan}`,
               "no router ospf 1", "no router bgp 65001", "no router eigrp 1", "no router rip",
               "no ip sla 1", "no track 1",
               "end", "write memory");
  } else if (vendor === "huawei") {
    lines.push("system-view",
               `undo interface ${ifaceLan}`, `undo interface ${ifaceWan}`,
               "undo ospf 1", "return", "save");
  } else {
    lines.push("config system interface",
               `    edit ${ifaceLan}`, "        unset ip", "    next",
               `    edit ${ifaceWan}`, "        unset ip", "    next", "end",
               "config router static", "    delete 1", "end");
  }
  return lines.join("\n");
}

/* ─── Router tab ─── */
function RoutersTab({ globalState, onSave }) {
  const [vendor, setVendor] = useStateTC("cisco");
  const [numRt, setNumRt] = useStateTC(2);
  const [model, setModel] = useStateTC("isr4k");
  const [activeRt, setActiveRt] = useStateTC(0);
  const vendors = [
    { id: "cisco", short: "C", name: "Cisco IOS-XE", desc: "ISR 4000 · 8000 series" },
    { id: "huawei", short: "H", name: "Huawei VRP",   desc: "NetEngine · AR" },
    { id: "fortinet", short: "F", name: "FortiGate",  desc: "FGT · routing mode" },
  ];
  const models = {
    isr4k: ["GigabitEthernet0/0/0", "GigabitEthernet0/0/1"],
    isr2k: ["GigabitEthernet0/0",   "GigabitEthernet0/1"],
    pt4321:["GigabitEthernet0/0/0", "GigabitEthernet0/0/1"],
    pt1841:["FastEthernet0/0",      "FastEthernet0/1"],
  };
  const [ifLan, ifWan] = vendor === "cisco" ? models[model]
                       : vendor === "huawei" ? ["GigabitEthernet0/0/0", "GigabitEthernet0/0/1"]
                       : ["internal", "wan1"];
  const routers = Array.from({length: numRt}).map((_, i) => ({
    host: `CORE-RT-${String(i+1).padStart(2,'0')}`,
    lan: `192.168.${100+i}.1`,
    wan: `203.0.113.${i+1}`,
  }));
  const curRt = routers[activeRt] || routers[0];
  const routerPayload = {
    vendor: vendor === "cisco" ? "Cisco" : vendor === "huawei" ? "Huawei" : "Fortinet",
    host: curRt.host, ipv4: curRt.lan, ipv6: null,
    proto_v4: globalState.protoV4,
    proto_v6: globalState.protoV6,
    as_number: parseInt(globalState.asNumber) || 65001,
    bgp_neighbor: globalState.bgpPeer,
    bgp_neighbor_as: parseInt(globalState.bgpPeerAs) || 65002,
    ospf_router_id: "1.1.1.1",
    vlan_admin: 10, ip_admin: "192.168.255.1",
    modo_ha: ({ none: "Ninguno", hsrp: "HSRP/VRRP", ipsla: "IP SLA + Ruta Flotante",
                stp: "STP Rápido + EtherChannel", full: "Completo" })[globalState.ha],
    ip_respaldo: globalState.haBackup,
    es_activo: globalState.haActive,
    iface_lan: ifLan, iface_wan: ifWan,
  };
  const { deploy: rtDeploy, rollback: rtRollback } = useApiCli(api.router, routerPayload,
    [vendor, curRt.host, curRt.lan, ifLan, ifWan, globalState.protoV4, globalState.ha, activeRt, numRt]);

  return (
    <div>
      <div className="note">
        <div className="ic">i</div>
        <div>
          Los routers usan interfaces físicas LAN/WAN sin VLANs propias. Selecciona el modelo para que la plantilla genere los nombres correctos
          de interfaz (<b>GigabitEthernet0/0/0</b> en ISR 4000, <b>FastEthernet0/0</b> en Packet Tracer, etc).
        </div>
      </div>

      <div className="panel">
        <div className="panel-head">
          <div className="title"><h2>Parámetros del router</h2><span className="desc">vendor · cantidad · modelo de interfaces</span></div>
        </div>
        <div className="panel-body">
          <div style={{marginBottom: 14}}>
            <label style={{fontSize:11, color:'var(--text-3)', display:'block', marginBottom:8, fontWeight:500}}>Fabricante</label>
            <VendorPick value={vendor} onChange={setVendor} vendors={vendors}/>
          </div>
          <div className="form-grid">
            <div className="form-cell">
              <label>Cantidad de routers</label>
              <Stepper value={numRt} onChange={setNumRt} min={1} max={20}/>
            </div>
            <div className="form-cell">
              <label>Prefijo de hostname</label>
              <input className="field" defaultValue="CORE-RT"/>
            </div>
            <div className="form-cell">
              <label>Octeto inicial LAN (192.168.X.1)</label>
              <input className="field" defaultValue="100"/>
            </div>
          </div>
          {vendor === "cisco" && (
            <div style={{marginTop: 14}}>
              <label style={{fontSize:11, color:'var(--text-3)', display:'block', marginBottom:5, fontWeight:500}}>Modelo / Tipo de interfaces</label>
              <select className="field" value={model} onChange={e => setModel(e.target.value)} style={{maxWidth: 480}}>
                <option value="isr4k">ISR 4321/4331/4351 — GigabitEthernet0/0/0 · 0/0/1</option>
                <option value="isr2k">ISR 2900/3900 — GigabitEthernet0/0 · 0/1</option>
                <option value="pt4321">Packet Tracer · Router 4321 — Gi0/0/0 · Gi0/0/1</option>
                <option value="pt1841">Packet Tracer · Router 1841 — FastEthernet0/0 · 0/1</option>
              </select>
            </div>
          )}
        </div>
      </div>

      <div className="panel">
        <div className="panel-head">
          <div className="title"><h2>Equipos generados</h2><span className="desc">{numRt} routers · selecciona uno para previsualizar su CLI</span></div>
        </div>
        <div className="panel-body">
          <div className="device-grid">
            {routers.map((r, i) => (
              <div className="dev-card" key={r.host}
                   style={{borderColor: i === activeRt ? "var(--accent)" : undefined, cursor:'pointer'}}
                   onClick={() => setActiveRt(i)}>
                <div className="top"><span className="host">{r.host}</span><span className="stat-led"></span></div>
                <div className="meta">
                  <div className="row"><span>lan</span><span className="v">{r.lan}</span></div>
                  <div className="row"><span>wan</span><span className="v">{r.wan}</span></div>
                  <div className="row"><span>routing</span><span className="v">{globalState.protoV4}</span></div>
                </div>
                <div className="bar"><div className="fill" style={{width:'62%'}}></div></div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <CodePreview deploy={rtDeploy} rollback={rtRollback} hostname={curRt.host}/>

      <div style={{display:'flex', gap:8, marginTop: 14}}>
        <button className="btn primary" style={{height: 34, padding: '0 16px'}}
                onClick={() => onSave && onSave(routers.map(r => ({
                  host: r.host, vendor, lan: r.lan, wan: r.wan,
                  proto: globalState.protoV4, ifaceLan: ifLan, ifaceWan: ifWan,
                })))}>
          {Icons.Save}<span>Guardar {numRt} router(es) en sesión</span>
        </button>
        <button className="btn" style={{height: 34, padding: '0 16px'}}
                onClick={() => downloadText(
                  `${curRt.host}_${new Date().toISOString().slice(0,10)}.txt`,
                  `! CORE-NEXUS · ${curRt.host}\n! Deploy + Rollback\n\n=== DEPLOY ===\n${rtDeploy}\n\n=== ROLLBACK ===\n${rtRollback}\n`
                )}>
          {Icons.Download}<span>Descargar .txt</span>
        </button>
      </div>
    </div>
  );
}

/* ─── Firewall CLI builders ─── */
function buildFwDeploy(vendor, host, wan, lan, ipv6) {
  const lines = [];
  const lanNet = lan.split(".").slice(0,3).join(".") + ".0";
  const wanGw  = wan.split(".").slice(0,3).join(".") + ".254";
  lines.push(`! ${"=".repeat(56)}`);
  lines.push(`! CORE-NEXUS · ${host} · vendor=${vendor}`);
  lines.push(`! ${"=".repeat(56)}`);

  if (vendor === "asa") {
    lines.push("enable", "crypto key generate rsa modulus 2048",
               "configure terminal", `hostname ${host}`,
               "interface GigabitEthernet0/0",
               " nameif outside", " security-level 0",
               ` ip address ${wan} 255.255.255.0`, " no shutdown", " exit",
               "interface GigabitEthernet0/1",
               " nameif inside", " security-level 100",
               ` ip address ${lan} 255.255.255.0`, " no shutdown", " exit",
               "object network LAN_NET",
               ` subnet ${lanNet} 255.255.255.0`,
               " nat (inside,outside) dynamic interface", " exit",
               "access-list INSIDE_OUT extended permit ip any any",
               "access-group INSIDE_OUT in interface inside",
               `route outside 0.0.0.0 0.0.0.0 ${wanGw} 1`,
               "ip ssh version 2",
               "username admin privilege 15 password admin",
               `ssh ${lanNet} 255.255.255.0 inside`,
               "aaa authentication ssh console LOCAL");
    if (ipv6) {
      lines.push("ipv6 unicast-routing",
                 "interface GigabitEthernet0/1",
                 ` ipv6 address ${ipv6}`, " ipv6 enable", " exit");
    }
    lines.push("end", "write memory");
  } else if (vendor === "huawei") {
    lines.push("system-view", `sysname ${host}`,
               "firewall zone untrust", " set priority 5", " quit",
               "firewall zone trust",   " set priority 85", " quit",
               "interface GigabitEthernet0/0/0",
               ` ip address ${wan} 255.255.255.0`, " alias WAN", " quit",
               "firewall zone untrust", " add interface GigabitEthernet0/0/0", " quit",
               "interface GigabitEthernet0/0/1",
               ` ip address ${lan} 255.255.255.0`, " alias LAN", " quit",
               "firewall zone trust",   " add interface GigabitEthernet0/0/1", " quit",
               `nat address-group 1 ${wan} ${wan}`,
               "nat-policy interzone trust untrust outbound",
               " policy 1", "  action source-nat", "  address-group 1", " quit", " quit",
               "policy interzone trust untrust outbound",
               " policy 1", "  action permit", " quit", " quit",
               "stelnet server enable",
               "aaa", " local-user admin password irreversible-cipher admin",
               " local-user admin service-type ssh",
               " local-user admin privilege level 15", " quit");
    lines.push("return", "save");
  } else {
    // fortinet
    lines.push("config system global", `    set hostname ${host}`, "end",
               "config system interface",
               "    edit wan1", "        set mode static",
               `        set ip ${wan} 255.255.255.0`,
               "        set allowaccess ping", "    next",
               "    edit internal",
               `        set ip ${lan} 255.255.255.0`,
               "        set allowaccess ping ssh");
    if (ipv6) {
      lines.push("        config ipv6", `            set ip6-address ${ipv6}`, "        end");
    }
    lines.push("    next", "end",
               "config firewall policy", "    edit 1",
               "        set name LAN_TO_WAN",
               "        set srcintf internal", "        set dstintf wan1",
               "        set srcaddr all", "        set dstaddr all",
               "        set action accept", "        set schedule always",
               "        set service ALL", "        set nat enable",
               "    next", "end",
               "config router static", "    edit 1",
               `        set gateway ${wanGw}`, "        set device wan1", "    next", "end");
  }
  return lines.join("\n");
}

function buildFwRollback(vendor, host) {
  const lines = [`! ROLLBACK · ${host}`, `! ${"=".repeat(56)}`];
  if (vendor === "asa") {
    lines.push("enable", "configure terminal",
               "no interface GigabitEthernet0/0", "no interface GigabitEthernet0/1",
               "no object network LAN_NET", "no access-list INSIDE_OUT",
               "end", "write memory");
  } else if (vendor === "huawei") {
    lines.push("system-view",
               "undo interface GigabitEthernet0/0/0",
               "undo interface GigabitEthernet0/0/1",
               "undo firewall zone untrust",
               "undo firewall zone trust", "return", "save");
  } else {
    lines.push("config firewall policy", "    delete 1", "end",
               "config system interface",
               "    edit wan1", "        unset ip", "    next",
               "    edit internal", "        unset ip", "    next", "end");
  }
  return lines.join("\n");
}

/* ─── Firewall tab ─── */
function FirewallTab({ globalState, onSave }) {
  const [vendor, setVendor] = useStateTC("fortinet");
  const [host, setHost] = useStateTC("FW-CORE-01");
  const [wan, setWan] = useStateTC("203.0.113.1");
  const [lan, setLan] = useStateTC("192.168.0.254");
  const [ipv6On, setIpv6On] = useStateTC(true);
  const ipv6 = ipv6On && globalState.ipv6Mode !== "off" ? "fd00:A8:00::FE/64" : null;
  const vendors = [
    { id: "asa",      short: "C", name: "Cisco ASA",      desc: "ASA / FTD" },
    { id: "huawei",   short: "H", name: "Huawei USG",     desc: "USG6000 · 6500" },
    { id: "fortinet", short: "F", name: "FortiGate",      desc: "FortiOS 7.x" },
  ];
  const vendorMap = { asa: "Cisco ASA", huawei: "Huawei USG", fortinet: "Fortinet FGT" };
  const fwPayload = {
    vendor: vendorMap[vendor],
    host, ip_wan: wan, ip_lan: lan, ipv6,
    proto_v4: globalState.protoV4,
    proto_v6: globalState.protoV6,
    as_number: parseInt(globalState.asNumber) || 65001,
    bgp_neighbor: globalState.bgpPeer,
    ospf_router_id: "1.1.1.1",
  };
  const { deploy: fwDeploy, rollback: fwRollback } = useApiCli(api.firewall, fwPayload,
    [vendor, host, wan, lan, ipv6, globalState.protoV4, globalState.protoV6]);

  return (
    <div>
      <div className="note">
        <div className="ic">i</div>
        <div>Sección independiente — puedes elegir un fabricante diferente al de switches y routers. La política <b>LAN→WAN</b> se crea con NAT/PAT.</div>
      </div>

      <div className="panel">
        <div className="panel-head"><div className="title"><h2>Parámetros del firewall</h2></div></div>
        <div className="panel-body">
          <div style={{marginBottom: 14}}>
            <label style={{fontSize:11, color:'var(--text-3)', display:'block', marginBottom:8, fontWeight:500}}>Fabricante</label>
            <VendorPick value={vendor} onChange={setVendor} vendors={vendors}/>
          </div>
          <div className="form-grid cols-2">
            <div className="form-cell"><label>Hostname</label>
              <input className="field" value={host} onChange={e => setHost(e.target.value)}/></div>
            <div className="form-cell"><label>IP interfaz WAN</label>
              <input className="field" value={wan} onChange={e => setWan(e.target.value)}/></div>
            <div className="form-cell"><label>IP interfaz LAN</label>
              <input className="field" value={lan} onChange={e => setLan(e.target.value)}/></div>
            <div className="form-cell"><label>IPv6 LAN</label>
              <div style={{display:'flex', alignItems:'center', gap:10}}>
                <div className={"toggle" + (ipv6On ? " on" : "")} onClick={() => setIpv6On(!ipv6On)}></div>
                <span style={{fontFamily:'var(--font-mono)', fontSize:11, color:'var(--text-3)'}}>{ipv6 || "deshabilitado"}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="panel">
        <div className="panel-head"><div className="title"><h2>Políticas</h2><span className="desc">orden de evaluación · top-down</span></div></div>
        <div className="panel-body" style={{padding: 0}}>
          <PolicyRow id="1" name="LAN_TO_WAN"   src="internal" dst="wan1"     action="accept" nat="enable"  log/>
          <PolicyRow id="2" name="MGMT_ONLY"    src="vlan10"   dst="any"      action="accept" nat="disable" log/>
          <PolicyRow id="3" name="GUEST_NO_LAN" src="vlan13"   dst="internal" action="deny"   nat="—"       log/>
          <PolicyRow id="4" name="DEFAULT_DENY" src="any"      dst="any"      action="deny"   nat="—"       log/>
        </div>
      </div>

      <CodePreview deploy={fwDeploy} rollback={fwRollback} hostname={host}/>

      <div style={{display:'flex', gap:8, marginTop: 14}}>
        <button className="btn primary" style={{height: 34, padding: '0 16px'}}
                onClick={() => onSave && onSave([{
                  host, vendor: vendorMap[vendor],
                  ip_wan: wan, ip_lan: lan, ipv6,
                }])}>
          {Icons.Save}<span>Guardar firewall en sesión</span>
        </button>
        <button className="btn" style={{height: 34, padding: '0 16px'}}
                onClick={() => downloadText(
                  `${host}_${new Date().toISOString().slice(0,10)}.txt`,
                  `! CORE-NEXUS · ${host}\n! Deploy + Rollback\n\n=== DEPLOY ===\n${fwDeploy}\n\n=== ROLLBACK ===\n${fwRollback}\n`
                )}>
          {Icons.Download}<span>Descargar .txt</span>
        </button>
      </div>
    </div>
  );
}

function PolicyRow({ id, name, src, dst, action, nat, log }) {
  return (
    <div style={{display:'grid', gridTemplateColumns:'40px 1fr 1fr 1fr 90px 80px 70px 28px', alignItems:'center',
                  borderBottom:'1px solid var(--border)', height: 36, fontFamily:'var(--font-mono)', fontSize:12}}>
      <div style={{padding:'0 12px', color:'var(--text-4)'}}>{id}</div>
      <div style={{padding:'0 12px', color:'var(--text)', fontWeight:500}}>{name}</div>
      <div style={{padding:'0 12px', color:'var(--text-2)'}}>{src}</div>
      <div style={{padding:'0 12px', color:'var(--text-2)'}}>{dst}</div>
      <div style={{padding:'0 12px'}}>
        <span className={"chip " + (action === "accept" ? "green" : "red")}>
          <span className="dot"></span>{action}
        </span>
      </div>
      <div style={{padding:'0 12px', color:'var(--text-2)'}}>{nat}</div>
      <div style={{padding:'0 12px'}}>{log && <span className="chip accent">log</span>}</div>
      <div style={{padding:'0 12px', color:'var(--text-4)', cursor:'pointer'}}>{Icons.Settings}</div>
    </div>
  );
}

/* ─── Format / Reset tab ─── */
function FormatTab() {
  const [level, setLevel] = useStateTC("selective");
  const [vendor, setVendor] = useStateTC("Cisco");
  const [host, setHost]     = useStateTC("CORE-SW-01");
  const levels = [
    { id: "selective", api: "Limpieza Selectiva", name: "Limpieza selectiva", desc: "Quita las VLANs y rutas creadas por CORE-NEXUS. Conserva sistema y AAA.", tone: "accent" },
    { id: "complete",  api: "Reset Completo",    name: "Reset completo",     desc: "Borra VLANs, rutas, BGP/OSPF, IP SLA. Restaura solo SSH + admin VLAN.", tone: "amber" },
    { id: "factory",   api: "Reset de Fábrica",  name: "Reset de fábrica",   desc: "write erase / reset saved-configuration / factoryreset + reload.",        tone: "red" },
  ];
  const curLevel = levels.find(l => l.id === level);

  const fmtPayload = {
    vendor, host, nivel: curLevel.api,
    vlan_admin: 10, ip_admin: "192.168.255.1",
    vlan_datos: [11, 12, 13, 14],
  };
  const { deploy: fmtDeploy, rollback: fmtRollback } = useApiCli(api.format, fmtPayload,
    [vendor, host, level]);

  return (
    <div>
      <div className="note">
        <div className="ic">!</div>
        <div>Genera scripts <b>destructivos</b> para preparar un equipo antes de un nuevo despliegue. Ejecutar siempre con respaldo previo de la configuración.</div>
      </div>

      <div className="panel">
        <div className="panel-head"><div className="title"><h2>Equipo a formatear</h2></div></div>
        <div className="panel-body">
          <div className="form-grid cols-2">
            <div className="form-cell">
              <label>Vendor</label>
              <select className="field" value={vendor} onChange={e => setVendor(e.target.value)}>
                <option>Cisco</option><option>Huawei</option><option>Fortinet</option>
              </select>
            </div>
            <div className="form-cell">
              <label>Hostname</label>
              <input className="field" value={host} onChange={e => setHost(e.target.value)}/>
            </div>
          </div>
        </div>
      </div>

      <div className="panel">
        <div className="panel-head"><div className="title"><h2>Nivel de formateo</h2><span className="desc">selecciona la profundidad</span></div></div>
        <div className="panel-body">
          <div style={{display:'grid', gap:8, gridTemplateColumns:'repeat(3, 1fr)'}}>
            {levels.map(l => (
              <div key={l.id} className={"ha-opt" + (level === l.id ? " sel" : "")} onClick={() => setLevel(l.id)}
                   style={{gridTemplateColumns: '16px 1fr'}}>
                <div className="ha-radio"></div>
                <div>
                  <div className="ha-name">
                    <span className={"chip " + l.tone} style={{marginRight: 6}}>nv {l.id === "selective" ? 1 : l.id === "complete" ? 2 : 3}</span>
                    {l.name}
                  </div>
                  <div className="ha-desc" style={{marginTop: 4}}>{l.desc}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <CodePreview hostname={host} deploy={fmtDeploy} rollback={fmtRollback}/>
    </div>
  );
}

window.SwitchesTab = SwitchesTab;
window.RoutersTab  = RoutersTab;
window.FirewallTab = FirewallTab;
window.FormatTab   = FormatTab;
window.VendorPick  = VendorPick;
window.Stepper     = Stepper;
