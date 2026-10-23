# Runbook: Entwicklungsumgebung learn-sdn-hub

Zwei empfohlene Wege. Beide brauchen **Node.js 22** (`.nvmrc` = `v22`), Git, ein Terminal und einen SSH-Client.

> 🔐 **Secrets:** Zugangsdaten (MongoDB-Verbindung, `CLAB_*`, Tokens) kommen ausschließlich aus Environment-Variablen der eigenen Shell bzw. aus dem Secret-Store der Umgebung. **Niemals** in dieses Runbook, in ein Repo, in ein Lab-Sheet oder in einen Issue schreiben. Den Wert für `MONGODB_URL` gibt es separat von der Betreuung.

---

## Variante A — Node-Workspaces (empfohlen für die tägliche Arbeit)

```sh
git clone git@github.com:prona-p4-learning-platform/learn-sdn-hub.git
cd learn-sdn-hub
npm install                     # npm-Workspaces: backend + frontend
```

**Terminal 1 — Backend** (ein Provider ist Pflicht; Docker als Standardweg):

```sh
cd backend
export DOCKER_IMAGE="prona/p4-container"
export DOCKER_CMD="-s"
export DOCKER_MAX_INSTANCE_LIFETIME_MINUTES=120
export SSH_USERNAME=p4
export SSH_PASSWORD=p4
npm run start:docker
```

unter Windows z.B. in der PowerShell Variablen entsprechend setzen mit `$env:` und auch den docker socket path auf dessen Location unter Windows anpassen:

```powershell
cd backend
$env:DOCKER_SOCKET_PATH="//./pipe/docker_engine"
$env:DOCKER_IMAGE="prona/p4-container"
$env:DOCKER_CMD="-s"
$env:DOCKER_MAX_INSTANCE_LIFETIME_MINUTES=120
$env:SSH_USERNAME=p4
$env:SSH_PASSWORD=p4
npm run start:docker
```

Alternativen mit demselben Muster: `npm run start:proxmox`, `npm run start:firecracker`, `npm run start:openstack`, `npm run start:localmultiuservm`, `npm run start:k8s`.

**Terminal 2 — Frontend:**

```sh
cd frontend
npm run dev
```

Vite läuft auf **Port 3000** und proxyt `/api/*` sowie `/ws/*` auf `http://localhost:3001` (Backend). Läuft das Backend woanders, in `frontend/.env.local` setzen:

```sh
VITE_REACT_APP_API_HOST=http://localhost:3001
VITE_REACT_APP_WS_HOST=ws://localhost:3001
```

**Login:** Im Entwicklungsbetrieb ist der einfachste Weg die Plaintext-Mehrbenutzer-Authentifizierung über `BACKEND_USERS`/`BACKEND_USER_MAPPING` (z. B. `user1:password1`); OIDC/Keycloak ist optional.

**Persistenz:** `MONGODB_URL` (geteilte Atlas-Instanz oder lokale MongoDB, z. B. im `dev-stack/k8s` enthalten). Ohne gesetzte Variable nutzen die Entwicklungsstartpunkte die In-Memory-Ablage.

**Häufige Stolpersteine**

| Symptom | Ursache / Lösung |
|---|---|
| Frontend lädt, API-Aufrufe scheitern | Backend läuft nicht auf `:3001` oder `.env.local` zeigt falsch |
| Backend bricht sofort ab | Für den jeweiligen Startpunkt fehlende Pflichtvariablen (z. B. Docker/Proxmox/`MONGODB_URL`) |
| `npm run start:localvm` schlägt fehl | Skript ist verwaist (`src/LocalVMApplication.ts` existiert nicht) — `start:docker`/`start:localmultiuservm` verwenden |

---

## Variante B — Assignment in einem containerlab-Lab

Zusätzlich nötig: ein containerlab-Host (auch `localhost` möglich) und ein **clab-api-server ≥ v0.7.0** (Workspace-Datei-Endpunkte, `deploy?path=`, Terminal-Sessions-API).

```sh
# auf dem containerlab-Host: API-Server starten (Variante 1: CLI)
containerlab tools api-server            # Port/Adresse je nach Version prüfen
# Variante 2: Container-Image von clab-api-server verwenden

# im Repo/Backend:
cd backend
export CLAB_USERNAME="…"
export CLAB_PASSWORD="…"
export CLAB_APIURL="https://<clab-host>:8090"
export CLAB_MAX_INSTANCE_LIFETIME_MINUTES=120
export CLAB_LAB_PREFIX="teamX-"          # PFLICHT bei geteiltem Server, siehe Warnung
export CLAB_API_TLS_INSECURE=false       # nur bei selbstsignierten Zertifikaten auf true
export MONGODB_URL="…"                   # ContainerLabApplication bricht ohne diese Variable ab
npm run start:containerlab
```

Weitere optionale Variablen: `CLAB_TOKEN_DURATION_IN_MINUTES` (Default 60), `CLAB_API_TLS_INSECURE`.

> ⚠️ **`CLAB_LAB_PREFIX` setzen, wenn der clab-api-server geteilt ist.** Mit leerem Präfix behandelt der periodische Prune *alle* Labs auf dem Server als eigene und kann fremde Labs löschen, sobald deren Lebensdauer überschritten ist.

**Assignments mit Topologie:** Ein Assignment kann seine Topologie über `topologyUrl` beziehen; die Datei wird geladen, auf den gruppen-eigenen Lab-Namen umgeschrieben und im clab-api-server-Workspace abgelegt. Relativ referenzierte Dateien (z. B. `server1/dnsmasq.conf`) werden mitgeladen — Referenzen müssen **innerhalb** des Topologie-Verzeichnisses bleiben. Vorlagen: `examples/containerlab-provider/` und das Assignment `Containerlab-Dnsmasq-TopologyUrl` in `backend/src/Configuration.ts`.

**Terminals:** `DockerShell` verbindet sich über die Terminal-Sessions des API-Servers direkt in einen Lab-Container (kein `sshd` nötig); `Shell` verbindet per SSH auf den Jumphost-/Management-Host des Labs.

Lab-Namensschema: `${CLAB_LAB_PREFIX}${environmentId}-${groupNumber}-${username}`.

---

## Qualitätsgates (identisch zur CI)

```sh
cd backend  && npm test && npm run lint && npm run type-check
cd frontend && npm run lint && npm run build
# optional/lokal: cd backend && npm run test:integration   (startet MongoDB lokal)
# optional/lokal: npm run format:check
```

Vor jeder Erfolgsmeldung ausführen und die Ausgabe im PR nennen.

## Entwicklungswerkzeuge (agentisch)

Der Zugang zu LLM-Endpunkten (lokale GPU-Endpunkte über einen Proxy) wird von der Betreuung gestellt. Für agentische Werkzeuge gilt: **erst Plan, dann Code** — Details und Guardrails siehe [`AGENTS.md`](../AGENTS.md).
