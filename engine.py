"""
CORE-NEXUS · Engine
====================
Lógica pura de Python extraída de tu app original de Streamlit.
Sin dependencias de `streamlit`. Todas las funciones son framework-agnósticas
y devuelven listas de comandos / strings.

Puedes mantener este archivo como la fuente única de verdad para la generación
de CLI multi-vendor.
"""

# ─────────────────────────────────────────────────────────────────────────────
# CONSTANTES (idénticas a tu app original)
# ─────────────────────────────────────────────────────────────────────────────
IP_BASE_1     = "192"
IP_BASE_2     = "168"
VLAN_ID_MIN   = 10
VLAN_ID_MAX   = 4094
SEGMENTOS_MAX = 50
DNS_PRIMARIO  = "8.8.8.8"
SUBNET_MASK   = "255.255.255.0"
SSH_USER      = "ntxadmin"           # ≥6 chars — requerido por Huawei VRP
SSH_PASS      = "NtxAdmin2026"       # ≥12 chars + mixto — pasa policy de todos los vendors
IP_ADMIN_OCTETO = "255"

HSRP_PRIORIDAD_ACTIVO  = 110
HSRP_PRIORIDAD_STANDBY = 90
HSRP_GRUPO             = 1
HSRP_HELLO             = 1
HSRP_HOLD              = 3
LACP_CHANNEL_GROUP     = 1
STP_MODE_CISCO         = "rapid-pvst"
STP_MODE_HUAWEI        = "mstp"
IPSLA_NUM              = 1
TRACK_NUM              = 1


# ─────────────────────────────────────────────────────────────────────────────
# IPv6
# ─────────────────────────────────────────────────────────────────────────────
def generar_ipv6(ipv4: str, modo: str):
    try:
        partes = ipv4.split('.')
        if len(partes) != 4:
            raise ValueError
        tercer = int(partes[2])
        cuarto = int(partes[3])
        if not (0 <= tercer <= 255 and 0 <= cuarto <= 255):
            raise ValueError
    except (ValueError, IndexError):
        return None

    h3 = format(tercer, '02X')
    h4 = format(cuarto, '02X')

    if modo.startswith("ULA"):
        return f"fd00:A8:{h3}::{h4}/64"
    elif modo.startswith("Link-Local"):
        return f"fe80::{h4}/64"
    return None


# ─────────────────────────────────────────────────────────────────────────────
# Protocolos de enrutamiento IPv4
# ─────────────────────────────────────────────────────────────────────────────
def cmds_routing_ipv4(vendor, protocolo, ipv4, as_number, bgp_neighbor,
                      bgp_neighbor_as=0, vlan=10):
    cmds = []
    red = ".".join(ipv4.split('.')[:3]) + ".0"
    if protocolo == "Ninguno":
        return []

    if vendor == "Cisco":
        if protocolo == "RIP v2":
            cmds += [
                f"ip prefix-list BLOCK_MGMT seq 5 deny {IP_BASE_1}.{IP_BASE_2}.{IP_ADMIN_OCTETO}.0/24",
                "ip prefix-list BLOCK_MGMT seq 10 permit 0.0.0.0/0 le 32",
                "router rip", " version 2", f" network {red}",
                " no auto-summary", " distribute-list prefix BLOCK_MGMT out", " exit",
            ]
        elif protocolo == "EIGRP":
            cmds += [
                f"ip prefix-list BLOCK_MGMT seq 5 deny {IP_BASE_1}.{IP_BASE_2}.{IP_ADMIN_OCTETO}.0/24",
                "ip prefix-list BLOCK_MGMT seq 10 permit 0.0.0.0/0 le 32",
                f"router eigrp {as_number}",
                f" network {red} 0.0.0.255",
                " no auto-summary", " distribute-list prefix BLOCK_MGMT out", " exit",
            ]
        elif protocolo == "BGP":
            cmds += [
                f"router bgp {as_number}",
                f" neighbor {bgp_neighbor} remote-as {bgp_neighbor_as or as_number}",
                f" network {red} mask {SUBNET_MASK}", " exit",
            ]
        elif protocolo == "OSPF":
            cmds += [
                "router ospf 1",
                f" network {red} 0.0.0.255 area 0",
                " exit",
            ]

    elif vendor == "Huawei":
        if protocolo == "RIP v2":
            cmds += [
                f"ip ip-prefix BLOCK_MGMT index 5 deny {IP_BASE_1}.{IP_BASE_2}.{IP_ADMIN_OCTETO}.0 24",
                "ip ip-prefix BLOCK_MGMT index 10 permit 0.0.0.0 0 less-equal 32",
                "route-policy BLOCK_MGMT_POLICY permit node 10",
                " if-match ip-prefix BLOCK_MGMT", " quit",
                "rip 1", " version 2", f" network {red}",
                " undo summary",
                " filter-policy route-policy BLOCK_MGMT_POLICY export", " quit",
            ]
        elif protocolo == "EIGRP":
            cmds += [
                "# NOTA: EIGRP es propietario de Cisco. En Huawei usar OSPF:",
                "ospf 1", " area 0", f" network {red} 0.0.0.255", " quit",
            ]
        elif protocolo == "BGP":
            cmds += [
                f"bgp {as_number}",
                f" peer {bgp_neighbor} as-number {bgp_neighbor_as or as_number}",
                f" network {red}", " quit",
            ]
        elif protocolo == "OSPF":
            cmds += ["ospf 1", " area 0", f" network {red} 0.0.0.255", " quit", " quit"]

    elif vendor == "Fortinet":
        if protocolo == "RIP v2":
            cmds += [
                "config router rip", "    set version 2", "    config network",
                f"        edit {vlan}", f"            set prefix {red}/24",
                "        next", "    end", "end",
            ]
        elif protocolo == "EIGRP":
            cmds += [
                "# NOTA: EIGRP no disponible en FortiOS. Usar OSPF.",
                "config router ospf", "    set router-id 1.1.1.1", "end",
            ]
        elif protocolo == "BGP":
            cmds += [
                "config router bgp",
                f"    set as {as_number}",
                f"    set router-id {ipv4}",
                "    config neighbor",
                f"        edit {bgp_neighbor}",
                f"            set remote-as {bgp_neighbor_as or as_number}",
                "        next", "    end",
                "    config network",
                f"        edit 1", f"            set prefix {red}/24",
                "        next", "    end", "end",
            ]
        elif protocolo == "OSPF":
            cmds += [
                "config router ospf", "    set router-id 1.1.1.1",
                "    config network", "        edit 1",
                f"            set prefix {red} 255.255.255.0",
                "            set area 0.0.0.0",
                "        next", "    end", "end",
            ]
    return cmds


