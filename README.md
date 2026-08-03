# nCall Dashboard

Anrufstatistik-Dashboard für eine Auerswald COMtrexx VM. Läuft als ein einziger
Docker-Container: ein FastAPI-Backend mit eingebautem täglichem Sync-Job und
SQLite-Datenbank, das gleichzeitig das React-Dashboard im Browser ausliefert.

## Schnellstart (Demo-Modus)

Ohne jede Konfiguration startet der Container im **Mock-Modus** mit
synthetischen Beispieldaten für 8 Standorte, damit man das Dashboard sofort
im Browser ausprobieren kann.

```bash
docker compose up --build -d
```

Danach im Browser öffnen: `http://<server>:8080`

## Installation auf Unraid

Es gibt ein fertiges Image unter `ghcr.io/1899nils/ncall-dashboard:latest`,
gebaut per GitHub Actions bei jedem Push (`.github/workflows/docker-publish.yml`).
Kein lokaler Build auf Unraid nötig.

**Einmalig (falls noch nicht geschehen):** Das GHCR-Paket muss auf öffentlich
gestellt werden, sonst kann Unraid es ohne Login nicht ziehen: auf GitHub unter
`https://github.com/1899nils?tab=packages` → Paket `ncall-dashboard` öffnen →
„Package settings“ → „Change visibility“ → **Public**.

### Variante A: Container manuell anlegen (funktioniert immer)

1. Unraid-Weboberfläche → Tab **Docker** → **Add Container** (unten).
2. Folgende Felder ausfüllen:
   - **Name**: `ncall-dashboard`
   - **Repository**: `ghcr.io/1899nils/ncall-dashboard:latest` ← das ist der „Link“
   - **Network Type**: `bridge`
3. Unter „Add another Path, Port, Variable…“ hinzufügen:

   | Typ | Name | Container-Port/-Pfad/-Variable | Wert |
   |---|---|---|---|
   | Port | WebUI | `8080` | `8080` |
   | Path | Daten | `/data` | `/mnt/user/appdata/ncall-dashboard` |
   | Variable | `TZ` | – | `Europe/Berlin` |
   | Variable | `COMTREXX_MOCK` | – | `true` (Demo) bzw. `false` (live) |
   | Variable | `COMTREXX_BASE_URL` | – | `https://<comtrexx-ip>/api/v1` |
   | Variable | `COMTREXX_USERNAME` | – | API-Benutzer |
   | Variable | `COMTREXX_PASSWORD` | – | Passwort |

4. **Apply** klicken — Unraid zieht das Image und startet den Container.
5. Dashboard öffnen: `http://<unraid-ip>:8080`

### Variante B: Fertiges Template verwenden (Community Applications)

Falls das CA-Plugin installiert ist: **Apps** → Zahnrad-Icon → **Template
Repositories** → folgende URL eintragen und speichern:

```
https://github.com/1899nils/nCall-Dashboard
```

Danach ist „ncall-dashboard“ in **Apps** → „Local“/eigene Vorlagen suchbar und
lässt sich per Klick installieren (Port, Pfad und Variablen sind schon aus
`unraid/ncall-dashboard.xml` vorausgefüllt, Zugangsdaten müsst ihr noch
eintragen).

### Live-Betrieb

Sobald `COMTREXX_MOCK=false` sowie `COMTREXX_BASE_URL`/`COMTREXX_USERNAME`/
`COMTREXX_PASSWORD` gesetzt sind, Container neu starten und im Dashboard auf
„Jetzt synchronisieren“ klicken (siehe Abschnitt „COMtrexx-Anbindung
einrichten“ unten).

## Architektur

```
Docker-Container
├── FastAPI-Backend (Port 8080)
│   ├── liefert /api/* (Anrufe, Statistik, Standort-Zuordnung, Sync-Status)
│   ├── liefert das gebaute React-Frontend als statische Dateien aus
│   ├── APScheduler: täglicher Sync-Job (Standard: 00:15 Uhr)
│   └── SQLite-DB unter /data (Docker-Volume, überlebt Neustarts)
└── React-Frontend (Filter, Tabelle, Charts)
```

## COMtrexx-Anbindung einrichten

