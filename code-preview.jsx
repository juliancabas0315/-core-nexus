const { useState: useStateCP } = React;

// Lightweight tokenizer for Cisco/Huawei/Fortinet CLI lines
function tokenizeLine(line) {
  const tokens = [];
  if (!line) return [{ cls: "tk-op", t: "" }];

  // Comment
  if (/^\s*(!|#)/.test(line)) {
    return [{ cls: "tk-cmt", t: line }];
  }

  const re = /(\s+)|("[^"]*")|(\b\d+\.\d+\.\d+\.\d+(?:\/\d+)?\b)|(\b(?:fd|fe)[0-9a-f:]+(?:\/\d+)?\b)|(\b\d+\b)|([A-Za-z][\w-]*)|([^\s])/gi;
  let m;
  const keywords = new Set([
    "enable","configure","terminal","end","exit","quit","return","write","save","memory",
    "interface","vlan","ip","ipv6","address","name","description","no","shutdown",
    "router","network","neighbor","remote-as","passive","redistribute",
    "rip","eigrp","ospf","ospfv3","ripng","bgp","version","unicast-routing",
    "dhcp","pool","default-router","dns-server","excluded-address",
    "ssh","username","password","secret","privilege","line","vty","transport","input","login","local","exec-timeout",
    "crypto","key","generate","rsa","modulus","hostname","sysname","system-view",
    "standby","priority","preempt","timers","track",
    "vrrp","vrid","virtual-ip","sla","icmp-echo","frequency","schedule","life","forever","start-time","now","reachability",
    "spanning-tree","mode","portfast","bpduguard","enable","range","channel-group","port-channel","switchport","trunk","allowed",
    "stp","instance","region-configuration","edged-port","bpdu-protection","trunkport","mode",
    "config","edit","next","set","get","unset","delete",
    "firewall","zone","trust","untrust","nat","policy","action","permit","source-nat","address-group","object","subnet","access-list","extended","access-group",
    "aaa","authentication","stelnet","server","local-user","service-type","irreversible-cipher","user-interface","authentication-mode","protocol","inbound","idle-timeout",
    "prefix-list","seq","deny","ip-prefix","route-policy","node","if-match","filter-policy","route-static","preference","static","gateway","device","distance",
    "router-id","area","auto-summary","summary","undo","factoryreset","reload",
    "config-mode","admin","accprofile","super_admin","vdom","root","internal","wan1","port3","port4","ping","static","link-monitor","srcintf","update-static-route","ha","mode","group-name","session-pickup","override","hbdev",
  ]);

  while ((m = re.exec(line))) {
    if (m[1]) tokens.push({ cls: "tk-op", t: m[1] });
    else if (m[2]) tokens.push({ cls: "tk-str", t: m[2] });
    else if (m[3]) tokens.push({ cls: "tk-ip", t: m[3] });
    else if (m[4]) tokens.push({ cls: "tk-ip", t: m[4] });
    else if (m[5]) tokens.push({ cls: "tk-num", t: m[5] });
    else if (m[6]) {
      const k = m[6].toLowerCase();
      if (keywords.has(k)) tokens.push({ cls: "tk-key", t: m[6] });
      else tokens.push({ cls: "tk-cmd", t: m[6] });
    }
    else if (m[7]) tokens.push({ cls: "tk-op", t: m[7] });
  }
  return tokens;
}

function CodePreview({ deploy, rollback, hostname }) {
  const [tab, setTab] = useStateCP("deploy");
  const lines = (tab === "deploy" ? deploy : rollback).split("\n");
  const [copyMsg, setCopyMsg] = useStateCP("");

  const handleCopy = async () => {
    const content = tab === "deploy" ? deploy : rollback;
    try {
      await navigator.clipboard.writeText(content);
      setCopyMsg("✓ copiado");
      setTimeout(() => setCopyMsg(""), 1500);
    } catch {
      setCopyMsg("error");
      setTimeout(() => setCopyMsg(""), 1500);
    }
  };

  const handleDownload = () => {
    const content = tab === "deploy" ? deploy : rollback;
    const suffix  = tab === "deploy" ? "deploy" : "rollback";
    const blob = new Blob([content], { type: "text/plain" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `${hostname || "config"}_${suffix}.cfg`;
    a.click();
    URL.revokeObjectURL(a.href);
  };

  return (
    <div className="panel" style={{marginBottom: 0}}>
      <div className="code-tabs">
        <div className={"code-tab deploy" + (tab === "deploy" ? " active" : "")} onClick={() => setTab("deploy")}>
          <span className="dot"></span>
          <span>deploy.txt</span>
          <span className="lines">{deploy.split("\n").length} líneas</span>
        </div>
        <div className={"code-tab rollback" + (tab === "rollback" ? " active" : "")} onClick={() => setTab("rollback")}>
          <span className="dot"></span>
          <span>rollback.txt</span>
          <span className="lines">{rollback.split("\n").length} líneas</span>
        </div>
        <div className="spacer"></div>
        <div className="code-action" onClick={handleCopy} style={{cursor:'pointer'}}>
          {Icons.Copy}<span>{copyMsg || "Copiar"}</span>
        </div>
        <div className="code-action" onClick={handleDownload} style={{cursor:'pointer'}}>
          {Icons.Download}<span>{hostname}.cfg</span>
        </div>
      </div>
      <div className="code-block">
        {lines.map((line, i) => (
          <div className="code-line" key={i}>
            <div className="ln">{i + 1}</div>
            <div className="tx">
              {tokenizeLine(line).map((tk, j) => (
                <span key={j} className={tk.cls}>{tk.t}</span>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

window.CodePreview = CodePreview;
