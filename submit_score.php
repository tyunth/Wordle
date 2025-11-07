<?php
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST');
header('Access-Control-Allow-Headers: Content-Type');

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    echo json_encode(['error' => 'Метод не разрешён']);
    exit;
}

$data = json_decode(file_get_contents('php://input'), true);

$mode = $data['mode'] ?? '';
$name = trim($data['name'] ?? '');
$attempts = $data['attempts'] ?? 0;
$date = $data['date'] ?? date('Y-m-d');

if (!$mode || !$name || $attempts <= 0) {
    echo json_encode(['error' => 'Неверные данные']);
    exit;
}

// Антиспам: 1 запрос в 30 сек с одного IP
$ip = $_SERVER['REMOTE_ADDR'];
$spamFile = __DIR__ . '/data/spam_log.json';
$spamLog = file_exists($spamFile) ? json_decode(file_get_contents($spamFile), true) : [];
$now = time();

foreach ($spamLog as $key => $entry) {
    if ($now - $entry['time'] > 30) unset($spamLog[$key]);
}
if (isset($spamLog[$ip])) {
    echo json_encode(['error' => 'Слишком часто! Подожди 30 сек']);
    exit;
}
$spamLog[$ip] = ['time' => $now];
file_put_contents($spamFile, json_encode(array_values($spamLog)));

// Определяем файл
if ($mode === 'daily') {
    $file = __DIR__ . "/data/daily_{$date}.json";
} else {
    $file = __DIR__ . '/data/infinite.json';
}

// Создаём файл, если нет
if (!file_exists($file)) {
    file_put_contents($file, '[]');
    chmod($file, 0666);
}

$board = json_decode(file_get_contents($file), true);

// Ищем игрока
$found = false;
foreach ($board as &$player) {
    if ($player['name'] === $name) {
        $found = true;
        if ($mode === 'daily') {
            if ($attempts < $player['attempts']) {
                $player['attempts'] = $attempts;
            }
        } else {
            $player['wins']++;
        }
        break;
    }
}

if (!$found) {
    if ($mode === 'daily') {
        $board[] = ['name' => $name, 'attempts' => $attempts];
    } else {
        $board[] = ['name' => $name, 'wins' => 1];
    }
}

// Сортировка
if ($mode === 'daily') {
    usort($board, fn($a, $b) => $a['attempts'] - $b['attempts']);
} else {
    usort($board, fn($a, $b) => $b['wins'] - $a['wins']);
}

// Оставляем топ-10
$board = array_slice($board, 0, 10);

// Сохраняем с блокировкой
$fp = fopen($file, 'c+');
if (flock($fp, LOCK_EX)) {
    ftruncate($fp, 0);
    fwrite($fp, json_encode($board, JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT));
    fflush($fp);
    flock($fp, LOCK_UN);
}
fclose($fp);

echo json_encode(['success' => true]);
?>