Der Connector ist gegen die echte COMtrexx-API (v0.0.37, `ctx-api-v1.yml`
von einer laufenden Anlage) implementiert:

- **Login**: `POST /login` mit HTTP-Basic-Auth-Header → COMtrexx setzt ein
  `ctx_sessionid`-Cookie (Session, ca. 24h gültig). Der Connector loggt sich
  bei Bedarf automatisch (neu) ein.
- **Anrufdaten**: `GET /calldata` (paginiert über `limit`/`offset`, da die
  API keinen serverseitigen Datumsfilter kennt — der Connector blättert
  selbst durch und filtert clientseitig; Duplikate werden beim Sync anhand
  der `CallDataId` verworfen).

Um live zu gehen:

1. Einen API-Benutzer in COMtrexx anlegen (mit Zugriff auf alle Nebenstellen/
   Gesprächsdaten, nicht nur den eigenen Account) — reines Leserecht reicht.
2. In `docker-compose.yml` (oder `.env`) setzen:
   ```
   COMTREXX_MOCK=false
   COMTREXX_BASE_URL=https://<comtrexx-ip>/api/v1
   COMTREXX_USERNAME=<api-user>
   COMTREXX_PASSWORD=<passwort>
   # Falls die Anlage ein selbstsigniertes Zertifikat nutzt:
   COMTREXX_VERIFY_SSL=false
   ```
3. Container neu starten und über den Button „Jetzt synchronisieren“ im
   Dashboard (oder `POST /api/sync/run`) einen Testlauf auslösen; Fehler
   erscheinen im Sync-Status und in `docker compose logs`.

Falls sich Feldnamen oder Endpunkte mit eurer Firmware-Version unterscheiden,
ist alles an einer Stelle gebündelt: `backend/app/comtrexx/client.py`
(`fetch_call_journal` fürs Abrufen, `map_record` fürs Feld-Mapping).

Bis Schritt 2 erledigt ist, läuft der Container im Mock-Modus weiter — das
Dashboard ist unabhängig davon voll benutzbar.

## Standort-Zuordnung (8 Standorte)

COMtrexx kennt selbst keinen "Standort" pro Anruf — die Zuordnung erfolgt
über ein Präfix-Mapping auf die interne Nebenstellennummer, verwaltbar über
`GET/POST/DELETE /api/sites`. Beispiel-Seed über die Env-Var
`SITE_MAPPING_SEED`:

```json
[
  {"prefix": "10", "site": "Zentrale"},
  {"prefix": "20", "site": "Standort Nord"},
  {"prefix": "30", "site": "Standort Sued"}
]
```

Der längste passende Präfix gewinnt bei Überschneidungen.

## Konfiguration (Umgebungsvariablen)

Siehe `.env.example` für alle Optionen: COMtrexx-Zugang, `SYNC_CRON`
(5-Feld-Cron-Ausdruck, ausgewertet in der Zeitzone aus `TZ`),
`SYNC_LOOKBACK_DAYS` (Backfill beim allerersten Lauf) und `SITE_MAPPING_SEED`.

## Betrieb im internen Netz

Der Container braucht lediglich Netzwerkzugriff auf die COMtrexx-VM (über
euer bestehendes VPN). Empfehlung: auf einem separaten kleinen Host/VM im
internen Netz betreiben (z. B. eigene Hetzner-VM oder ein vorhandener
Docker-Host), Port 8080 nur intern erreichbar machen und bei Bedarf per
Reverse Proxy mit TLS versehen.

## Daten & Datenschutz

Anrufdaten enthalten personenbezogene Daten (Rufnummern, Gesprächsverhalten).
Zugriff auf das Dashboard entsprechend einschränken und eine
Aufbewahrungsfrist festlegen (aktuell ist keine automatische Löschung
implementiert).

## Lokale Entwicklung ohne Docker

```bash
# Backend
cd backend
pip install -r requirements.txt
COMTREXX_MOCK=true DATABASE_PATH=./dev.db uvicorn app.main:app --reload --port 8080

# Frontend (separates Terminal, proxied auf Port 8080)
cd frontend
npm install
npm run dev
```
