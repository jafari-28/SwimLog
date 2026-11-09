# SwimLog – M307

Kleine Webanwendung zum Erfassen von Schwimmtrainings.

## Aufbau

- `index.html` – Formular und Anzeige der gespeicherten Trainings
- `style.css` – Gestaltung der Oberfläche
- `script.js` – Formular abfangen, `fetch()` und Ausgabe der Daten
- `api.php` – verarbeitet GET/POST und verbindet sich mit SQLite
- `schema.sql` – SQL-Schema der Tabelle
- `database.sqlite` – fertige SQLite-Datenbank
- `ERM.svg` – Entity-Relationship-Modell

## Lokal starten

Im VS-Code-Terminal im Projektordner:

```bash
php -S localhost:8000
```

Danach im Browser öffnen:

`http://localhost:8000`

Wichtig: Die Seite nicht einfach per Doppelklick als `file://` öffnen, weil PHP sonst nicht ausgeführt wird.

## Datenmodell

Entität: **TRAINING**

- `id` – Primärschlüssel
- `datum` – Datum des Trainings
- `schwimmart` – Freistil, Rücken, Brust, Delfin, Lagen oder Gemischt
- `distanz` – Distanz in Metern
- `dauer` – Dauer in Minuten
- `intensitaet` – Belastungsstufe
- `notiz` – optionale Bemerkung
- `erstellt_am` – wird automatisch von SQLite gesetzt