# ─────────────────────────────────────────────────────────────────────────────
# Protocolos de enrutamiento IPv6
# ─────────────────────────────────────────────────────────────────────────────
def cmds_routing_ipv6(vendor, protocolo, ipv6, as_number, ospf_router_id, vlan=10):
    cmds = []
    if protocolo == "Ninguno" or ipv6 is None:
        return []

    if vendor == "Cisco":
        if protocolo == "RIPng":
            cmds += [
                "ipv6 unicast-routing", "ipv6 router rip RIPNG_PROC", " exit",
                f"interface vlan {vlan}", " ipv6 rip RIPNG_PROC enable", " exit",
            ]
        elif protocolo == "OSPFv3":
            cmds += [
                "ipv6 unicast-routing", "ipv6 router ospf 1",
                f" router-id {ospf_router_id}", " exit",
                f"interface vlan {vlan}", " ipv6 ospf 1 area 0", " exit",
            ]
        elif protocolo == "EIGRPv6":
            cmds += [
                "ipv6 unicast-routing", f"ipv6 router eigrp {as_number}",
                f" eigrp router-id {ospf_router_id}", " no shutdown", " exit",
                f"interface vlan {vlan}", f" ipv6 eigrp {as_number}", " exit",
            ]
    elif vendor == "Huawei":
        if protocolo == "RIPng":
            cmds += ["ripng 1", " quit", f"interface Vlanif{vlan}",
                     " ripng 1 enable", " quit"]
        elif protocolo == "OSPFv3":
            cmds += ["ospfv3 1", f" router-id {ospf_router_id}", " quit",
                     f"interface Vlanif{vlan}", " ospfv3 1 area 0", " quit"]
        elif protocolo == "EIGRPv6":
            cmds += ["# EIGRPv6 propietario de Cisco. En Huawei usar OSPFv3:",
                     "ospfv3 1", f" router-id {ospf_router_id}", " quit"]
    elif vendor == "Fortinet":
        if protocolo == "RIPng":
            cmds += ["config router ripng", "    config redistribute",
                     "        edit connected", "            set status enable",
                     "        next", "    end", "end"]
        elif protocolo == "OSPFv3":
            cmds += ["config router ospf6", f"    set router-id {ospf_router_id}",
                     "    config area", "        edit 0.0.0.0",
                     "        next", "    end", "end"]
        elif protocolo == "EIGRPv6":
            cmds += ["# EIGRPv6 no disponible en FortiOS.",
                     "config router ospf6", f"    set router-id {ospf_router_id}", "end"]
    return cmds


