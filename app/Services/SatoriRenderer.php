<?php

namespace App\Services;

use Illuminate\Support\Facades\Http;

class SatoriRenderer
{
    public function __construct(
        private string $baseUrl = 'http://renderer:8766',
    ) {}

    /**
     * POST config to /render, return raw PNG bytes.
     *
     * @throws \RuntimeException on HTTP error or timeout
     */
    public function render(array $config): string
    {
        $response = Http::timeout(5)->post($this->baseUrl . '/render', $config);

        if (! $response->successful()) {
            throw new \RuntimeException(
                'SatoriRenderer HTTP ' . $response->status() . ': ' . $response->body()
            );
        }

        return $response->body();
    }

    /**
     * Render full-size then scale down to 540px wide.
     * ponytail: preview scaling lives here so the controller fallback path is identical for render/preview.
     *
     * @throws \RuntimeException on HTTP error or timeout
     */
    public function renderPreview(array $config): string
    {
        $png = $this->render($config);

        $img = @imagecreatefromstring($png);
        if ($img === false) return $png;

        $ow = imagesx($img);
        $oh = imagesy($img);
        $pw = 540;
        $ph = (int) round($pw * $oh / $ow);

        $scaled = imagescale($img, $pw, $ph, IMG_BICUBIC);
        imagedestroy($img);
        if ($scaled === false) return $png;

        ob_start();
        imagepng($scaled);
        $out = ob_get_clean();
        imagedestroy($scaled);

        return $out;
    }

    /**
     * GET /health — returns true when sidecar is up.
     */
    public function health(): bool
    {
        try {
            return Http::timeout(5)->get($this->baseUrl . '/health')->successful();
        } catch (\Throwable) {
            return false;
        }
    }
}
