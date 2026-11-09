<?php

header("Content-Type: application/json; charset=utf-8");

try {
    $db = new PDO("sqlite:" . __DIR__ . "/database.sqlite");
    $db->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
    $db->setAttribute(PDO::ATTR_DEFAULT_FETCH_MODE, PDO::FETCH_ASSOC);

    if ($_SERVER["REQUEST_METHOD"] === "GET") {
        $stmt = $db->query("
            SELECT id, datum, schwimmart, distanz, dauer, intensitaet, notiz
            FROM trainings
            ORDER BY datum DESC, id DESC
            LIMIT 20
        ");

        echo json_encode([
            "success" => true,
            "trainings" => $stmt->fetchAll()
        ], JSON_UNESCAPED_UNICODE);
        exit;
    }

    if ($_SERVER["REQUEST_METHOD"] === "POST") {
        $datum = trim($_POST["datum"] ?? "");
        $schwimmart = trim($_POST["schwimmart"] ?? "");
        $distanz = filter_var($_POST["distanz"] ?? null, FILTER_VALIDATE_INT);
        $dauer = filter_var($_POST["dauer"] ?? null, FILTER_VALIDATE_INT);
        $intensitaet = trim($_POST["intensitaet"] ?? "");
        $notiz = trim($_POST["notiz"] ?? "");

        if ($datum === "" || $schwimmart === "" || $distanz === false || $dauer === false || $intensitaet === "") {
            sendError("Bitte alle Pflichtfelder korrekt ausfüllen.", 400);
        }

        $dateObject = DateTime::createFromFormat("Y-m-d", $datum);
        if (!$dateObject || $dateObject->format("Y-m-d") !== $datum) {
            sendError("Das Datum ist ungültig.", 400);
        }

        $allowedStyles = ["Freistil", "Rücken", "Brust", "Delfin", "Lagen", "Gemischt"];
        $allowedIntensity = ["Locker", "Mittel", "Hart", "Sehr hart"];

        if (!in_array($schwimmart, $allowedStyles, true)) {
            sendError("Die Schwimmart ist ungültig.", 400);
        }

        if (!in_array($intensitaet, $allowedIntensity, true)) {
            sendError("Die Intensität ist ungültig.", 400);
        }

        if ($distanz < 1 || $distanz > 50000 || $dauer < 1 || $dauer > 600) {
            sendError("Distanz oder Dauer liegt ausserhalb des erlaubten Bereichs.", 400);
        }

        if (mb_strlen($notiz) > 500) {
            sendError("Die Notiz darf maximal 500 Zeichen lang sein.", 400);
        }

        $stmt = $db->prepare("
            INSERT INTO trainings (datum, schwimmart, distanz, dauer, intensitaet, notiz)
            VALUES (?, ?, ?, ?, ?, ?)
        ");

        $stmt->execute([$datum, $schwimmart, $distanz, $dauer, $intensitaet, $notiz]);

        echo json_encode([
            "success" => true,
            "message" => "Training erfolgreich gespeichert."
        ], JSON_UNESCAPED_UNICODE);
        exit;
    }

    sendError("Diese HTTP-Methode ist nicht erlaubt.", 405);
} catch (PDOException $error) {
    sendError("Datenbankfehler: Prüfe, ob database.sqlite und die Tabelle 'trainings' vorhanden sind.", 500);
}

function sendError(string $message, int $statusCode): void
{
    http_response_code($statusCode);
    echo json_encode([
        "success" => false,
        "message" => $message
    ], JSON_UNESCAPED_UNICODE);
    exit;
}