# ─────────────────────────────────────────────────────────────────────────────
# Alta disponibilidad
# ─────────────────────────────────────────────────────────────────────────────
def cmds_alta_disponibilidad(vendor, vlan, ipv4, ipv6, modo_ha,
                              ip_respaldo, es_activo):
    cmds = []
    red_prefix = ".".join(ipv4.split(".")[:3])
    ip_virtual = f"{red_prefix}.254"
    prioridad  = HSRP_PRIORIDAD_ACTIVO if es_activo else HSRP_PRIORIDAD_STANDBY

    aplicar_gateway  = modo_ha in ("HSRP/VRRP", "Completo")
    aplicar_ipsla    = modo_ha in ("IP SLA + Ruta Flotante", "Completo")
    aplicar_stp_lacp = modo_ha in ("STP Rápido + EtherChannel", "Completo")

    if vendor == "Cisco":
        if aplicar_gateway:
            cmds += [
                "# ── HSRP — Redundancia de Gateway ──",
                f"interface vlan {vlan}",
                f" standby {HSRP_GRUPO} ip {ip_virtual}",
                f" standby {HSRP_GRUPO} priority {prioridad}",
                f" standby {HSRP_GRUPO} preempt",
                f" standby {HSRP_GRUPO} timers {HSRP_HELLO} {HSRP_HOLD}", " exit",
            ]
        if aplicar_ipsla:
            cmds += [
                "# ── IP SLA + Track ──",
                f"ip sla {IPSLA_NUM}",
                f" icmp-echo {ip_respaldo} source-ip {ipv4}",
                " frequency 5", " exit",
                f"ip sla schedule {IPSLA_NUM} life forever start-time now",
                f"track {TRACK_NUM} ip sla {IPSLA_NUM} reachability",
                f"ip route 0.0.0.0 0.0.0.0 {ip_respaldo} 1 track {TRACK_NUM}",
                f"ip route 0.0.0.0 0.0.0.0 {ip_respaldo} 254",
            ]
        if aplicar_stp_lacp:
            cmds += [
                "# ── Rapid PVST+ + EtherChannel LACP ──",
                f"spanning-tree mode {STP_MODE_CISCO}",
                f"spanning-tree vlan {vlan} priority {'4096' if es_activo else '8192'}",
                f"interface range GigabitEthernet0/3 - 4",
                f" channel-group {LACP_CHANNEL_GROUP} mode active", " exit",
                f"interface port-channel {LACP_CHANNEL_GROUP}",
                " switchport mode trunk",
                f" switchport trunk allowed vlan {vlan}", " exit",
            ]
    elif vendor == "Huawei":
        if aplicar_gateway:
            cmds += [
                "# ── VRRP ──",
                f"interface Vlanif{vlan}",
                f" vrrp vrid {HSRP_GRUPO} virtual-ip {ip_virtual}",
                f" vrrp vrid {HSRP_GRUPO} priority {prioridad}",
                f" vrrp vrid {HSRP_GRUPO} preempt-mode timer delay 0", " quit",
            ]
        if aplicar_ipsla:
            cmds += [
                f"nqa test-instance admin SLA_{IPSLA_NUM}",
                "  test-type icmp",
                f"  destination-address ipv4 {ip_respaldo}",
                f"  source-address ipv4 {ipv4}",
                "  frequency 5", "  probe-count 3", "  start now", " quit",
                f"track {TRACK_NUM} nqa admin SLA_{IPSLA_NUM} probe-fail",
                f"ip route-static 0.0.0.0 0 {ip_respaldo} preference 1 track {TRACK_NUM}",
                f"ip route-static 0.0.0.0 0 {ip_respaldo} preference 254",
            ]
    elif vendor == "Fortinet":
        if aplicar_gateway:
            cmds += [
                "config system interface", f"    edit vlan{vlan}",
                "        config vrrp", f"            edit {HSRP_GRUPO}",
                f"                set vrip {ip_virtual}",
                f"                set priority {prioridad}",
                "                set adv-interval 1",
                "                set preempt enable",
                "            next", "        end", "    next", "end",
            ]
    return cmds


