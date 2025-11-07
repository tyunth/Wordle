<?php
// === РАЗРЕШЕНИЯ ===
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    header('HTTP/1.1 200 OK');
    exit;
}

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, GET, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

// === ТОЛЬКО POST ===
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['error' => 'Метод не разрешён']);
    exit;
}

// === ЧТЕНИЕ ДАННЫХ ===
$data = json_decode(file_get_contents('php://input'), true);

$mode = $data['mode'] ?? '';
$name = trim($data['name'] ?? '');
$attempts = $data['attempts'] ?? 0;
$date = $data['date'] ?? date('Y-m-d');

if (!$mode || !$name || $attempts <= 0) {
    http_response_code(400);
    echo json_encode(['error' => 'Неверные данные']);
    exit;
}

// === АНТИСПАМ (30 сек) ===
$ip = $_SERVER['REMOTE_ADDR'];
$spamFile = __DIR__ . '/data/spam_log.json';
$spamLog = file_exists($spamFile) ? json_decode(file_get_contents($spamFile), true) : [];
$now = time();

foreach ($spamLog as $key => $entry) {
    if ($now - $entry['time'] > 30) unset($spamLog[$key]);
}
if (isset($spamLog[$ip])) {
    http_response_code(429);
    echo json_encode(['error' => 'Слишком часто! Подожди 30 сек']);
    exit;
}
$spamLog[$ip] = ['time' => $now];
file_put_contents($spamFile, json_encode(array_values($spamLog)));

// === ФАЙЛ ===
$file = $mode === 'daily' 
    ? __DIR__ . "/data/daily_{$date}.json" 
    : __DIR__ . '/data/infinite.json';

// Создаём, если нет
if (!file_exists($file)) {
    file_put_contents($file, '[]');
    chmod($file, 0666);
}

$board = json_decode(file_get_contents($file), true);
if (!$board) $board = [];

// Обновляем игрока
$found = false;
foreach ($board as &$player) {
    if ($player['name'] === $name) {
        $found = true;
        if ($mode === 'daily' && $attempts < ($player['attempts'] ?? 999)) {
            $player['attempts'] = $attempts;
        } elseif ($mode !== 'daily') {
            $player['wins'] = ($player['wins'] ?? 0) + 1;
        }
        break;
    }
}

if (!$found) {
    $board[] = $mode === 'daily'
        ? ['name' => $name, 'attempts' => $attempts]
        : ['name' => $name, 'wins' => 1];
}

// Сортировка
if ($mode === 'daily') {
    usort($board, fn($a, $b) => ($a['attempts'] ?? 999) - ($b['attempts'] ?? 999));
} else {
    usort($board, fn($a, $b) => ($b['wins'] ?? 0) - ($a['wins'] ?? 0));
}

$board = array_slice($board, 0, 10);

// === БЕЗОПАСНАЯ ЗАПИСЬ ===
$fp = fopen($file, 'c+');
if ($fp && flock($fp, LOCK_EX)) {
    ftruncate($fp, 0);
    fwrite($fp, json_encode($board, JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT));
    fflush($fp);
    flock($fp, LOCK_UN);
    fclose($fp);
    echo json_encode(['success' => true]);
} else {
    http_response_code(500);
    echo json_encode(['error' => 'Ошибка записи']);
}
?>
