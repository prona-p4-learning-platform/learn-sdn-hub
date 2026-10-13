# Onboarding — learn-sdn-hub

Material für die Einarbeitung neuer Gruppen in `learn-sdn-hub`. Dieses Verzeichnis ist dafür gedacht, **im Repo** zu leben (`onboarding-german/`), damit es zusammen mit dem Code versioniert, per PR verbessert und in jeder Kohorte wiederverwendet werden kann.

> **Status:** Staging-Fassung (Stand 08.10.2026). Zielort: `onboarding-german/` im `learn-sdn-hub`-Repo. Inhalte sind gegen `master` = `88a8b7c` (06.10.2026) verifiziert.
>
> **Sprachkonvention:** Im Repo ist Englisch der Default; deutsch ist nur dieses Einführungsmaterial für die deutschsprachige Kohorte — erkennbar am `-german`-Suffix (dieses Verzeichnis, das Lab-Sheet `onboarding-tour-german.md`). Englische, repo-weite Artefakte (Draft `AGENTS.md`, CI-Workflow) liegen daneben in `repo-drafts/`.

## Inhalt

| Datei | Zweck |
|---|---|
| `slides/code-tour.md` | Code-Tour als **Marp**-Deck: Architektur, Stationen 1–10, Terminal-/Editor-Pfad, Provider-Naht, Containerlab, CI, Team-Prozess. Basis für die Sitzung „Code-Tour" und zum Nachlesen |
| `assignments/onboarding-tour-german.md` | Lab-Sheet des Einstiegs-Assignments „Onboarding-Tour" (gehört ins Repo als `backend/src/assignments/onboarding-tour-german.md`; das Assignment selbst wird in `backend/src/Configuration.ts` unter dem Key `Onboarding-Tour` registriert) |
| `runbook-setup.md` | Betriebs-Runbook für die zwei empfohlenen Entwicklungswege (Node-Workspaces, Containerlab-Host) inkl. Persistenz/Secrets |
| `tasks/frontend-tests.md` | vorbereitete Team-Aufgabe „Frontend-Tests einführen" mit Setup-Schritten und Akzeptanzkriterien |
| `../repo-drafts/AGENTS.md` | englischer Guardrail-Draft für agentische Werkzeuge — nach Review als `AGENTS.md` ins Repo-Root |
| `../repo-drafts/ci-checks.yaml` | englischer CI-Workflow (Lint/Type-Check/Tests, **ohne** Image-Builds) — nach Review nach `.github/workflows/` |

Ergänzend (außerhalb dieses Ordners): `ONBOARDING.md` im Projektordner der Lehrveranstaltung enthält den vollständigen Onboarding-Plan (Ablauf, Termine, Ziele, Risiken, Entscheidungsprotokoll).

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