# ─────────────────────────────────────────────────────────────────────────────
# VLAN admin + SSH (Switches)
# ─────────────────────────────────────────────────────────────────────────────
def cmds_vlan_admin(vendor, vlan_admin, ip_admin, host):
    cmds = []
    if vendor == "Cisco":
        cmds += [
            "enable", "crypto key generate rsa modulus 2048", "yes",
            "configure terminal", f"hostname {host}",
            f"vlan {vlan_admin}", " name VLAN_ADMIN_MGMT", " exit",
            f"interface vlan {vlan_admin}",
            f" ip address {ip_admin} {SUBNET_MASK}",
            " no shutdown", " exit",
            "ip ssh version 2", "ip ssh time-out 60",
            "ip ssh authentication-retries 3",
            f"username {SSH_USER} privilege 15 secret {SSH_PASS}",
            "line vty 0 4", " transport input ssh", " login local",
            " exec-timeout 10 0", " exit",
        ]
    elif vendor == "Huawei":
        cmds += [
            "system-view", f"sysname {host}",
            f"vlan {vlan_admin}", f" description VLAN_ADMIN_MGMT", " quit",
            f"interface Vlanif{vlan_admin}",
            f" ip address {ip_admin} {SUBNET_MASK}", " quit",
            "# ── Generación de llaves RSA (interactivo) ──",
            "# Ejecute: rsa local-key-pair create",
            "# - Presione ENTER para aceptar tamaño 3072 (no use 2048: VRP moderno lo rechaza)",
            "# - Responda 'y' para confirmar reemplazo si existe",
            "rsa local-key-pair create",
            "stelnet server enable",
            "aaa",
            f" local-user {SSH_USER} password irreversible-cipher {SSH_PASS}",
            f" local-user {SSH_USER} service-type ssh",
            f" local-user {SSH_USER} privilege level 3",     # max user-level real en VRP = 3
            " quit",
            "user-interface vty 0 4",
            " authentication-mode aaa",
            " protocol inbound ssh",
            " idle-timeout 10 0",
            " quit",
        ]
    elif vendor == "Fortinet":
        cmds += [
            "config system interface", f"    edit vlan{vlan_admin}",
            "        set vdom root",
            f"        set ip {ip_admin} {SUBNET_MASK}",
            f"        set vlanid {vlan_admin}",
            "        set interface internal",
            "        set allowaccess ssh", "    next", "end",
            "config system admin", f"    edit {SSH_USER}",
            f"        set password {SSH_PASS}",
            "        set accprofile super_admin",
            "        set vdom root", "    next", "end",
        ]
    return cmds


def cmds_ssh_router(vendor, host):
    """SSH solo, sin VLANs — para routers."""
    if vendor == "Cisco":
        return [
            "enable", "crypto key generate rsa modulus 2048", "yes",
            "configure terminal", f"hostname {host}",
            "ip ssh version 2", "ip ssh time-out 60",
            "ip ssh authentication-retries 3",
            f"username {SSH_USER} privilege 15 secret {SSH_PASS}",
            "line vty 0 4", " transport input ssh", " login local",
            " exec-timeout 10 0", " exit",
        ]
    if vendor == "Huawei":
        return [
            "system-view", f"sysname {host}",
            "# ── RSA interactivo: ENTER para 3072, 'y' para confirmar ──",
            "rsa local-key-pair create",
            "stelnet server enable",
            "aaa",
            f" local-user {SSH_USER} password irreversible-cipher {SSH_PASS}",
            f" local-user {SSH_USER} service-type ssh",
            f" local-user {SSH_USER} privilege level 3",
            " quit",
            "user-interface vty 0 4",
            " authentication-mode aaa",
            " protocol inbound ssh",
            " idle-timeout 10 0",
            " quit",
        ]
    if vendor == "Fortinet":
        return [
            "config system global",
            f"    set hostname {host}",
            "    set admin-ssh-port 22", "end",
            "config system admin", f"    edit {SSH_USER}",
            f"        set password {SSH_PASS}",
            "        set accprofile super_admin",
            "        set vdom root", "    next", "end",
        ]
    return []


