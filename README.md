# Ultimate Variants

Ideen und Hausregeln für Brettspiele sammeln. Ein Spiel ist ein Freitext-Name (neu erfunden oder bestehend), darunter liegen Ideen, gruppiert nach Typ (`Setup`, `Start`, `Ingame`, `Endgame` oder eigene Typen pro Spiel).

Die App ist eine offline-fähige Web-App (PWA) nur für den eigenen Gebrauch. Alle Daten bleiben im Browser des Geräts; es gibt keinen Server.

## Funktionen

- Spiele anlegen, umbenennen, löschen; Suche über Spielnamen und Ideen
- Ideen mit Typ erfassen, bearbeiten, löschen; eigene Typen pro Spiel
- **Favoriten**: Stern auf der Ideen-Karte, Favoriten stehen in ihrer Gruppe oben; Filter „Nur Favoriten“ in der Spielansicht
- Datensicherung als JSON-Datei (Export/Import in den Einstellungen, ⚙); Import liest auch Exporte ohne Favoriten-Feld

## Benutzung

Die App unter `https://oliverwestphal16-cpu.github.io/ultimate-variants/` öffnen und über das Browsermenü „Zum Startbildschirm hinzufügen“. Danach funktioniert sie auch ohne Internet. Regelmäßig exportieren: Löscht man die App-Daten des Browsers, sind die Ideen weg.

## Entwicklung

```bash
npm install
npm run dev        # Entwicklungsserver
npm test           # Unit-Tests der Datenlogik (src/domain)
npm run build      # Produktions-Build nach dist/
```

Die Datenlogik liegt framework-frei in `src/domain/store.ts` und ist getestet; die Oberfläche in `src/main.ts`.

Wer npm über einen Registry-Spiegel betreibt: Vor dem Commit `npm run lockfile:normalize` ausführen, damit `package-lock.json` nur auf `registry.npmjs.org` verweist.

## Deployment

Jeder Push auf `main` testet, baut und veröffentlicht die App über GitHub Actions auf GitHub Pages (`.github/workflows/deploy.yml`). Einmalig im Repo einstellen: *Settings → Pages → Build and deployment → Source: GitHub Actions*.

## Authors & Responsibilities

- Flumpie16 ([@oliverwestphal16-cpu](https://github.com/oliverwestphal16-cpu)) – Idee, Anforderungen, Pflege
