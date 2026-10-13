# Onboarding — learn-sdn-hub

Material für die Einarbeitung neuer Gruppen in `learn-sdn-hub`. Dieses Verzeichnis ist dafür gedacht, **im Repo** zu leben (`onboarding-german/`), damit es zusammen mit dem Code versioniert, per PR verbessert und in jeder Kohorte wiederverwendet werden kann.

> **Status:** Inhalte gegen `master` = `bd0d698` (13.10.2026) verifiziert. Haltet das Deck aktuell: Der „Stand"-Verweis auf der Titelfolie nennt den Commit, an dem die Code-Tour zuletzt geprüft wurde.
>
> **Sprachkonvention:** Im Repo ist Englisch der Default; deutsch ist nur dieses Einführungsmaterial für die deutschsprachige Kohorte — erkennbar am `-german`-Suffix (dieses Verzeichnis, das Lab-Sheet `onboarding-tour-german.md`). Repo-weite Regeln für agentische Werkzeuge stehen in [`AGENTS.md`](../AGENTS.md).

## Inhalt

| Datei | Zweck |
|---|---|
| `slides/code-tour.md` | Code-Tour als **Marp**-Deck: Architektur, Stationen 1–10, Terminal-/Editor-Pfad, Provider-Naht, Containerlab, CI, Team-Prozess. Basis für die Sitzung „Code-Tour" und zum Nachlesen |
| `assignments/onboarding-tour-german.md` | Lab-Sheet des Einstiegs-Assignments „Onboarding-Tour" — **verbindliche Kopie**: `backend/src/assignments/onboarding-tour-german.md` (dort lädt das Backend die Lab-Sheets her; hier nur gespiegelt. Registriert in `backend/src/Configuration.ts` unter dem Key `Onboarding-Tour`) |
| `runbook-setup.md` | Betriebs-Runbook für die zwei empfohlenen Entwicklungswege (Node-Workspaces, Containerlab-Host) inkl. Persistenz/Secrets |
| `tasks/frontend-tests.md` | vorbereitete Team-Aufgabe „Frontend-Tests einführen" mit Setup-Schritten und Akzeptanzkriterien |
| `../AGENTS.md` | Guardrails für agentische Werkzeuge und Kurz-Einstieg für Menschen |
| `.github/workflows/ci-checks.yaml` (auf `develop`) | schlanker CI-Workflow (Lint/Type-Check/Tests, **ohne** Image-Builds) mit Job für dieses Material |

## Ablauf in Kurzform

1. **Setup** (Runbook, §„Variante A/B") — lauffähige Umgebung, Zugänge.
2. **Code-Tour** (Deck) — Architektur verstehen, Fragen notieren.
3. **Einstiegs-Assignment** (`onboarding-tour`) — ein eigenes, minimales Assignment bauen: ein Terminal, eine editierbare Datei, zwei Prüf-Schritte.
4. **Erster PR** — Review durch Teammitglied, CI grün, Plan-Artefakt und KI-Notiz in der PR-Beschreibung.

## Konventionen

- **Erst Plan, dann Code:** bei kleinen Änderungen genügt ein Plan-Absatz im Issue/PR; bei größeren Vorhaben Spec + Task-Plan als Dateien (Vorbild: `docs/superpowers/{specs,plans}/`).
- **Qualitätsgates:** genau die Kommandos aus dem Deck („Qualitätsgates") — CI läuft mit denselben Schritten.
- **Secrets:** keine Zugangsdaten in Dateien dieses Ordners, in Lab-Sheets, Slides oder Issues — auch nicht `MONGODB_URL` aus der geteilten MongoDB-Atlas-Instanz.
- **KI-Nutzung:** kurz im PR dokumentieren (Tool/Kategorie, Anwendungsfall, Grad der manuellen Nacharbeit).