# ─────────────────────────────────────────────────────────────────────────────
# Config Switch
# ─────────────────────────────────────────────────────────────────────────────
def generar_config_switch(vendor, host, vlans_config,
                           proto_v4, proto_v6,
                           as_number, bgp_neighbor, bgp_neighbor_as,
                           ospf_router_id, cmds_admin_precalc,
                           vlan_admin, ip_admin,
                           modo_ha="Ninguno", ip_respaldo="0.0.0.0",
                           es_activo=True):
    dep, rb = [], []
    if vendor == "Cisco":
        dep += cmds_admin_precalc
        dep.append("! ── DHCP excludes ──")
        for vc in vlans_config:
            red = ".".join(vc["ipv4"].split('.')[:3])
            dep.append(f"ip dhcp excluded-address {red}.1 {red}.10")
        if any(vc.get("ipv6") for vc in vlans_config):
            dep.append("ipv6 unicast-routing")
        for vc in vlans_config:
            dep += [
                f"vlan {vc['vlan']}", f" name {vc['name']}", " exit",
                f"interface vlan {vc['vlan']}",
                f" ip address {vc['ipv4']} {SUBNET_MASK}",
            ]
            if vc.get("ipv6"):
                ipv6_clean = vc['ipv6'] if '/64' in vc['ipv6'] else vc['ipv6'].split('/')[0] + '/64'
                dep += [f" ipv6 address {ipv6_clean}", " ipv6 enable"]
            dep += [
                " no shutdown", " exit",
                f"ip dhcp pool POOL_{vc['vlan']}",
                f" network {'.'.join(vc['ipv4'].split('.')[:3])}.0 {SUBNET_MASK}",
                f" default-router {vc['ipv4']}",
                f" dns-server {DNS_PRIMARIO}", " exit",
            ]
            dep += cmds_routing_ipv4(vendor, proto_v4, vc["ipv4"], as_number,
                                     bgp_neighbor, bgp_neighbor_as, vc["vlan"])
            dep += cmds_routing_ipv6(vendor, proto_v6, vc.get("ipv6"),
                                     as_number, ospf_router_id, vc["vlan"])
            if modo_ha != "Ninguno":
                dep += cmds_alta_disponibilidad(vendor, vc["vlan"], vc["ipv4"],
                                                vc.get("ipv6"), modo_ha,
                                                ip_respaldo, es_activo)
        dep += ["end", "write memory"]

        for vc in vlans_config:
            rb += [f"no ip dhcp pool POOL_{vc['vlan']}",
                   f"no interface vlan {vc['vlan']}",
                   f"no vlan {vc['vlan']}"]
        rb += [f"no interface vlan {vlan_admin}", f"no vlan {vlan_admin}",
               "end", "write memory"]

    elif vendor == "Huawei":
        # cmds_admin_precalc ya incluye system-view + sysname.
        # NO los duplicar aquí — eso era el bug que producía
        #   "system-view ^ Error: Unrecognized command".
        dep += cmds_admin_precalc
        dep.append("dhcp enable")
        if any(vc.get("ipv6") for vc in vlans_config):
            dep.append("ipv6")
        for vc in vlans_config:
            dep += [
                f"vlan {vc['vlan']}", f" description {vc['name']}", " quit",
                f"interface Vlanif{vc['vlan']}",
                f" ip address {vc['ipv4']} {SUBNET_MASK}",
            ]
            if vc.get("ipv6"):
                # Por interfaz también se requiere habilitar IPv6 ANTES de asignar la dirección
                dep.append(" ipv6 enable")
                ipv6_clean = vc["ipv6"].replace("/64", "")
                dep.append(f" ipv6 address {ipv6_clean} 64")
            dep += [" dhcp select interface", " quit"]
            dep += cmds_routing_ipv4(vendor, proto_v4, vc["ipv4"], as_number,
                                     bgp_neighbor, bgp_neighbor_as, vc["vlan"])
            dep += cmds_routing_ipv6(vendor, proto_v6, vc.get("ipv6"),
                                     as_number, ospf_router_id, vc["vlan"])
            if modo_ha != "Ninguno":
                dep += cmds_alta_disponibilidad(vendor, vc["vlan"], vc["ipv4"],
                                                vc.get("ipv6"), modo_ha,
                                                ip_respaldo, es_activo)
        dep += ["return", "save", "y"]
        for vc in vlans_config:
            rb += [f"undo interface Vlanif{vc['vlan']}", f"undo vlan {vc['vlan']}"]
        rb += [f"undo interface Vlanif{vlan_admin}", f"undo vlan {vlan_admin}",
               "return", "save", "y"]

    elif vendor == "Fortinet":
        dep += ["config system global", f"    set hostname {host}", "end"]
        dep += cmds_admin_precalc
        for vc in vlans_config:
            dep += [
                "config system interface",
                f"    edit vlan{vc['vlan']}",
                "        set vdom root",
                f"        set ip {vc['ipv4']} {SUBNET_MASK}",
                f"        set vlanid {vc['vlan']}",
                "        set interface internal",
            ]
            if vc.get("ipv6"):
                dep += ["        config ipv6",
                        f"            set ip6-address {vc['ipv6']}",
                        "        end"]
            dep += ["    next", "end"]
            dep += cmds_routing_ipv4(vendor, proto_v4, vc["ipv4"], as_number,
                                     bgp_neighbor, bgp_neighbor_as, vc["vlan"])
            dep += cmds_routing_ipv6(vendor, proto_v6, vc.get("ipv6"),
                                     as_number, ospf_router_id, vc["vlan"])
            if modo_ha != "Ninguno":
                dep += cmds_alta_disponibilidad(vendor, vc["vlan"], vc["ipv4"],
                                                vc.get("ipv6"), modo_ha,
                                                ip_respaldo, es_activo)
        rb += ["config system interface"]
        for vc in vlans_config:
            rb.append(f"    delete vlan{vc['vlan']}")
        rb += [f"    delete vlan{vlan_admin}", "end"]

    return dep, rb


