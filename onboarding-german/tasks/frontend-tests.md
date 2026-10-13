# Aufgabe: Frontend-Tests einführen (Vitest + React Testing Library)

**Für:** ein Team (nicht Teil des Onboarding-Gates)
**Aufwand:** Setup ~2–4 h, danach erste Tests ~1 Woche
**Betreuung:** vorhanden (keine Vorerfahrung nötig)

## Ausgangslage

Das Frontend (`frontend/`) hat **kein** Test-Setup: kein `test`-Skript in `package.json`, keine
Testdateien, keinen CI-Schritt. Die CI prüft dort nur `lint` und `build`. Gleichzeitig ist das
Frontend der größte ungetestete Teil des Projekts (~15 Views/Komponenten, `FileEditor.tsx` ~34 KB).
Für KI-unterstützte Entwicklung ist das besonders relevant: Tests sind das Gate, an dem generierter
Code scheitern kann.

## Ziel

Ein lauffähiges, kleines Test-Setup mit einer dünnen, aber echten Testabdeckung, das in der CI mitläuft.

## Schritt 1 — Setup (kann von der Betreuung vorbereitet werden)

Dev-Abhängigkeiten in `frontend/package.json`:

```sh
cd frontend
npm install -D vitest jsdom @testing-library/react @testing-library/jest-dom @testing-library/user-event
```

`frontend/vitest.config.ts` (oder Test-Block in `vite.config.ts`):

```ts
import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["./src/test/setup.ts"],
    restoreMocks: true,
    include: ["src/**/*.{test,spec}.{ts,tsx}"],
  },
});
```

`frontend/src/test/setup.ts`:

```ts
import "@testing-library/jest-dom/vitest";
```

Skripte ergänzen:

```json
"test": "vitest run",
"test:watch": "vitest",
"test:coverage": "vitest run --coverage"
```

## Schritt 2 — Erste Tests (steigende Schwierigkeit)

1. **Reine Logik** (kein DOM, schnellster Einstieg):
   - `src/utilities/ListCompareHelper.ts`
   - `src/stores/*` (zustand-Stores: Zustandsübergänge)
2. **API-Schicht mit gemocktem `ofetch`:**
   - `src/api/Request.ts` → `createCustomFetch` mit zod-Validierung: gültige Antwort,
     ungültige Antwort, Fehlerpfad (`vi.mock("ofetch")`).
3. **Komponenten mit gemockter API:**
   - `src/components/assignments/NormalAssignment.tsx`
   - `src/components/SubmissionOverview.tsx`
   - Wrapper nötig: `QueryClientProvider` (@tanstack/react-query) und MUI-Theme.

## Bekannte Grenzen (Scope bewusst klein halten)

- `jsdom` rendert kein echtes Canvas: **xterm.js ist nicht sinnvoll testbar**, Monaco ebenfalls
  nicht — diese Komponenten per `vi.mock` ersetzen oder auslassen.
- WebSockets über `src/api/WebSocket.ts` mocken; kein echtes Backend im Test.
- Keine End-to-End-Tests als Einstieg (optional später Playwright-Smoke für den Deploy-Flow).

## Akzeptanzkriterien

- [ ] `cd frontend && npm test` läuft lokal und in der CI grün (Schritt in `ci-checks.yaml`).
- [ ] Mindestens eine Logik-Suite und zwei Komponententests existieren.
- [ ] Die Tests prüfen **beobachtbares Verhalten** (Rendering, Zustandswechsel, Fehleranzeige) —
      nicht Implementierungsdetails wie Feldkopien oder Aufrufreihenfolgen.
- [ ] Die Tests schlagen bei einem echten Fehler fehl: nachweisbar durch eine bewusst eingebaute
      Regression, die den Test rot macht.
- [ ] Kurze Anleitung im Repo (z. B. Abschnitt in `frontend/README.md` und im Onboarding-Deck):
      „Wie schreibe ich hier einen Test?"

## Hinweise für die Betreuung

- Setup (Schritt 1) vorab einrichten und den Studierenden als Ausgangspunkt geben — dann ist die
  Aufgabe eine Test-Aufgabe, keine Tooling-Aufgabe.
- Als Folgeaufgabe anbieten: dieselbe Struktur für einen zweiten View (`views/Assignments.tsx`).
