const { useState: useStateVL } = React;

function ipv6FromIpv4(ip, mode) {
  if (mode === "off") return null;
  const parts = ip.split(".");
  const h3 = parseInt(parts[2]).toString(16).toUpperCase().padStart(2,"0");
  const h4 = parseInt(parts[3]).toString(16).toUpperCase().padStart(2,"0");
  if (mode === "ula") return `fd00:A8:${h3}::${h4}/64`;
  if (mode === "ll")  return `fe80::${h4}/64`;
  return null;
}

function VlanEditor({ vlans, setVlans, ipv6Mode }) {
  const addVlan = () => {
    const last = vlans[vlans.length - 1];
    const newId = last ? last.vlan + 1 : 11;
    const oct = vlans.length + 1;
    const ipv4 = `192.168.${oct}.1`;
    setVlans([...vlans, { vlan: newId, name: `VLAN_${newId}`, ipv4, ipv6: ipv6FromIpv4(ipv4, ipv6Mode), dhcp: true }]);
  };
  const remove = (i) => setVlans(vlans.filter((_, idx) => idx !== i));
  const rename = (i, v) => {
    const next = [...vlans]; next[i] = {...next[i], name: v}; setVlans(next);
  };

  return (
    <div className="vlan-table">
      <div className="vlan-row head">
        <div className="cell idx">#</div>
        <div className="cell">VLAN</div>
        <div className="cell">Nombre</div>
        <div className="cell">Gateway IPv4</div>
        <div className="cell">Gateway IPv6</div>
        <div className="cell">Estado</div>
        <div className="cell"></div>
      </div>
      {vlans.map((v, i) => (
        <div className="vlan-row" key={v.vlan}>
          <div className="cell idx">{String(i+1).padStart(2,'0')}</div>
          <div className="cell vid">{v.vlan}</div>
          <div className="cell nm">
            <input value={v.name} onChange={e => rename(i, e.target.value)} />
          </div>
          <div className="cell ip">{v.ipv4}<span style={{color:'var(--text-4)'}}>/24</span></div>
          <div className="cell ip6">{v.ipv6 || <span style={{color:'var(--text-4)'}}>— sin IPv6</span>}</div>
          <div className="cell status">
            <span className="chip green"><span className="dot"></span>ready</span>
          </div>
          <div className="cell del" onClick={() => remove(i)} title="Eliminar VLAN">
            {Icons.Trash}
          </div>
        </div>
      ))}
      <div className="vlan-add" onClick={addVlan}>
        <span className="plus">+</span>
        <span>Agregar VLAN <span style={{color:'var(--text-4)'}}>·</span> próxima: {vlans.length ? vlans[vlans.length-1].vlan + 1 : 11}</span>
      </div>
    </div>
  );
}

window.VlanEditor = VlanEditor;
window.ipv6FromIpv4 = ipv6FromIpv4;
