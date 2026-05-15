"""
CORE-NEXUS · FastAPI Server
============================
Sirve el frontend HTML y expone la lógica de Python como API REST.

Ejecutar:
    pip install fastapi uvicorn
    uvicorn server:app --reload --port 8000

Después abre: http://localhost:8000
"""

from fastapi import FastAPI, HTTPException
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel
from typing import Optional, List
import json
import os
import datetime
import uuid

from engine import (
    generar_ipv6,
    generar_config_switch,
    generar_config_router,
    generar_config_firewall,
    generar_formato_equipo,
    cmds_vlan_admin,
)

# ─────────────────────────────────────────────────────────────────────────────
# App
# ─────────────────────────────────────────────────────────────────────────────
app = FastAPI(title="CORE-NEXUS API", version="5.0")

SESSIONS_DIR = "sessions"
os.makedirs(SESSIONS_DIR, exist_ok=True)


# ─────────────────────────────────────────────────────────────────────────────
# Modelos
# ─────────────────────────────────────────────────────────────────────────────

class VlanIn(BaseModel):
    vlan:   int
    name:   str
    ipv4:   str
    ipv6:   Optional[str] = None


class SwitchReq(BaseModel):
    vendor:           str             # "Cisco" | "Huawei" | "Fortinet"
    host:             str
    vlans:            List[VlanIn]
    proto_v4:         str = "Ninguno"
    proto_v6:         str = "Ninguno"
    as_number:        int = 65001
    bgp_neighbor:     str = "192.168.0.254"
    bgp_neighbor_as:  int = 65002
    ospf_router_id:   str = "1.1.1.1"
    vlan_admin:       int = 10
    ip_admin:         str = "192.168.255.1"
    modo_ha:          str = "Ninguno"
    ip_respaldo:      str = "192.168.0.254"
    es_activo:        bool = True
    ipv6_mode:        str = "ULA (fd00::/8) — Recomendado"


class RouterReq(BaseModel):
    vendor:           str
    host:             str
    ipv4:             str
    ipv6:             Optional[str] = None
    proto_v4:         str = "Ninguno"
    proto_v6:         str = "Ninguno"
    as_number:        int = 65001
    bgp_neighbor:     str = "192.168.0.254"
    bgp_neighbor_as:  int = 65002
    ospf_router_id:   str = "1.1.1.1"
    vlan_admin:       int = 10
    ip_admin:         str = "192.168.255.1"
    modo_ha:          str = "Ninguno"
    ip_respaldo:      str = "192.168.0.254"
    es_activo:        bool = True
    iface_lan:        str = "GigabitEthernet0/0"
    iface_wan:        str = "GigabitEthernet0/1"


class FirewallReq(BaseModel):
    vendor:           str             # "Cisco ASA" | "Huawei USG" | "Fortinet FGT"
    host:             str
    ip_wan:           str
    ip_lan:           str
    ipv6:             Optional[str] = None
    proto_v4:         str = "Ninguno"
    proto_v6:         str = "Ninguno"
    as_number:        int = 65001
    bgp_neighbor:     str = "192.168.0.254"
    ospf_router_id:   str = "1.1.1.1"


class FormatReq(BaseModel):
    vendor:           str
    host:             str
    nivel:            str             # "Limpieza Selectiva" | "Reset Completo" | "Reset de Fábrica"
    vlan_admin:       int = 10
    ip_admin:         str = "192.168.255.1"
    vlan_datos:       List[int] = []


class SessionIn(BaseModel):
    proyecto:  str
    switches:  List[dict] = []
    routers:   List[dict] = []
    firewalls: List[dict] = []
    vlans_globales: List[dict] = []
    log:       List[dict] = []
    tema:      str = "dark"


# ─────────────────────────────────────────────────────────────────────────────
# Endpoints — Generadores de CLI
# ─────────────────────────────────────────────────────────────────────────────

@app.post("/api/generate/switch")
def gen_switch(req: SwitchReq):
    vlans_obj = [v.dict() for v in req.vlans]
    cmds_admin = cmds_vlan_admin(req.vendor, req.vlan_admin, req.ip_admin, req.host)
    deploy, rollback = generar_config_switch(
        req.vendor, req.host, vlans_obj,
        req.proto_v4, req.proto_v6,
        req.as_number, req.bgp_neighbor, req.bgp_neighbor_as,
        req.ospf_router_id, cmds_admin,
        req.vlan_admin, req.ip_admin,
        req.modo_ha, req.ip_respaldo, req.es_activo,
    )
    return {"deploy": "\n".join(deploy), "rollback": "\n".join(rollback)}


