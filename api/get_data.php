<?php
header("Access-Control-Allow-Origin: *");

$tantargy = isset($_GET['name']) ? $_GET['name'] : '';
$felev = isset($_GET['semester']) ? $_GET['semester'] : '2024-2025-2';

if (empty($tantargy)) {
    echo json_encode(["error" => "A tanárgyak kódjai kötelezőek!"]);
    exit;
}

$encodedName = urlencode($tantargy);
$url = "https://tanrend.elte.hu/tanrendnavigation.php?k={$encodedName}&m=keres_kod_azon&f={$felev}";
$ch = curl_init();
curl_setopt($ch, CURLOPT_URL, $url);
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_FOLLOWLOCATION, true);
$response = curl_exec($ch);

if (curl_errno($ch)) {
    echo json_encode(["error" => curl_error($ch)]);
    exit;
}

$contentType = curl_getinfo($ch, CURLINFO_CONTENT_TYPE);        
curl_close($ch);

$encoding = null;

if (preg_match('/charset=([\w-]+)/i', $contentType, $matches)) {
    $encoding = $matches[1];
}

if ($encoding && strtoupper($encoding) !== 'UTF-8') {
    $response = mb_convert_encoding($response, 'UTF-8', $encoding);
}

libxml_use_internal_errors(true);
$dom = new DOMDocument();
@$dom->loadHTML('<?xml encoding="UTF-8">' . $response);
$xpath = new DOMXPath($dom);

$entries = $xpath->query('//table[contains(@id, "resulttable")]//tr');
$courses = [];

foreach ($entries as $entry) {
    $cols = $entry->getElementsByTagName('td');
    if ($cols->length > 0) {
        $idopont = trim($cols->item(0)->nodeValue);
        $tantargy = trim($cols->item(2)->nodeValue);
        $kodok = trim($cols->item(1)->nodeValue);
        $tanar = trim($cols->item(5)->nodeValue);

        $courses[] = [
            'idopont' => $idopont,           
            'tantargy' => $tantargy,
            'kodok' => $kodok,
            'tanar' => $tanar
        ];
    }
}

header('Content-Type: application/json; charset=utf-8');
echo json_encode($courses, JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT);
?>