<?php
declare(strict_types=1);

require_once __DIR__ . '/db.php';

ini_set('display_errors', '0');
header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store');

const INTENSITAETSSTUFEN = ['Locker' => 2, 'Mittel' => 5, 'Hart' => 8, 'Sehr hart' => 10];

function antworte(int $status, array $daten): void
{
    if (defined('SWIMLOG_API_KOMPATIBEL')) {
        $daten['success'] = $daten['ok'];
        if (isset($daten['meldung'])) {
            $daten['message'] = $daten['meldung'];
        }
    }
    http_response_code($status);
    echo json_encode($daten, JSON_UNESCAPED_UNICODE | JSON_INVALID_UTF8_SUBSTITUTE);
    exit;
}

function fehlerAntwort(int $status, string $meldung): void
{
    antworte($status, ['ok' => false, 'meldung' => $meldung]);
}

function liesText($wert): string
{
    return is_string($wert) ? trim($wert) : '';
}

function ganzeZahl($wert, int $min, int $max): ?int
{
    if (!is_string($wert) && !is_int($wert) && !is_float($wert)) {
        return null;
    }
    $zahl = filter_var($wert, FILTER_VALIDATE_INT, [
        'options' => ['min_range' => $min, 'max_range' => $max],
    ]);
    return $zahl === false ? null : $zahl;
}

function gueltigesDatum(string $datum): bool
{
    if (!preg_match('/^\d{4}-\d{2}-\d{2}\z/', $datum) || str_starts_with($datum, '0000')) {
        return false;
    }
    $zeitzone = new DateTimeZone('Europe/Zurich');
    $tag = DateTimeImmutable::createFromFormat('!Y-m-d', $datum, $zeitzone);
    return $tag !== false && $tag->format('Y-m-d') === $datum
        && $tag <= new DateTimeImmutable('today', $zeitzone);
}

function pruefeTraining(array $eingabe, bool $altesFormular): array
{
    $datum = liesText($eingabe['date'] ?? $eingabe['datum'] ?? null);
    $schwimmart = liesText($eingabe['stroke'] ?? $eingabe['schwimmart'] ?? null);
    $distanz = ganzeZahl($eingabe['distance'] ?? $eingabe['distanz'] ?? null, 1, 50000);
    $dauer = ganzeZahl($eingabe['duration'] ?? $eingabe['dauer'] ?? null, 1, 600);
    $stufe = liesText($eingabe['intensitaet'] ?? null);
    $intensitaet = $altesFormular
        ? (INTENSITAETSSTUFEN[$stufe] ?? null)
        : ganzeZahl($eingabe['intensity'] ?? null, 1, 10);
    $typ = liesText($eingabe['type'] ?? null);
    $schlafEingabe = $eingabe['sleep'] ?? null;
    $schlaf = is_numeric($schlafEingabe) ? (float) $schlafEingabe : null;
    $qualitaet = ganzeZahl($eingabe['quality'] ?? null, 1, 10);
    $notizEingabe = $eingabe['description'] ?? $eingabe['notiz'] ?? '';
    $notiz = liesText($notizEingabe);
    $zeichen = preg_match_all('/./us', $notiz);

    $fehler = [];
    if (!gueltigesDatum($datum)) {
        $fehler['date'] = 'Wähle ein gültiges Datum bis heute.';
    }
    if (!in_array($schwimmart, ['Freistil', 'Rücken', 'Brust', 'Delfin', 'Lagen', 'Gemischt'], true)) {
        $fehler['stroke'] = 'Wähle eine Schwimmart.';
    }
    if ($distanz === null) {
        $fehler['distance'] = "Gib eine Distanz zwischen 1 und 50'000 Metern ein.";
    }
    if ($dauer === null) {
        $fehler['duration'] = 'Gib eine Dauer zwischen 1 und 600 Minuten ein.';
    }
    if ($intensitaet === null) {
        $fehler['intensity'] = 'Die Intensität muss zwischen 1 und 10 liegen.';
    }
    if (!$altesFormular) {
        if (!in_array($typ, ['Sprint', 'Ausdauer', 'Technik', 'Kraft', 'Regeneration', 'Wettkampf'], true)) {
            $fehler['type'] = 'Wähle einen Trainingstyp.';
        }
        if ($schlaf === null || !is_finite($schlaf) || $schlaf < 0 || $schlaf > 16) {
            $fehler['sleep'] = 'Gib zwischen 0 und 16 Stunden Schlaf ein.';
        }
        if ($qualitaet === null) {
            $fehler['quality'] = 'Die Schlafqualität muss zwischen 1 und 10 liegen.';
        }
    }
    if (!is_string($notizEingabe) || $zeichen === false || $zeichen > 600) {
        $fehler['description'] = 'Die Beschreibung darf höchstens 600 Zeichen enthalten.';
    }

    return [$fehler, [
        'datum' => $datum,
        'schwimmart' => $schwimmart,
        'distanz' => $distanz,
        'dauer' => $dauer,
        'intensitaet' => $altesFormular ? $stufe : (string) $intensitaet,
        'notiz' => $notiz === '' ? null : $notiz,
        'trainingstyp' => $typ === '' ? null : $typ,
        'intensitaet_wert' => $intensitaet,
        'schlaf_stunden' => $schlaf,
        'schlaf_qualitaet' => $qualitaet,
    ]];
}