# ─────────────────────────────────────────────────────────────────────────────
# Config Router
# ─────────────────────────────────────────────────────────────────────────────
def generar_config_router(vendor, ipv4, ipv6, host, proto_v4, proto_v6,
                           as_number, bgp_neighbor, bgp_neighbor_as,
                           ospf_router_id, cmds_admin_precalc,
                           vlan_admin, ip_admin,
                           modo_ha="Ninguno", ip_respaldo="0.0.0.0",
                           es_activo=True,
                           iface_lan="GigabitEthernet0/0",
                           iface_wan="GigabitEthernet0/1"):
    dep, rb = [], []
    ip_wan_gw = f"{IP_BASE_1}.{IP_BASE_2}.{IP_ADMIN_OCTETO}.254"

    if vendor == "Cisco":
        dep += cmds_ssh_router(vendor, host)
        if ipv6:
            dep.append("ipv6 unicast-routing")
        dep += [
            f"interface {iface_lan}",
            f" ip address {ipv4} {SUBNET_MASK}",
            " description LAN", " no shutdown",
        ]
        if ipv6:
            dep += [f" ipv6 address {ipv6.split('/')[0]}/64", " ipv6 enable"]
        dep += [
            " exit",
            f"interface {iface_wan}",
            f" ip address {ip_wan_gw} {SUBNET_MASK}",
            " description WAN", " no shutdown", " exit",
            f"ip route 0.0.0.0 0.0.0.0 {ip_wan_gw}",
        ]
        dep += cmds_routing_ipv4(vendor, proto_v4, ipv4, as_number, bgp_neighbor, bgp_neighbor_as)
        dep += cmds_routing_ipv6(vendor, proto_v6, ipv6, as_number, ospf_router_id)
        if modo_ha in ("IP SLA + Ruta Flotante", "Completo"):
            dep += [
                f"ip sla {IPSLA_NUM}",
                f" icmp-echo {ip_respaldo} source-interface {iface_lan}",
                " frequency 5", " exit",
                f"ip sla schedule {IPSLA_NUM} life forever start-time now",
                f"track {TRACK_NUM} ip sla {IPSLA_NUM} reachability",
                f"ip route 0.0.0.0 0.0.0.0 {ip_respaldo} 1 track {TRACK_NUM}",
                f"ip route 0.0.0.0 0.0.0.0 {ip_respaldo} 254",
            ]
        dep += ["end", "write memory"]
        rb += ["enable", "configure terminal",
               f"no interface {iface_lan}", f"no interface {iface_wan}",
               f"no ip route 0.0.0.0 0.0.0.0 {ip_wan_gw}",
               "end", "write memory"]

    elif vendor == "Huawei":
        dep += cmds_ssh_router(vendor, host)
        if ipv6:
            dep.append("ipv6")
        dep += [
            "interface GigabitEthernet0/0/0",
            f" ip address {ipv4} {SUBNET_MASK}", " description LAN",
        ]
        if ipv6:
            dep.append(f" ipv6 address {ipv6.replace('/64', ' 64')}")
        dep += [
            " quit",
            "interface GigabitEthernet0/0/1",
            f" ip address {ip_wan_gw} {SUBNET_MASK}",
            " description WAN", " quit",
            f"ip route-static 0.0.0.0 0 {ip_wan_gw}",
        ]
        dep += cmds_routing_ipv4(vendor, proto_v4, ipv4, as_number, bgp_neighbor, bgp_neighbor_as)
        dep += cmds_routing_ipv6(vendor, proto_v6, ipv6, as_number, ospf_router_id)
        dep += ["return", "save", "y"]
        rb += ["system-view",
               "undo interface GigabitEthernet0/0/0",
               "undo interface GigabitEthernet0/0/1",
               f"undo ip route-static 0.0.0.0 0 {ip_wan_gw}",
               "return", "save", "y"]

    elif vendor == "Fortinet":
        dep += cmds_ssh_router(vendor, host)
        dep += [
            "config system interface",
            "    edit internal", "        set mode static",
            f"        set ip {ipv4} {SUBNET_MASK}",
            "        set allowaccess ping ssh", "        set description LAN",
        ]
        if ipv6:
            dep += ["        config ipv6",
                    f"            set ip6-address {ipv6}",
                    "        end"]
        dep += [
            "    next", "    edit wan1",
            "        set mode static",
            f"        set ip {ip_wan_gw} {SUBNET_MASK}",
            "        set allowaccess ping", "        set description WAN",
            "    next", "end",
            "config router static", "    edit 1",
            f"        set gateway {ip_wan_gw}", "        set device wan1",
            "    next", "end",
        ]
        dep += cmds_routing_ipv4(vendor, proto_v4, ipv4, as_number, bgp_neighbor, bgp_neighbor_as)
        dep += cmds_routing_ipv6(vendor, proto_v6, ipv6, as_number, ospf_router_id)
        rb += ["config system interface",
               "    edit internal", "        unset ip", "    next",
               "    edit wan1", "        unset ip", "    next", "end",
               "config router static", "    delete 1", "end"]
    return dep, rb


