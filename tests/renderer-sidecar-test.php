<?php
/**
 * Standalone smoke-test for the Satori renderer sidecar.
 * Run: php tests/renderer-sidecar-test.php
 *
 * Expects renderer running on localhost:8766 (start with: node services/renderer/src/server.js)
 * Writes PNGs to tests/render-output/
 */

$base   = 'http://localhost:8766';
$outDir = __DIR__ . '/render-output';
@mkdir($outDir, 0755, true);

$presets = ['editorial_geometry', 'typographic_poster', 'quiet_editorial', 'grid_technical', 'bold_block'];
$formats = ['story', 'feed_portrait'];

$pass = 0;
$fail = 0;

// Health check
$health = @file_get_contents($base . '/health');
$healthOk = $health && (json_decode($health, true)['ok'] ?? false) === true;
echo "[health] " . ($healthOk ? "PASS" : "FAIL: $health") . "\n";
if (! $healthOk) { echo "Renderer not running. Exiting.\n"; exit(1); }

$config = [
    'public_id'           => 'MF-TEST01',
    'message'             => 'Hai, ini adalah pesan test untuk sidecar renderer. Semoga hasilnya keren!',
    'target_text'         => 'Kepada Seseorang',
    'alias_text'          => 'Dari Kamu',
    'category'            => 'galau',
    'tags'                => ['galau', 'senin'],
    'show_logo'           => true,
    'show_website_url'    => true,
    'show_public_id'      => true,
    'song_text'           => 'Lagu Sedih',
    'artist_text'         => 'Artis Keren',
    'music_start_ms'      => 30000,
    'music_duration_ms'   => 30000,
    'music_artwork_url'   => null,
    'music_artwork_path'  => null,
    'class'               => [
        'name'             => 'Menfess Test',
        'logo_asset_key'   => null,
        'website_label'    => 'pinatmenfess.nl',
        'instagram_handle' => '@pinatmenfess',
    ],
    'design' => [
        'source'           => 'builtin',
        'pattern_key'      => 'dots',
        'pattern_color'    => '#FFFFFF',
        'pattern_opacity'  => 0.06,
    ],
];

foreach ($presets as $preset) {
    foreach ($formats as $format) {
        $cfg           = $config;
        $cfg['format'] = $format;
        $cfg['design']['preset'] = $preset;

        $ctx = stream_context_create([
            'http' => [
                'method'  => 'POST',
                'header'  => "Content-Type: application/json\r\n",
                'content' => json_encode($cfg),
                'timeout' => 10,
            ],
        ]);

        $png  = @file_get_contents($base . '/render', false, $ctx);
        $code = (int) (explode(' ', $http_response_header[0] ?? '')[1] ?? 0);
        $size = $png ? strlen($png) : 0;

        $label = "{$preset}/{$format}";

        // Validate: HTTP 200, non-empty, starts with PNG magic bytes
        $isPng = $size > 8 && substr($png, 0, 8) === "\x89PNG\r\n\x1a\n";

        if ($code === 200 && $isPng) {
            $file = "{$outDir}/{$preset}_{$format}.png";
            file_put_contents($file, $png);
            echo "[PASS] {$label} — {$size} bytes → {$file}\n";
            $pass++;
        } else {
            echo "[FAIL] {$label} — HTTP {$code}, size {$size}" . ($isPng ? '' : ', not PNG') . "\n";
            $fail++;
        }
    }
}

echo "\n{$pass} passed, {$fail} failed.\n";
exit($fail > 0 ? 1 : 0);
