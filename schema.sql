CREATE TABLE IF NOT EXISTS trainings (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    datum TEXT NOT NULL,
    schwimmart TEXT NOT NULL,
    distanz INTEGER NOT NULL CHECK (distanz > 0),
    dauer INTEGER NOT NULL CHECK (dauer > 0),
    intensitaet TEXT NOT NULL,
    notiz TEXT,
    erstellt_am DATETIME DEFAULT CURRENT_TIMESTAMP
);
