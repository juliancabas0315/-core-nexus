# CORE-NEXUS · Enterprise Network Engine

Generador automático de scripts de configuración multi-vendor (Cisco / Huawei / Fortinet)
para switches, routers y firewalls — con soporte de VLANs, IPv6, protocolos de enrutamiento
y alta disponibilidad.

![status](https://img.shields.io/badge/status-active-success)
![python](https://img.shields.io/badge/python-3.10+-blue)
![framework](https://img.shields.io/badge/framework-FastAPI-009688)

---

## ✨ Características

- **Multi-vendor**: Cisco IOS, Huawei VRP, Fortinet FortiOS
- **Multi-equipo**: Switches, Routers, Firewalls
- **VLANs independientes** del número de switches con DHCP automático
- **IPv6**: ULA, Link-Local o solo IPv4
- **Protocolos de enrutamiento**: RIPv2, EIGRP, BGP, OSPF (+ RIPng, OSPFv3, EIGRPv6)
- **Alta disponibilidad**: HSRP/VRRP, IP SLA + ruta flotante, Rapid PVST + LACP
- **Formateo previo**: limpieza selectiva, reset completo, reset de fábrica
- **Sesiones persistentes** en archivos JSON
- **Code preview** con syntax highlighting en vivo
- **Tema claro/oscuro**, acentos personalizables, densidad ajustable

---

## 🚀 Inicio rápido

### Requisitos

- Python **3.10 o superior**
- pip

### Instalación

```bash
git clone https://github.com/juliancabas0315/-core-nexus.git
cd core-nexus
pip install -r requirements.txt
```

### Arrancar

```bash
uvicorn server:app --reload --port 8000
```

> En Windows, si `uvicorn` no se reconoce como comando:
> ```powershell
> py -m uvicorn server:app --reload --port 8000
> ```

Abre **http://localhost:8000** en tu navegador.

---

## 🏗️ Arquitectura

```
┌──────────────────────────┐                    ┌──────────────────────────┐
│   Frontend (HTML/React)  │   fetch /api/...   │   FastAPI (server.py)    │
│   - Formularios          │ ─────────────────▶ │   - Endpoints REST       │
│   - Code preview         │ ◀───────────────── │   - Llama engine.py      │
│   - VLAN editor          │   {deploy, rb}     │   - Persiste sesiones    │
└──────────────────────────┘                    └──────────────────────────┘
                                                            │
                                                            ▼
                                                ┌──────────────────────────┐
                                                │   engine.py              │
                                                │   (funciones puras Py)   │
                                                └──────────────────────────┘
```

### Stack

- **Backend**: FastAPI + Pydantic + Uvicorn
- **Frontend**: React 18 (vía CDN, sin build step)
- **Estilos**: CSS vars + IBM Plex Sans/Mono
- **Persistencia**: Archivos JSON en `sessions/`

---

## 📂 Estructura

```
core-nexus/
├── server.py                ← FastAPI · sirve frontend + API REST
├── engine.py                ← Lógica de generación de CLI (sin framework)
├── requirements.txt
├── CORE-NEXUS Redesign.html ← Frontend principal
├── app.jsx                  ← App React raíz
├── api.js                   ← Cliente fetch al API
├── icons.jsx
├── sidebar.jsx
├── tabs-content.jsx
├── vlan-editor.jsx
├── code-preview.jsx
├── resumen.jsx
├── tweaks-panel.jsx
└── sessions/                ← Sesiones guardadas (ignorado por git)
```

---

## 🔌 API

Documentación interactiva en **http://localhost:8000/docs**

| Método | Path | Descripción |
|---|---|---|
| `POST` | `/api/generate/switch` | Genera CLI de switch (deploy + rollback) |
| `POST` | `/api/generate/router` | Genera CLI de router |
| `POST` | `/api/generate/firewall` | Genera CLI de firewall |
| `POST` | `/api/generate/format` | Genera script de reset/formateo |
| `GET`  | `/api/sessions` | Lista sesiones guardadas |
| `GET`  | `/api/sessions/{id}` | Carga una sesión |
| `POST` | `/api/sessions` | Guarda una sesión nueva |
| `DELETE` | `/api/sessions/{id}` | Borra una sesión |

---

## 🐳 Deploy con Docker

```dockerfile
FROM python:3.11-slim
WORKDIR /app
COPY . .
RUN pip install -r requirements.txt
EXPOSE 8000
CMD ["uvicorn", "server:app", "--host", "0.0.0.0", "--port", "8000"]
```

```bash
docker build -t core-nexus .
docker run -p 8000:8000 -v ./sessions:/app/sessions core-nexus
```

---

## 📜 Licencia

MIT — ver [LICENSE](LICENSE).

---

## 🙋 Autor

Construido sobre la lógica original de CORE-NEXUS en Streamlit, migrado a
una arquitectura FastAPI + frontend custom para mayor control visual y mejor UX.