# ─────────────────────────────────────────────────────────────────────────────
# Config Firewall
# ─────────────────────────────────────────────────────────────────────────────
def generar_config_firewall(vendor_fw, host_fw, ip_wan, ip_lan, ipv6,
                             proto_v4, proto_v6,
                             as_number, bgp_neighbor, ospf_router_id):
    dep, rb = [], []
    if vendor_fw == "Cisco ASA":
        dep += [
            "enable", "crypto key generate rsa modulus 2048", "yes",
            "configure terminal", f"hostname {host_fw}",
            "interface GigabitEthernet0/0",
            " nameif outside", " security-level 0",
            f" ip address {ip_wan} {SUBNET_MASK}",
            " no shutdown", " exit",
            "interface GigabitEthernet0/1",
            " nameif inside", " security-level 100",
            f" ip address {ip_lan} {SUBNET_MASK}",
            " no shutdown", " exit",
            "object network LAN_NET",
            f" subnet {'.'.join(ip_lan.split('.')[:3])}.0 {SUBNET_MASK}",
            " nat (inside,outside) dynamic interface", " exit",
            "access-list INSIDE_OUT extended permit ip any any",
            "access-group INSIDE_OUT in interface inside",
            "ip ssh version 2",
            f"username {SSH_USER} privilege 15 password {SSH_PASS}",
            f"ssh {'.'.join(ip_lan.split('.')[:3])}.0 255.255.255.0 inside",
            "ssh timeout 10",
            "aaa authentication ssh console LOCAL",
            f"route outside 0.0.0.0 0.0.0.0 " + ".".join(ip_wan.split('.')[:3]) + ".254 1",
        ]
        if ipv6:
            dep += ["ipv6 unicast-routing",
                    "interface GigabitEthernet0/1",
                    f" ipv6 address {ipv6}", " ipv6 enable", " exit"]
        dep += cmds_routing_ipv4("Cisco", proto_v4, ip_lan, as_number, bgp_neighbor)
        dep += cmds_routing_ipv6("Cisco", proto_v6, ipv6, as_number, ospf_router_id)
        dep += ["end", "write memory"]
        rb += ["enable", "configure terminal",
               "no interface GigabitEthernet0/0",
               "no interface GigabitEthernet0/1",
               "no object network LAN_NET",
               "no access-list INSIDE_OUT",
               "end", "write memory"]

    elif vendor_fw == "Huawei USG":
        dep += [
            "system-view", f"sysname {host_fw}",
            "firewall zone untrust", " set priority 5", " quit",
            "firewall zone trust",   " set priority 85", " quit",
            "interface GigabitEthernet0/0/0",
            f" ip address {ip_wan} {SUBNET_MASK}", " alias WAN", " quit",
            "firewall zone untrust", " add interface GigabitEthernet0/0/0", " quit",
            "interface GigabitEthernet0/0/1",
            f" ip address {ip_lan} {SUBNET_MASK}", " alias LAN", " quit",
            "firewall zone trust", " add interface GigabitEthernet0/0/1", " quit",
            f"nat address-group 1 {ip_wan} {ip_wan}",
            "nat-policy interzone trust untrust outbound",
            " policy 1", "  action source-nat", "  address-group 1", " quit", " quit",
            "policy interzone trust untrust outbound",
            " policy 1", "  action permit", " quit", " quit",
            "rsa local-key-pair create", "2048", "y", "stelnet server enable",
            "aaa",
            f" local-user {SSH_USER} password irreversible-cipher {SSH_PASS}",
            f" local-user {SSH_USER} service-type ssh",
            f" local-user {SSH_USER} privilege level 15", " quit",
            "user-interface vty 0 4", " authentication-mode aaa",
            " protocol inbound ssh", " quit",
        ]
        if ipv6:
            dep += ["ipv6", "interface GigabitEthernet0/0/1",
                    f" ipv6 address {ipv6.replace('/64', ' 64')}", " quit"]
        dep += cmds_routing_ipv4("Huawei", proto_v4, ip_lan, as_number, bgp_neighbor)
        dep += cmds_routing_ipv6("Huawei", proto_v6, ipv6, as_number, ospf_router_id)
        dep += ["return", "save", "y"]
        rb += ["system-view",
               "undo interface GigabitEthernet0/0/0",
               "undo interface GigabitEthernet0/0/1",
               "undo firewall zone untrust",
               "undo firewall zone trust",
               "return", "save", "y"]

    elif vendor_fw == "Fortinet FGT":
        dep += [
            "config system global", f"    set hostname {host_fw}", "end",
            "config system interface",
            "    edit wan1", "        set mode static",
            f"        set ip {ip_wan} {SUBNET_MASK}",
            "        set allowaccess ping", "    next",
            "    edit internal", f"        set ip {ip_lan} {SUBNET_MASK}",
            "        set allowaccess ping ssh",
        ]
        if ipv6:
            dep += ["        config ipv6",
                    f"            set ip6-address {ipv6}", "        end"]
        dep += [
            "    next", "end",
            "config firewall policy", "    edit 1",
            "        set name LAN_TO_WAN",
            "        set srcintf internal", "        set dstintf wan1",
            "        set srcaddr all", "        set dstaddr all",
            "        set action accept", "        set schedule always",
            "        set service ALL", "        set nat enable",
            "    next", "end",
            "config system admin", f"    edit {SSH_USER}",
            f"        set password {SSH_PASS}",
            "        set accprofile super_admin", "    next", "end",
            "config system global", "    set admin-ssh-port 22", "end",
            "config router static", "    edit 1",
            "        set gateway " + ".".join(ip_wan.split('.')[:3]) + ".254",
            "        set device wan1", "    next", "end",
        ]
        dep += cmds_routing_ipv4("Fortinet", proto_v4, ip_lan, as_number, bgp_neighbor)
        dep += cmds_routing_ipv6("Fortinet", proto_v6, ipv6, as_number, ospf_router_id)
        rb += ["config firewall policy", "    delete 1", "end",
               "config system interface",
               "    edit wan1", "        unset ip", "    next",
               "    edit internal", "        unset ip", "    next", "end"]
    return dep, rb