@app.post("/api/generate/router")
def gen_router(req: RouterReq):
    deploy, rollback = generar_config_router(
        req.vendor, req.ipv4, req.ipv6, req.host,
        req.proto_v4, req.proto_v6,
        req.as_number, req.bgp_neighbor, req.bgp_neighbor_as,
        req.ospf_router_id, [],
        req.vlan_admin, req.ip_admin,
        req.modo_ha, req.ip_respaldo, req.es_activo,
        iface_lan=req.iface_lan, iface_wan=req.iface_wan,
    )
    return {"deploy": "\n".join(deploy), "rollback": "\n".join(rollback)}


@app.post("/api/generate/firewall")
def gen_firewall(req: FirewallReq):
    deploy, rollback = generar_config_firewall(
        req.vendor, req.host, req.ip_wan, req.ip_lan, req.ipv6,
        req.proto_v4, req.proto_v6,
        req.as_number, req.bgp_neighbor, req.ospf_router_id,
    )
    return {"deploy": "\n".join(deploy), "rollback": "\n".join(rollback)}


@app.post("/api/generate/format")
def gen_format(req: FormatReq):
    cmds = generar_formato_equipo(
        req.vendor, req.host, req.nivel,
        req.vlan_admin, req.ip_admin, req.vlan_datos,
    )
    return {"deploy": "\n".join(cmds), "rollback": "! sin rollback — operación destructiva"}


@app.get("/api/ipv6")
def ipv6_from_ipv4(ipv4: str, modo: str = "ULA"):
    """Helper: dada una IPv4, devuelve la IPv6 equivalente según el modo."""
    res = generar_ipv6(ipv4, modo)
    return {"ipv6": res}


# ─────────────────────────────────────────────────────────────────────────────
# Endpoints — Sesiones (persistencia en disco como JSON)
# ─────────────────────────────────────────────────────────────────────────────

@app.get("/api/sessions")
def list_sessions():
    files = sorted(os.listdir(SESSIONS_DIR), reverse=True)
    sessions = []
    for f in files:
        if not f.endswith(".json"):
            continue
        path = os.path.join(SESSIONS_DIR, f)
        try:
            with open(path) as fh:
                data = json.load(fh)
            sessions.append({
                "id":       f.replace(".json", ""),
                "proyecto": data.get("proyecto", "—"),
                "creada":   data.get("creada", ""),
                "switches": len(data.get("switches", [])),
                "routers":  len(data.get("routers", [])),
                "firewalls":len(data.get("firewalls", [])),
            })
        except (json.JSONDecodeError, OSError):
            continue
    return sessions


@app.get("/api/sessions/{session_id}")
def get_session(session_id: str):
    path = os.path.join(SESSIONS_DIR, f"{session_id}.json")
    if not os.path.exists(path):
        raise HTTPException(404, "Sesión no encontrada")
    with open(path) as f:
        return json.load(f)


@app.post("/api/sessions")
def save_session(data: SessionIn):
    sid = uuid.uuid4().hex[:12]
    payload = data.dict()
    payload["id"] = sid
    payload["creada"] = payload.get("creada") or datetime.datetime.now().strftime("%Y-%m-%d %H:%M")
    with open(os.path.join(SESSIONS_DIR, f"{sid}.json"), "w") as f:
        json.dump(payload, f, indent=2, ensure_ascii=False)
    return {"id": sid, "ok": True}


@app.delete("/api/sessions/{session_id}")
def delete_session(session_id: str):
    path = os.path.join(SESSIONS_DIR, f"{session_id}.json")
    if os.path.exists(path):
        os.remove(path)
    return {"ok": True}


# ─────────────────────────────────────────────────────────────────────────────
# Frontend estático
# ─────────────────────────────────────────────────────────────────────────────
# El HTML, JSX, CSS y JS viven en el mismo directorio.
# Servimos el index al raíz y todos los demás archivos estáticamente.

@app.get("/")
def root():
    return FileResponse("CORE-NEXUS Redesign.html")

# Esto sirve cualquier .jsx, .js, .css, .png en el root como recurso estático
app.mount("/static", StaticFiles(directory="."), name="static")

# Y servimos los .jsx directamente desde la raíz (porque el HTML los referencia
# como "tweaks-panel.jsx", "icons.jsx", etc.)
@app.get("/{filename:path}")
def serve_file(filename: str):
    if not filename or ".." in filename:
        raise HTTPException(404)
    if os.path.isfile(filename):
        return FileResponse(filename)
    raise HTTPException(404, f"No existe: {filename}")