function liesTrainings(PDO $pdo): array
{
    $abfrage = $pdo->query('
        SELECT id, datum, schwimmart, distanz, dauer, intensitaet, notiz, erstellt_am,
               trainingstyp, intensitaet_wert, schlaf_stunden, schlaf_qualitaet
        FROM trainings ORDER BY datum DESC, id DESC
    ');
    $trainings = [];
    foreach ($abfrage as $zeile) {
        $stufe = $zeile['intensitaet'];
        $intensitaet = $zeile['intensitaet_wert'] ?? INTENSITAETSSTUFEN[$stufe] ?? (is_numeric($stufe) ? $stufe : 5);
        $training = [
            'id' => (int) $zeile['id'],
            'date' => $zeile['datum'],
            'stroke' => $zeile['schwimmart'],
            'distance' => (int) $zeile['distanz'],
            'duration' => (int) $zeile['dauer'],
            'intensity' => (int) $intensitaet,
            'type' => $zeile['trainingstyp'] ?: 'Nicht angegeben',
            'sleep' => $zeile['schlaf_stunden'] === null ? null : (float) $zeile['schlaf_stunden'],
            'quality' => $zeile['schlaf_qualitaet'] === null ? null : (int) $zeile['schlaf_qualitaet'],
            'description' => $zeile['notiz'] ?? '',
            'createdAt' => $zeile['erstellt_am'] ?? '',
        ];
        $trainings[] = defined('SWIMLOG_API_KOMPATIBEL') ? $training + $zeile : $training;
    }
    return $trainings;
}

$methode = $_SERVER['REQUEST_METHOD'] ?? 'GET';
if (!in_array($methode, ['GET', 'POST', 'PUT', 'DELETE'], true)) {
    header('Allow: GET, POST, PUT, DELETE');
    fehlerAntwort(405, 'Diese HTTP-Methode ist nicht erlaubt.');
}

try {
    if ($methode === 'GET') {
        antworte(200, ['ok' => true, 'trainings' => liesTrainings(verbindeDatenbank())]);
    }

    $inhaltstyp = strtolower(trim(explode(';', $_SERVER['CONTENT_TYPE'] ?? '', 2)[0]));
    if ($methode === 'POST' && $inhaltstyp !== 'application/json') {
        $eingabe = $_POST;
    } else {
        $json = json_decode(file_get_contents('php://input') ?: '');
        if (!is_object($json)) {
            fehlerAntwort(400, 'Bitte sende gültige JSON-Daten.');
        }
        $eingabe = (array) $json;
    }

    if ($methode === 'DELETE' && ($eingabe['all'] ?? false) === true) {
        verbindeDatenbank()->exec('DELETE FROM trainings');
        antworte(200, ['ok' => true, 'meldung' => 'Alle Trainings wurden gelöscht.']);
    }

    $id = ganzeZahl($eingabe['id'] ?? null, 1, PHP_INT_MAX);
    if ($methode !== 'POST' && $id === null) {
        fehlerAntwort(422, 'Ungültige Training-ID.');
    }

    if ($methode === 'DELETE') {
        $pdo = verbindeDatenbank();
        $anweisung = $pdo->prepare('DELETE FROM trainings WHERE id = :id');
        $anweisung->execute(['id' => $id]);
        if ($anweisung->rowCount() === 0) {
            fehlerAntwort(404, 'Training nicht gefunden.');
        }
        antworte(200, ['ok' => true, 'meldung' => 'Training gelöscht.']);
    }

    $altesFormular = defined('SWIMLOG_API_KOMPATIBEL') && $methode === 'POST'
        && array_key_exists('datum', $eingabe) && !array_key_exists('date', $eingabe);
    [$fehler, $werte] = pruefeTraining($eingabe, $altesFormular);
    if ($fehler) {
        antworte(422, [
            'ok' => false,
            'meldung' => 'Korrigiere die markierten Felder.',
            'fehler' => $fehler,
        ]);
    }

    $pdo = verbindeDatenbank();
    if ($methode === 'POST') {
        $anweisung = $pdo->prepare('
            INSERT INTO trainings (
                datum, schwimmart, distanz, dauer, intensitaet, notiz,
                trainingstyp, intensitaet_wert, schlaf_stunden, schlaf_qualitaet
            ) VALUES (
                :datum, :schwimmart, :distanz, :dauer, :intensitaet, :notiz,
                :trainingstyp, :intensitaet_wert, :schlaf_stunden, :schlaf_qualitaet
            )
        ');
        $anweisung->execute($werte);
        antworte(201, [
            'ok' => true,
            'meldung' => 'Training gespeichert.',
            'id' => (int) $pdo->lastInsertId(),
        ]);
    }

    $anweisung = $pdo->prepare('
        UPDATE trainings SET datum = :datum, schwimmart = :schwimmart,
            distanz = :distanz, dauer = :dauer, intensitaet = :intensitaet,
            notiz = :notiz, trainingstyp = :trainingstyp, intensitaet_wert = :intensitaet_wert,
            schlaf_stunden = :schlaf_stunden, schlaf_qualitaet = :schlaf_qualitaet
        WHERE id = :id
    ');
    $anweisung->execute($werte + ['id' => $id]);
    if ($anweisung->rowCount() === 0) {
        fehlerAntwort(404, 'Training nicht gefunden.');
    }
    antworte(200, ['ok' => true, 'meldung' => 'Training aktualisiert.']);
} catch (PDOException $fehler) {
    error_log('SwimLog SQLite: ' . $fehler->getMessage());
    fehlerAntwort(500, 'Die SQLite-Datenbank ist gerade nicht verfügbar.');
} catch (Throwable $fehler) {
    error_log('SwimLog: ' . $fehler->getMessage());
    fehlerAntwort(500, 'Die Anfrage konnte aufgrund eines Serverfehlers nicht verarbeitet werden.');
}