# ─────────────────────────────────────────────────────────────────────────────
# Formateo / reset
# ─────────────────────────────────────────────────────────────────────────────
def generar_formato_equipo(vendor, host, nivel, vlan_admin, ip_admin, vlan_datos_list):
    cmds = [
        f"! {'='*60}",
        f"! CORE-NEXUS — FORMATEO PREVIO AL DEPLOY",
        f"! Equipo  : {host}",
        f"! Vendor  : {vendor}",
        f"! Nivel   : {nivel}",
        f"! ADVERTENCIA: Ejecutar ANTES del script de deploy.",
        f"! {'='*60}",
    ]

    if vendor == "Cisco":
        if nivel == "Limpieza Selectiva":
            cmds += ["enable", "configure terminal", ""]
            for v in vlan_datos_list:
                cmds.append(f"no ip dhcp pool POOL_{v}")
            for v in vlan_datos_list:
                cmds += [f"no interface vlan {v}", f"no vlan {v}"]
            cmds += ["no router rip", "no router eigrp 1", "no router ospf 1",
                     "no ipv6 router rip RIPNG_PROC", "no ipv6 router ospf 1",
                     "no ip prefix-list BLOCK_MGMT"]
            for v in vlan_datos_list:
                cmds += [f"interface vlan {v}", f" no standby {HSRP_GRUPO}", " exit"]
            cmds += [f"no ip sla {IPSLA_NUM}", f"no track {TRACK_NUM}",
                     f"no interface port-channel {LACP_CHANNEL_GROUP}",
                     "end", "write memory"]
        elif nivel == "Reset Completo":
            cmds += ["enable", "configure terminal", ""]
            for v in vlan_datos_list:
                cmds += [f"no interface vlan {v}", f"no vlan {v}"]
            cmds += [f"no interface vlan {vlan_admin}", f"no vlan {vlan_admin}",
                     "no ip route 0.0.0.0 0.0.0.0",
                     "no router rip", "no router eigrp 1",
                     "no router ospf 1", "no router bgp 65001",
                     f"username {SSH_USER} privilege 15 secret {SSH_PASS}",
                     f"interface vlan {vlan_admin}",
                     f" ip address {ip_admin} {SUBNET_MASK}",
                     " no shutdown", " exit",
                     "end", "write memory"]
        elif nivel == "Reset de Fábrica":
            cmds += ["enable", "write erase", "delete flash:vlan.dat", "reload"]

    elif vendor == "Huawei":
        if nivel == "Limpieza Selectiva":
            cmds += ["system-view", ""]
            for v in vlan_datos_list:
                cmds += [f"undo interface Vlanif{v}", f"undo vlan {v}"]
            cmds += ["undo rip 1", "undo ospf 1", "undo ospfv3 1", "undo ripng 1",
                     "return", "save", "y"]
        elif nivel == "Reset Completo":
            cmds += ["system-view", ""]
            for v in vlan_datos_list:
                cmds += [f"undo interface Vlanif{v}", f"undo vlan {v}"]
            cmds += [f"undo interface Vlanif{vlan_admin}",
                     f"undo vlan {vlan_admin}",
                     "undo rip 1", "undo ospf 1", "undo bgp all",
                     "return", "save", "y"]
        elif nivel == "Reset de Fábrica":
            cmds += ["system-view", "undo sysname", "return",
                     "reset saved-configuration", "reboot fast"]

    elif vendor == "Fortinet":
        if nivel == "Limpieza Selectiva":
            cmds += ["config system interface"]
            for v in vlan_datos_list:
                cmds.append(f"    delete vlan{v}")
            cmds += ["end"]
        elif nivel == "Reset Completo":
            cmds += ["config system interface"]
            for v in vlan_datos_list:
                cmds.append(f"    delete vlan{v}")
            cmds += [f"    edit vlan{vlan_admin}",
                     f"        set ip {ip_admin} {SUBNET_MASK}",
                     "        set allowaccess ssh", "    next", "end"]
        elif nivel == "Reset de Fábrica":
            cmds += ["execute factoryreset"]

    return cmds
