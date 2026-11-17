<?php
declare(strict_types=1);

function verbindeDatenbank(): PDO
{
    $pdo = new PDO('sqlite:' . __DIR__ . '/database.sqlite', null, null, [
        PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
    ]);
    $pdo->exec('PRAGMA busy_timeout = 5000');
    $pdo->exec('PRAGMA foreign_keys = ON');

    $spalten = array_column($pdo->query('PRAGMA table_info(trainings)')->fetchAll(), 'name');
    if (!$spalten) {
        $schema = file_get_contents(__DIR__ . '/schema.sql');
        if ($schema === false) {
            throw new RuntimeException('schema.sql konnte nicht gelesen werden.');
        }
        $pdo->exec($schema);
        return $pdo;
    }

    $ergaenzungen = [
        'trainingstyp' => 'TEXT',
        'intensitaet_wert' => 'INTEGER CHECK (intensitaet_wert BETWEEN 1 AND 10)',
        'schlaf_stunden' => 'REAL CHECK (schlaf_stunden BETWEEN 0 AND 16)',
        'schlaf_qualitaet' => 'INTEGER CHECK (schlaf_qualitaet BETWEEN 1 AND 10)',
    ];
    if (!array_diff_key($ergaenzungen, array_flip($spalten))) {
        return $pdo;
    }

    // Ältere Datenbanken können bereits einzelne der neuen Spalten enthalten.
    $pdo->exec('BEGIN IMMEDIATE');
    try {
        $spalten = array_column($pdo->query('PRAGMA table_info(trainings)')->fetchAll(), 'name');
        foreach (array_diff_key($ergaenzungen, array_flip($spalten)) as $name => $typ) {
            $pdo->exec("ALTER TABLE trainings ADD COLUMN $name $typ");
        }
        $pdo->exec('COMMIT');
    } catch (Throwable $fehler) {
        $pdo->exec('ROLLBACK');
        throw $fehler;
    }

    return $pdo;
}
