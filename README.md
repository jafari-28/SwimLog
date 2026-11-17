# SwimLog – M307

SwimLog ist mein Trainingstagebuch fürs Schwimmen. Ich erfasse unter anderem Distanz, Dauer, Intensität und Schlaf. Die Einträge erscheinen im Verlauf und in der Statistik.

## Lokal starten

1. Den Projektordner in VS Code öffnen.
2. Im Terminal zum Prüfen der PHP-Erweiterung `php --ri pdo_sqlite` ausführen.
3. Im Projektordner den PHP-Server starten.

   ```bash
   php -S localhost:8000
   ```

4. Im Browser [http://localhost:8000](http://localhost:8000) öffnen.

Das Projekt benötigt PHP 8 mit `pdo_sqlite`. Beim ersten Aufruf legt `db.php` die lokale `database.sqlite` aus `schema.sql` an. Eine vorhandene Datenbank aus einer älteren SwimLog-Version wird beim ersten Aufruf ergänzt. `database.sqlite` ist in `.gitignore` eingetragen.

Auf dem Mac kannst du PHP mit Homebrew installieren, falls der Befehl fehlt. Führe dafür im Terminal `brew install php` aus.

## Datenfluss

1. `script.js` fängt das Submit-Ereignis des Formulars ab, auch beim Drücken von Enter.
2. JavaScript sendet die Formularfelder als `FormData` per POST an `anfrage.php`. Der Speichern-Button ist während der Anfrage deaktiviert.
3. `anfrage.php` prüft die Werte und sammelt Fehler nach Feld. `db.php` öffnet die SQLite-Verbindung mit PDO.
4. Ein Prepared Statement speichert gültige Daten in der Tabelle `trainings`. PHP gibt JSON mit der ID und Status 201 zurück. Bei ungültigen Feldern antwortet PHP mit Status 422. Bei einem Serverfehler antwortet es mit Status 500.
5. Bei Erfolg zeigt JavaScript eine grüne Meldung, setzt das Formular zurück und lädt den Verlauf neu. Bei Eingabefehlern zeigt es die Meldungen an und markiert die betroffenen Felder.

## Prüfen

1. Formular direkt absenden. Im Netzwerk-Tab erscheint `POST anfrage.php` mit Status 422. Schwimmart, Distanz und Dauer werden markiert.
2. Ein Freistiltraining mit beispielsweise 2'400 m und 60 Minuten speichern. Im Netzwerk-Tab erscheint Status 201 mit einer ID. Der Eintrag erscheint im Verlauf und ist auch nach dem Neuladen sichtbar.
3. Den gespeicherten Datensatz im Projektordner mit SQLite prüfen.

   ```bash
   sqlite3 -header -column database.sqlite \
     'SELECT id, datum, schwimmart, distanz, dauer, trainingstyp, intensitaet_wert, schlaf_stunden, schlaf_qualitaet, notiz FROM trainings ORDER BY id DESC LIMIT 5;'
   ```

4. Den PHP-Server mit Ctrl+C stoppen und das Formular auf der noch geöffneten Seite absenden. Das Formular zeigt einen Verbindungsfehler und behält die Eingaben.

`ERM.svg` zeigt das Datenmodell. Über den Verlauf lassen sich Trainings bearbeiten, filtern, als CSV exportieren und löschen.

## GitHub

Kopiere beim Aktualisieren eines bestehenden Projekts die Projektdateien aus der ZIP-Datei in deinen Repository-Ordner. Behalte eine dort vorhandene lokale Datenbank. Falls die Datenbank oder `.DS_Store` schon in Git erfasst waren, entfernt `git rm --cached --ignore-unmatch -- database.sqlite .DS_Store` sie aus der Git-Dateiliste. Die Dateien bleiben auf dem Mac.

```bash
git status
git add .gitignore README.md ERM.svg index.html style.css script.js api.php anfrage.php db.php schema.sql
git commit -m "M307: Trainingsformular mit PHP und SQLite verbinden"
git push
```

Prüfe auf GitHub, ob die beiden neuen PHP-Dateien im Repository stehen. Die Datenbank gehört zur lokalen Projektkopie.
