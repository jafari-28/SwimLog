-- Neuinstallation: Datenmodell M307 + Felder aus der SwimLog-Skizze
CREATE TABLE IF NOT EXISTS trainings (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    datum TEXT NOT NULL,
    schwimmart TEXT NOT NULL,
    distanz INTEGER NOT NULL CHECK (distanz > 0),
    dauer INTEGER NOT NULL CHECK (dauer > 0),
    intensitaet TEXT NOT NULL,
    notiz TEXT,
    erstellt_am DATETIME DEFAULT CURRENT_TIMESTAMP,
    trainingstyp TEXT,
    intensitaet_wert INTEGER CHECK(intensitaet_wert BETWEEN 1 AND 10),
    schlaf_stunden REAL CHECK(schlaf_stunden BETWEEN 0 AND 16),
    schlaf_qualitaet INTEGER CHECK(schlaf_qualitaet BETWEEN 1 AND 10)
);
