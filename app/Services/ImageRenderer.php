<?php

namespace App\Services;

use App\Models\ClassDesign;
use App\Support\DesignFormat;
use Illuminate\Support\Facades\Storage;

/**
 * Server-side image renderer using PHP GD.
 *
 * Five composition-oriented presets. Each preset defines:
 *   - a visual grammar (allowed shape vocabulary, scale, density, cropping)
 *   - a layout function (text zones, metadata placement)
 *
 * Decorative geometry uses normalized coordinates (w/h fractions).
 * Shapes may intentionally cross canvas boundaries.
 * Positions are deterministic — no runtime randomness.
 *
 * Fonts: resources/fonts/Poppins-{Regular,Bold}.ttf
 * Falls back to GD built-in fonts when TTF unavailable.
 */
class ImageRenderer
{
    private const PILL_RADIUS = 20;

    // -------------------------------------------------------------------------
    // Preset palette definitions
    // -------------------------------------------------------------------------
    private const PRESETS = [
        /**
         * Editorial Geometry
         * Grammar: 2 oversized partial rings bleeding off canvas. Thick stroke arcs.
         * One tonal content zone (not a white card). All shapes normalized.
         * Max decorative objects: 5. No small shapes.
         */
        'editorial_geometry' => [
            'layout'      => 'editorial_geometry',
            'bg_default'  => '#1A1F2E',
            'accent'      => [88,  120, 255],
            'text_main'   => [240, 238, 230],
            'text_dim'    => [170, 168, 158],
            'text_meta'   => [120, 118, 108],
            'tag_bg'      => [88,  120, 255, 82],
            'tag_text'    => [240, 238, 230],
        ],

        /**
         * Typographic Poster
         * Grammar: Zero decorative geometry. One rule line. One optional accent dot.
         * Typography IS the composition. Left-aligned + justified text.
         */
        'typographic_poster' => [
            'layout'      => 'typographic_poster',
            'bg_default'  => '#0D0D0D',
            'accent'      => [200, 240, 80],
            'text_main'   => [250, 248, 240],
            'text_dim'    => [160, 158, 148],
            'text_meta'   => [100, 98,  88],
            'tag_bg'      => [200, 240, 80, 100],
            'tag_text'    => [20,  20,  10],
        ],

        /**
         * Quiet Editorial
         * Grammar: Single left vertical bar spanning 84% of height.
         * One short horizontal accent rule. Zero other shapes.
         * Cream background. White space is intentional.
         */
        'quiet_editorial' => [
            'layout'      => 'quiet_editorial',
            'bg_default'  => '#E8E0D4',
            'accent'      => [90,  130, 88],
            'text_main'   => [28,  24,  20],
            'text_dim'    => [90,  86,  78],
            'text_meta'   => [130, 126, 118],
            'tag_bg'      => [90,  130, 88, 45],
            'tag_text'    => [28,  24,  20],
        ],

        /**
         * Grid / Technical
         * Grammar: Fine grid overlay (very low opacity). Vertical column divider.
         * Horizontal zone rules. Optional small zone-label markers.
         * No circles. No arcs. Derives from grid, not decoration.
         */
        'grid_technical' => [
            'layout'      => 'grid_technical',
            'bg_default'  => '#111214',
            'accent'      => [0,   210, 180],
            'text_main'   => [232, 228, 218],
            'text_dim'    => [150, 146, 136],
            'text_meta'   => [100, 96,  86],
            'tag_bg'      => [0,   210, 180, 85],
            'tag_text'    => [10,  20,  18],
        ],

        /**
         * Bold Block
         * Grammar: Two large color fields (top accent 28% / bottom dark 72%).
         * One oversized disc at top-right, partially cropped by block boundary.
         * Header zone: class name + KEPADA/DARI + public ID (dark text on accent).
         * Zero small decorations in text zone.
         */
        'bold_block' => [
            'layout'      => 'bold_block',
            'bg_default'  => '#E84B2A',
            'accent'      => [232, 75,  42],
            'text_main'   => [250, 248, 240],
            'text_dim'    => [200, 196, 184],
            'text_meta'   => [155, 150, 138],
            'tag_bg'      => [255, 255, 255, 55],
            'tag_text'    => [250, 248, 240],
        ],
    ];

    // -------------------------------------------------------------------------
    // Utility
    // -------------------------------------------------------------------------

    private static function opacityToGdAlpha(float $opacity): int
    {
        return (int) round(127 * (1 - max(0.0, min(1.0, $opacity))));
    }

    private static function hexToRgb(string $hex): array
    {
        $hex = ltrim($hex, '#');
        if (strlen($hex) === 3) {
            $hex = $hex[0].$hex[0].$hex[1].$hex[1].$hex[2].$hex[2];
        }
        return [hexdec(substr($hex, 0, 2)), hexdec(substr($hex, 2, 2)), hexdec(substr($hex, 4, 2))];
    }

    private function fontPath(bool $bold = false): ?string
    {
        $name = $bold ? 'Poppins-Bold.ttf' : 'Poppins-Regular.ttf';
        $path = resource_path("fonts/{$name}");
        return file_exists($path) ? $path : null;
    }

    private function resolvePreset(array $design): array
    {
        $key = $design['preset'] ?? 'editorial_geometry';
        return self::PRESETS[$key] ?? self::PRESETS['editorial_geometry'];
    }

    /** Allocate a GD color. Pass 4-element array for alpha. */
    private function gdColor(\GdImage $c, array $rgb, int $alpha = 0): int
    {
        return $alpha > 0
            ? imagecolorallocatealpha($c, $rgb[0], $rgb[1], $rgb[2], $alpha)
            : imagecolorallocate($c, $rgb[0], $rgb[1], $rgb[2]);
    }

    /**
     * Draw a thick arc (ring segment) by stacking multiple single-pixel arcs.
     * $cx/$cy: center in pixels. $r: outer radius. $thickness: pixels.
     * $startDeg/$endDeg: GD convention (0=3 o'clock, CW).
     */
    private function thickArc(\GdImage $c, int $cx, int $cy, int $r, int $thickness, int $startDeg, int $endDeg, int $color): void
    {
        for ($t = 0; $t < $thickness; $t++) {
            $d = ($r - (int)($thickness / 2) + $t) * 2;
            if ($d <= 0) continue;
            imagearc($c, $cx, $cy, $d, $d, $startDeg, $endDeg, $color);
        }
    }

    private function formatSeconds(int $s): string
    {
        return sprintf('%d:%02d', intdiv($s, 60), $s % 60);
    }

    /**
     * Build the music display string for any preset.
     * When song_start_seconds present: ♫ {song} - {artist} (MM:SS)
     * Otherwise:                       ♫ {song} — {artist}
     */
    private function formatMusicLine(array $cfg): string
    {
        $song   = $cfg['song_text']   ?? $cfg['song']   ?? '';
        $artist = $cfg['artist_text'] ?? $cfg['artist'] ?? '';
        if (!$song && !$artist) return '';

        $secs = isset($cfg['song_start_seconds']) && $cfg['song_start_seconds'] !== null
            ? (int) $cfg['song_start_seconds']
            : null;

        if ($song && $artist) {
            $sep  = $secs !== null ? ' - ' : ' — ';
            $base = $song . $sep . $artist;
        } else {
            $base = $song ?: $artist;
        }

        return "\u{266B} " . $base . ($secs !== null ? ' (' . $this->formatSeconds($secs) . ')' : '');
    }

    /**
     * Format milliseconds to "MM:SS" or "H:MM:SS".
     */
    private function formatMusicTime(int $ms): string
    {
        $total   = intdiv(max(0, $ms), 1000);
        $hours   = intdiv($total, 3600);
        $minutes = intdiv($total % 3600, 60);
        $seconds = $total % 60;
        if ($hours > 0) return sprintf('%d:%02d:%02d', $hours, $minutes, $seconds);
        return sprintf('%02d:%02d', $minutes, $seconds);
    }

    /**
     * Format playback window: "MM:SS — MM:SS", "from MM:SS", or "".
     */
    private function formatMusicTimeRange(?int $startMs, ?int $durationMs): string
    {
        if ($startMs === null) return '';
        $start = $this->formatMusicTime($startMs);
        if ($durationMs === null) return $start;
        return $start . " \u{2014} " . $this->formatMusicTime($startMs + $durationMs);
    }

    /**
     * Normalise music data from a render config array.
     * Handles both structured (music_* fields) and legacy (song_text/song_start_seconds).
     */
    private function resolveMusicFromConfig(array $cfg): array
    {
        $song   = $cfg['song_text']   ?? $cfg['song']   ?? '';
        $artist = $cfg['artist_text'] ?? $cfg['artist'] ?? '';

        $hasStructured = !empty($cfg['music_track_id'])
            || isset($cfg['music_start_ms'])
            || !empty($cfg['music_artwork_url']);

        if (!$song && !$artist && !$hasStructured) {
            return ['has_music' => false];
        }

        $result = [
            'has_music'           => true,
            'song'                => $song,
            'artist'              => $artist,
            'start_ms'            => null,
            'duration_ms'         => null,
            'track_duration_ms'   => null,
            'artwork_url'         => null,
            'artwork_path'        => null,
            'provider'            => null,
            'attribution_text'    => null,
            'attribution_required'=> false,
        ];

        if ($hasStructured) {
            $result['start_ms']          = isset($cfg['music_start_ms'])           ? (int) $cfg['music_start_ms']           : null;
            $result['duration_ms']       = isset($cfg['music_duration_ms'])        ? (int) $cfg['music_duration_ms']        : null;
            $result['track_duration_ms'] = isset($cfg['music_track_duration_ms'])  ? (int) $cfg['music_track_duration_ms']  : null;
            $result['artwork_url']       = $cfg['music_artwork_url']  ?? null;
            $result['artwork_path']      = $cfg['music_artwork_path'] ?? null;
            $result['provider']          = $cfg['music_provider']     ?? null;
            $result['attribution_text']  = $cfg['music_attribution_text']     ?? null;
            $result['attribution_required'] = (bool) ($cfg['music_attribution_required'] ?? false);
        } elseif (isset($cfg['song_start_seconds']) && $cfg['song_start_seconds'] !== null) {
            $result['start_ms'] = (int) $cfg['song_start_seconds'] * 1000;
        }

        return $result;
    }

    /**
     * Load music artwork from local storage or remote URL (SSRF-safe).
     * Returns a square-cropped GdImage or null on any failure.
     */
    private function loadMusicArtwork(?string $artworkUrl, ?string $artworkPath, int $squarePx): ?\GdImage
    {
        if ($artworkPath) {
            try {
                $disk  = config('filesystems.default') === 'local' ? 'local' : 's3';
                $bytes = Storage::disk($disk)->get($artworkPath);
                $src   = @imagecreatefromstring($bytes);
                if ($src !== false) return $this->centerCropSquare($src, $squarePx);
            } catch (\Throwable) {}
        }
        if (!$artworkUrl) return null;
        $parsed = parse_url($artworkUrl);
        $scheme = strtolower($parsed['scheme'] ?? '');
        $host   = strtolower($parsed['host']   ?? '');
        if ($scheme !== 'https') return null;
        if (filter_var($host, FILTER_VALIDATE_IP)) {
            if (!filter_var($host, FILTER_VALIDATE_IP, FILTER_FLAG_NO_PRIV_RANGE | FILTER_FLAG_NO_RES_RANGE)) return null;
        }
        static $allowedApex    = ['audius.co', 'audius.prod', 'audius.foundation'];
        static $allowedPattern = '/\.audius\.(co|prod|foundation)$/';
        $parts = explode('.', $host);
        $apex  = count($parts) >= 2 ? implode('.', array_slice($parts, -2)) : $host;
        if (!in_array($apex, $allowedApex, true) && !preg_match($allowedPattern, $host)) return null;
        try {
            $ctx   = stream_context_create(['http' => ['timeout' => 5, 'max_redirects' => 2]]);
            $bytes = @file_get_contents($artworkUrl, false, $ctx, 0, 2 * 1024 * 1024);
            if ($bytes === false || strlen($bytes) === 0) return null;
            $src = @imagecreatefromstring($bytes);
            if ($src === false) return null;
            return $this->centerCropSquare($src, $squarePx);
        } catch (\Throwable) { return null; }
    }

    /**
     * Center-crop $src to a $size × $size square. Destroys source, returns new canvas.
     */
    private function centerCropSquare(\GdImage $src, int $size): \GdImage
    {
        $sw   = imagesx($src);
        $sh   = imagesy($src);
        $side = min($sw, $sh);
        $cx   = intdiv($sw - $side, 2);
        $cy   = intdiv($sh - $side, 2);
        $dst  = imagecreatetruecolor($size, $size);
        imagealphablending($dst, true);
        imagecopyresampled($dst, $src, 0, 0, $cx, $cy, $size, $size, $side, $side);
        imagedestroy($src);
        return $dst;
    }

    /**
     * Truncate $text with ellipsis to fit $maxW pixels at $ptSize. Falls back to raw text when no font.
     */
    private function truncateToWidth(string $text, ?string $font, float $ptSize, int $maxW): string
    {
        if (!$font) return $text;
        $bbox = imagettfbbox($ptSize, 0, $font, $text);
        if (abs($bbox[2] - $bbox[0]) <= $maxW) return $text;
        $t = $text;
        while (mb_strlen($t) > 0) {
            $t = mb_substr($t, 0, -1);
            $b = imagettfbbox($ptSize, 0, $font, $t . "\u{2026}");
            if (abs($b[2] - $b[0]) <= $maxW) return $t . "\u{2026}";
        }
        return "\u{2026}";
    }

    /**
     * Height reserved for old-style inline music block (kept for any callers that still reference it).
     * @deprecated use measureMusicCard() instead
     */
    private function measureMusicBlock(array $music, bool $isStory): int
    {
        if (!($music['has_music'] ?? false)) return 0;
        return ($isStory ? 90 : 72) + 20;
    }

    public function renderSlides(array &$config): array
    {
        $config['show_public_id'] = true;
        $parts = $this->splitMessage($config['message'] ?? '', $config);

        if (count($parts) === 1) {
            $config['message']     = $parts[0];
            $config['page']        = null;
            $config['total_pages'] = 1;
            return [$this->renderToPng($config)];
        }

        $slides = [];
        foreach ($parts as $i => $part) {
            $slide                = $config;
            $slide['message']     = $part;
            $slide['page']        = $i + 1;
            $slide['total_pages'] = count($parts);
            $slides[] = $this->renderToPng($slide);
        }
        return $slides;
    }

    private function splitMessage(string $message, array $config): array
    {
        $max = 900;
        if (mb_strlen($message) <= $max) return [$message];

        $mid   = (int) (mb_strlen($message) / 2);
        $space = mb_strpos($message, ' ', $mid);
        if ($space === false || $space > mb_strlen($message) - 1) $space = $mid;

        $p1 = mb_substr($message, 0, $space);
        $p2 = mb_substr($message, $space + 1);
        return mb_strlen(trim($p2)) === 0 ? [$message] : [trim($p1), trim($p2)];
    }

    public function render(array $config): \GdImage
    {
        $config['show_public_id'] = true;

        $format = DesignFormat::from($config['format'] ?? 'story');
        $dim    = $format->dimensions();
        $w      = $dim['width'];
        $h      = $dim['height'];

        $canvas = imagecreatetruecolor($w, $h);
        imagealphablending($canvas, true);
        imagesavealpha($canvas, true);

        $design = $config['design'] ?? [];
        $preset = $this->resolvePreset($design);

        // Layer 1: background
        $this->drawBackground($canvas, $w, $h, $config, $preset);

        // Layer 2: pattern overlay (very low opacity — secondary texture)
        if (!empty($design['pattern_key'])) {
            $this->drawPattern($canvas, $w, $h, $design);
        }

        // Layer 3+: preset layout (decorations + text)
        // bold_block takes $config by ref to set _skip_pill flag
        $warnings = [];
        if ($preset['layout'] === 'bold_block') {
            $this->layoutBoldBlock($canvas, $w, $h, $config, $preset, $warnings);
        } else {
            match ($preset['layout']) {
                'editorial_geometry' => $this->layoutEditorialGeometry($canvas, $w, $h, $config, $preset, $warnings),
                'typographic_poster' => $this->layoutTypographicPoster($canvas, $w, $h, $config, $preset, $warnings),
                'quiet_editorial'    => $this->layoutQuietEditorial($canvas, $w, $h, $config, $preset, $warnings),
                'grid_technical'     => $this->layoutGridTechnical($canvas, $w, $h, $config, $preset, $warnings),
                default              => $this->layoutEditorialGeometry($canvas, $w, $h, $config, $preset, $warnings),
            };
        }

        // Public ID is now drawn inline by each preset (header top-right, no pill)
        // drawPublicIdPill kept in file for backward compat but no longer called here

        if (!empty($config['page']) && !empty($config['total_pages']) && $config['total_pages'] > 1) {
            $this->drawPageIndicator($canvas, $w, $h, (int) $config['page'], (int) $config['total_pages']);
        }

        if (!empty($warnings)) $config['_render_warnings'] = $warnings;

        return $canvas;
    }

    public function renderToPng(array &$config): string
    {
        $config['show_public_id'] = true;
        $img  = $this->render($config);
        ob_start();
        imagepng($img);
        $data = ob_get_clean();
        imagedestroy($img);
        return $data;
    }

    public function renderPreview(array &$config): string
    {
        $img    = $this->render($config);
        $format = DesignFormat::from($config['format'] ?? 'story');
        $dim    = $format->dimensions();
        $pw     = 540;
        $ph     = (int) round($pw * $dim['height'] / $dim['width']);
        $prev   = imagescale($img, $pw, $ph, IMG_BICUBIC);
        imagedestroy($img);
        ob_start();
        imagepng($prev);
        $data = ob_get_clean();
        imagedestroy($prev);
        return $data;
    }

    // -------------------------------------------------------------------------
    // Background
    // -------------------------------------------------------------------------

    private function drawBackground(\GdImage $canvas, int $w, int $h, array $config, array $preset): void
    {
        $design = $config['design'] ?? [];

        if (($design['source'] ?? 'builtin') === 'custom' && !empty($design['class_design_id'])) {
            $this->drawCustomBackground($canvas, $w, $h, $design);
            return;
        }

        $hex = $design['background_color'] ?? $preset['bg_default'];
        [$r, $g, $b] = self::hexToRgb($hex);
        imagefilledrectangle($canvas, 0, 0, $w - 1, $h - 1, imagecolorallocate($canvas, $r, $g, $b));
    }

    private function drawCustomBackground(\GdImage $canvas, int $w, int $h, array $design): void
    {
        $classDesign = ClassDesign::find($design['class_design_id']);
        if (!$classDesign) {
            imagefilledrectangle($canvas, 0, 0, $w - 1, $h - 1, imagecolorallocate($canvas, 30, 30, 30));
            return;
        }

        $format = DesignFormat::from($design['format'] ?? 'story');
        if ($format === DesignFormat::FeedPortrait && $classDesign->format === DesignFormat::Story && $classDesign->feed_fallback_crop) {
            $crop = $classDesign->feed_fallback_crop;
        } else {
            $crop = [
                'x'      => $classDesign->crop_x ?? 0,
                'y'      => $classDesign->crop_y ?? 0,
                'width'  => $classDesign->crop_width ?? $classDesign->source_width,
                'height' => $classDesign->crop_height ?? $classDesign->source_height,
            ];
        }

        try {
            $disk  = config('filesystems.default') === 'local' ? 'local' : 's3';
            $bytes = Storage::disk($disk)->get($classDesign->source_asset_key);
            $src   = imagecreatefromstring($bytes);
            if ($src === false) throw new \RuntimeException('Cannot decode image');
            $cropped = imagecreatetruecolor((int) $crop['width'], (int) $crop['height']);
            imagecopy($cropped, $src, 0, 0, (int) $crop['x'], (int) $crop['y'], (int) $crop['width'], (int) $crop['height']);
            imagedestroy($src);
            imagecopyresampled($canvas, $cropped, 0, 0, 0, 0, $w, $h, (int) $crop['width'], (int) $crop['height']);
            imagedestroy($cropped);
        } catch (\Throwable) {
            imagefilledrectangle($canvas, 0, 0, $w - 1, $h - 1, imagecolorallocate($canvas, 30, 30, 30));
        }
    }

    // -------------------------------------------------------------------------
    // Shared layout helpers
    // -------------------------------------------------------------------------

    /**
     * Estimate text block height for adaptive vertical centering.
     * Uses font measurement when available; falls back to char-count heuristic.
     * ponytail: heuristic falls back to 1.5× line height estimate; upgrade path
     * is to call wrapText directly (only valid when font is available).
     */
    private function estimateTextHeight(string $text, int $maxW, int $minSize, int $maxSize): int
    {
        $font = $this->fontPath(false);
        if (!$font) {
            $charsPerLine = max(1, (int) ($maxW / 8));
            $lines        = max(1, (int) ceil(mb_strlen($text) / $charsPerLine));
            return $lines * (int) ($maxSize * 0.75 * 1.5);
        }

        for ($size = $maxSize; $size >= $minSize; $size--) {
            $lines = $this->wrapText($text, $font, $size * 0.75, $maxW);
            $h     = count($lines) * (int) ($size * 0.75 * 1.5);
            if ($h <= (int) ($maxSize * 0.75 * 1.5 * 20)) { // sanity cap: 20 lines
                return $h;
            }
        }
        return (int) ($minSize * 0.75 * 1.5);
    }

    /**
     * Draw a prominent recipient block: label row (small, meta color) + value row (large, main color).
     * Returns bottom Y after the block.
     *
     * Hierarchy: recipient is information, not decoration.
     * Default: label 16–18pt (meta). Value 26–36pt (main/dim).
     * Callers may override label/value sizes for preset-specific sizing.
     */
    private function drawRecipientBlock(
        \GdImage $c,
        string $label,
        string $value,
        int $x, int $y, int $maxW,
        int $labelColor, int $valueColor,
        int $labelMin = 16, int $labelMax = 18,
        int $valMin = 26, int $valMax = 36
    ): int {
        $y = $this->drawText($c, $label, $x, $y, $maxW, $labelMin, $labelMax, $labelColor, true) + 2;
        $y = $this->drawText($c, $value, $x, $y, $maxW, $valMin, $valMax, $valueColor, false) + 6;
        return $y;
    }

    /**
     * Compute footer element Y positions, anchored from the bottom of the canvas.
     *
     * Returns:
     *   website_y    — baseline Y for website/handle label
     *   tags_y       — top Y for category pill row (0 if no tags)
     *   music_y      — top Y passed to drawMusicCard (0 if no music)
     *   zone_top     — hard ceiling: message must not exceed this Y
     *
     * Layout (bottom-up):
     *   $h - $pad
     *   └─ website label          (~28px)
     *   └─ tags row (if any)      (~44px)
     *   └─ gap                    (12px)
     *   └─ zone_top  ← message ceiling
     *
     *   Music card sits at the right side of the zone, vertically centered
     *   between zone_top and $h - $pad.
     */
    private function computeFooter(int $h, bool $hasTags, bool $hasMusic, bool $isStory): array
    {
        $pad        = (int) ($h * 0.022);   // ~42px on story
        $websiteH   = 30;
        $tagsH      = $hasTags  ? 44 : 0;
        $musicCardH = $hasMusic ? ($isStory ? 108 : 60) : 0;

        $websiteY  = $h - $pad - $websiteH;
        $tagsY     = $hasTags  ? ($websiteY - $tagsH - 6) : 0;
        $leftTop   = $hasTags  ? $tagsY : $websiteY;

        // Music card anchored so its bottom sits at $h - $pad
        $musicY    = $hasMusic ? ($h - $pad - $musicCardH) : 0;

        // Zone top = topmost footer element minus gap
        $zoneTop   = min($leftTop, ($hasMusic ? $musicY : $h)) - 12;

        return [
            'website_y' => $websiteY,
            'tags_y'    => $tagsY,
            'music_y'   => $musicY,
            'zone_top'  => $zoneTop,
        ];
    }

    /**
     * Draw website/handle label at an explicit Y position (not fraction-based).
     */
    private function drawWebsiteLabelAt(\GdImage $c, int $w, array $cfg, int $metaClr, int $x, int $y): void
    {
        if (!($cfg['show_website_url'] ?? true)) return;
        $website = $cfg['class']['website_label'] ?? null;
        $handle  = $cfg['class']['instagram_handle'] ?? null;
        $label   = trim(($handle ? $handle . '  ' : '') . ($website ?? ''));
        if (!$label) return;
        $maxW = (int) ($w * 0.55);  // left half only — right side reserved for music
        $this->drawText($c, $label, $x, $y, $maxW, 20, 24, $metaClr, false);
    }

    /**
     * Format: "#MF-XXXX". $rightEdge = right boundary (usually $w - $margin).
     * $headerBaselineY = Y where the header text baseline should sit.
     */
    private function drawPublicIdHeader(\GdImage $c, int $rightEdge, int $headerBaselineY, string $publicId, int $color, int $ptSize = 26): void
    {
        $font  = $this->fontPath(false);
        $label = '#' . $publicId;
        if ($font) {
            $bbox = imagettfbbox($ptSize * 0.75, 0, $font, $label);
            $tw   = abs($bbox[2] - $bbox[0]);
            $th   = abs($bbox[7] - $bbox[1]);
            imagettftext($c, $ptSize * 0.75, 0, $rightEdge - $tw, $headerBaselineY, $color, $font, $label);
        } else {
            imagestring($c, 4, $rightEdge - strlen($label) * 9, $headerBaselineY - 14, $label, $color);
        }
    }

    /**
     * Height reserved for the music card including top gap, or 0 if no music.
     * Story: 100px card + 16px gap = 116. Feed: 56px block + 12px gap = 68.
     */
    private function measureMusicCard(bool $isStory, bool $hasMusic): int
    {
        if (!$hasMusic) return 0;
        return $isStory ? 116 : 68;
    }

    /**
     * Draw music card bottom-right corner.
     *
     * Story: semi-transparent rounded card, artwork left, title/artist/time right.
     * Feed:  compact two-line block (artwork + text), no card background.
     *
     * $footerTextY: Y where footer text (tags/website) begins — card stays above.
     *
     * $cardStyle keys (all GD color ints unless noted):
     *   bg_rgba          array [r,g,b,gdAlpha]  card background (story only)
     *   placeholder_rgba array [r,g,b,gdAlpha]  artwork placeholder fill
     *   text_main        GD color int
     *   text_dim         GD color int
     *   text_meta        GD color int
     *   accent           GD color int
     */
    private function drawMusicCard(\GdImage $c, array $music, int $w, int $margin, int $cardTopY, array $cardStyle, bool $isStory): void
    {
        if (!($music['has_music'] ?? false)) return;

        $font  = $this->fontPath(false);
        $fontB = $this->fontPath(true) ?? $font;

        if ($isStory) {
            $artSize  = 72;
            $cardW    = 380;
            $cardH    = 100;
            $cardPad  = 12;
            $cardX    = $w - $margin - $cardW;
            $cardY    = $cardTopY + 8;   // card starts inside footer zone

            // Card background — semi-transparent rounded rect
            [$br, $bg, $bb, $ba] = $cardStyle['bg_rgba'];
            $bgCol = imagecolorallocatealpha($c, $br, $bg, $bb, $ba);
            $this->filledRoundedRect($c, $cardX, $cardY, $cardX + $cardW, $cardY + $cardH, 16, $bgCol);

            // Artwork
            $artX    = $cardX + $cardPad;
            $artY    = $cardY + (int)(($cardH - $artSize) / 2);
            $artwork = $this->loadMusicArtwork($music['artwork_url'] ?? null, $music['artwork_path'] ?? null, $artSize);
            if ($artwork) {
                imagecopy($c, $artwork, $artX, $artY, 0, 0, $artSize, $artSize);
                imagedestroy($artwork);
            } else {
                [$pr, $pg, $pb, $pa] = $cardStyle['placeholder_rgba'];
                $pbg = imagecolorallocatealpha($c, $pr, $pg, $pb, $pa);
                imagefilledrectangle($c, $artX, $artY, $artX + $artSize - 1, $artY + $artSize - 1, $pbg);
                if ($font) {
                    $glyph = "\u{266B}";
                    $gpt   = $artSize * 0.75 * 0.36;
                    $gb    = imagettfbbox($gpt, 0, $font, $glyph);
                    $gw    = abs($gb[2] - $gb[0]);
                    $gh    = abs($gb[7] - $gb[1]);
                    imagettftext($c, $gpt, 0, $artX + intdiv($artSize - $gw, 2), $artY + intdiv($artSize + $gh, 2), $cardStyle['accent'], $font, $glyph);
                }
            }

            // Text: right of artwork
            $textX    = $artX + $artSize + 10;
            $textMaxW = $cardX + $cardW - $textX - $cardPad;
            $textY    = $cardY + $cardPad + 2;

            $titlePt  = 20;
            $artistPt = 16;
            $timePt   = 13;

            if (!empty($music['song']) && $fontB) {
                $title = $this->truncateToWidth($music['song'], $fontB, $titlePt * 0.75, $textMaxW);
                $bb2   = imagettfbbox($titlePt * 0.75, 0, $fontB, $title);
                $th    = abs($bb2[7] - $bb2[1]);
                imagettftext($c, $titlePt * 0.75, 0, $textX, $textY + $th, $cardStyle['text_main'], $fontB, $title);
                $textY += $th + 5;
            }
            if (!empty($music['artist']) && $font) {
                $artist = $this->truncateToWidth($music['artist'], $font, $artistPt * 0.75, $textMaxW);
                $bb2    = imagettfbbox($artistPt * 0.75, 0, $font, $artist);
                $th     = abs($bb2[7] - $bb2[1]);
                imagettftext($c, $artistPt * 0.75, 0, $textX, $textY + $th, $cardStyle['text_dim'], $font, $artist);
                $textY += $th + 5;
            }
            $timeRange = $this->formatMusicTimeRange($music['start_ms'] ?? null, $music['duration_ms'] ?? null);
            if ($timeRange && $font) {
                $bb2 = imagettfbbox($timePt * 0.75, 0, $font, $timeRange);
                $th  = abs($bb2[7] - $bb2[1]);
                imagettftext($c, $timePt * 0.75, 0, $textX, $textY + $th, $cardStyle['text_meta'], $font, $timeRange);
            }

        } else {
            // Feed: compact block, no card background
            $artSize  = 44;
            $blockW   = 300;
            $blockH   = 52;
            $blockX   = $w - $margin - $blockW;
            $blockY   = $cardTopY + 6;   // starts inside footer zone

            $artwork = $this->loadMusicArtwork($music['artwork_url'] ?? null, $music['artwork_path'] ?? null, $artSize);
            $artTopY = $blockY + (int)(($blockH - $artSize) / 2);
            if ($artwork) {
                imagecopy($c, $artwork, $blockX, $artTopY, 0, 0, $artSize, $artSize);
                imagedestroy($artwork);
            } else {
                [$pr, $pg, $pb, $pa] = $cardStyle['placeholder_rgba'];
                $pbg = imagecolorallocatealpha($c, $pr, $pg, $pb, $pa);
                imagefilledrectangle($c, $blockX, $artTopY, $blockX + $artSize - 1, $artTopY + $artSize - 1, $pbg);
            }

            $textX    = $blockX + $artSize + 8;
            $textMaxW = $w - $margin - $textX;
            $textY    = $blockY + 4;
            $titlePt  = 17;
            $artistPt = 13;

            if (!empty($music['song']) && $fontB) {
                $title = $this->truncateToWidth($music['song'], $fontB, $titlePt * 0.75, $textMaxW);
                $bb2   = imagettfbbox($titlePt * 0.75, 0, $fontB, $title);
                $th    = abs($bb2[7] - $bb2[1]);
                imagettftext($c, $titlePt * 0.75, 0, $textX, $textY + $th, $cardStyle['text_main'], $fontB, $title);
                $textY += $th + 4;
            }
            $timeRange  = $this->formatMusicTimeRange($music['start_ms'] ?? null, $music['duration_ms'] ?? null);
            $artistLine = ($music['artist'] ?? '');
            if ($timeRange) $artistLine .= ($artistLine ? '  ' : '') . $timeRange;
            if ($artistLine && $font) {
                $artistLine = $this->truncateToWidth($artistLine, $font, $artistPt * 0.75, $textMaxW);
                $bb2 = imagettfbbox($artistPt * 0.75, 0, $font, $artistLine);
                $th  = abs($bb2[7] - $bb2[1]);
                imagettftext($c, $artistPt * 0.75, 0, $textX, $textY + $th, $cardStyle['text_meta'], $font, $artistLine);
            }
        }
    }

    // -------------------------------------------------------------------------
    // Layout: Editorial Geometry
    //
    // Visual grammar:
    //   - 2 large partial rings bleeding off canvas.
    //   - Tonal content zone h*0.22–h*0.90.
    //   - Public ID: top-right header, accent color, no pill.
    //   - KEPADA/DARI starts at h*0.26.
    //   - Message below recipient, capped above music card safe area.
    //   - Music card: bottom-right corner.
    //   - Footer: tags + website left.
    // -------------------------------------------------------------------------

    private function layoutEditorialGeometry(\GdImage $c, int $w, int $h, array $cfg, array $p, array &$warnings): void
    {
        $margin    = (int) ($w * 0.074);
        $contentW  = $w - $margin * 2;
        $ringThick = max(8, (int) ($w * 0.018));

        $accentFull  = $this->gdColor($c, $p['accent']);
        $accentDim   = $this->gdColor($c, $p['accent'], 55);
        $accentFaint = $this->gdColor($c, $p['accent'], 102);
        $dimClr      = $this->gdColor($c, $p['text_dim']);
        $metaClr     = $this->gdColor($c, $p['text_meta']);
        $mainClr     = $this->gdColor($c, $p['text_main']);

        $target  = $cfg['target_text'] ?? $cfg['target'] ?? '';
        $alias   = $cfg['alias_text']  ?? $cfg['alias']  ?? '';
        $tags    = $cfg['tags'] ?? [];
        $music   = $this->resolveMusicFromConfig($cfg);
        $isStory = ($cfg['format'] ?? 'story') === 'story';

        // ── 4 rings ──────────────────────────────────────────────────────────
        $this->thickArc($c, (int)($w*0.88), (int)($h*-0.06), (int)($w*0.46), $ringThick, 125, 230, $accentFull);
        $this->thickArc($c, (int)($w*0.96), (int)($h*0.05), (int)($w*0.28), (int)($ringThick*0.6), 150, 240, $accentDim);
        $hasRecipient = (bool) $target;
        $r2cy = (int) ($h * ($hasRecipient ? 0.68 : 0.72));
        $this->thickArc($c, (int)($w*-0.06), $r2cy, (int)($w*0.26), (int)($ringThick*0.85), 310, 60, $accentDim);
        $this->thickArc($c, (int)($w*1.04), (int)($h*0.88), (int)($w*0.20), (int)($ringThick*0.55), 170, 260, $accentFaint);

        // ── Tonal zone — header shortened to h*0.17 ──────────────────────────
        $zoneTop = (int) ($h * 0.17);
        $zoneBtm = (int) ($h * 0.90);
        imagefilledrectangle($c, 0, $zoneTop, $w, $zoneBtm, imagecolorallocatealpha($c, 255, 255, 255, 118));

        // ── Header: class name left, #ID right ───────────────────────────────
        $headerY = (int) ($h * 0.068);
        if ($cfg['class']['name'] ?? '') {
            $this->drawText($c, mb_strtoupper($cfg['class']['name']), $margin, $headerY, (int)($contentW * 0.62), 28, 44, $accentFull, true);
        }
        $pubId = $cfg['public_id'] ?? '???';
        $font  = $this->fontPath(false);
        $idPt  = 24;
        $idBl  = $headerY + ($font ? abs(imagettfbbox($idPt*0.75,0,$font,'#'.$pubId)[7] - imagettfbbox($idPt*0.75,0,$font,'#'.$pubId)[1]) : 16);
        $this->drawPublicIdHeader($c, $w - $margin, $idBl, $pubId, $accentFull, $idPt);

        // ── Footer anchored from bottom ────────────────────────────────────────
        $footer = $this->computeFooter($h, !empty($tags), $music['has_music'], $isStory);

        // ── KEPADA/DARI starts at h*0.22 ─────────────────────────────────────
        $curY = (int) ($h * 0.22);
        if ($target) {
            $curY = $this->drawRecipientBlock($c, 'KEPADA', $target, $margin, $curY, $contentW, $metaClr, $dimClr) + 4;
        }
        if ($alias) {
            $curY = $this->drawRecipientBlock($c, 'DARI', $alias, $margin, $curY, $contentW, $metaClr, $dimClr) + 8;
        }

        // ── Message — full width, capped above footer zone ───────────────────
        $msgMaxH = $footer['zone_top'] - $curY - 8;
        if ($cfg['message'] ?? '') {
            $result = $this->drawTextAutoSize($c, $cfg['message'], $margin, $curY, $contentW, max(60, $msgMaxH), 28, 68, $mainClr, false);
            if ($result['overflow']) $warnings[] = 'message_overflow';
        }

        // ── Footer: tags + website left (bottom-anchored), music card right ────
        if (!empty($tags)) {
            $this->drawCategoryRow($c, $tags, $margin, $footer['tags_y'], (int)($contentW * 0.55), $p);
        }
        $this->drawWebsiteLabelAt($c, $w, $cfg, $metaClr, $margin, $footer['website_y']);

        if ($music['has_music']) {
            $this->drawMusicCard($c, $music, $w, $margin, $footer['music_y'], [
                'bg_rgba'          => [15, 20, 35, 45],
                'placeholder_rgba' => [88, 120, 255, 70],
                'text_main'        => $mainClr,
                'text_dim'         => $dimClr,
                'text_meta'        => $metaClr,
                'accent'           => $accentFull,
            ], $isStory);
        }
    }

    // -------------------------------------------------------------------------
    // Layout: Typographic Poster
    //
    // Visual grammar:
    //   - ZERO decorative geometry. One rule. Typography owns the canvas.
    //   - Recipient rendered as a structured block ABOVE message.
    //   - Message: Regular weight, left-aligned, word-justified (except last line).
    //   - Footer: music + categories only.
    // -------------------------------------------------------------------------

    private function layoutTypographicPoster(\GdImage $c, int $w, int $h, array $cfg, array $p, array &$warnings): void
    {
        $margin   = (int) ($w * 0.09);
        $contentW = $w - $margin * 2;
        // V3: Regular weight — typography is the design; Bold was fighting the composition
        $fontReg  = $this->fontPath(false);
        $mainClr  = $this->gdColor($c, $p['text_main']);
        $dimClr   = $this->gdColor($c, $p['text_dim']);
        $metaClr  = $this->gdColor($c, $p['text_meta']);

        $target = $cfg['target_text'] ?? $cfg['target'] ?? '';
        $alias  = $cfg['alias_text']  ?? $cfg['alias']  ?? '';
        $tags   = $cfg['tags'] ?? [];

        // ── Class name header ─────────────────────────────────────────────
        $headerY = (int) ($h * 0.068);
        if ($cfg['class']['name'] ?? '') {
            $this->drawText($c, mb_strtoupper($cfg['class']['name']), $margin, $headerY, (int)($contentW * 0.62), 18, 22, $dimClr, false);
        }
        $pubId   = $cfg['public_id'] ?? '???';
        $idPt    = 22;
        $idBl    = $headerY + ($fontReg ? abs(imagettfbbox($idPt*0.75,0,$fontReg,'#'.$pubId)[7] - imagettfbbox($idPt*0.75,0,$fontReg,'#'.$pubId)[1]) : 16);
        $accentClr = $this->gdColor($c, $p['accent']);
        $this->drawPublicIdHeader($c, $w - $margin, $idBl, $pubId, $accentClr, $idPt);
        $music   = $this->resolveMusicFromConfig($cfg);
        $isStory = ($cfg['format'] ?? 'story') === 'story';
        imageline($c, $margin, (int)($h*0.098), $w - $margin, (int)($h*0.098), $this->gdColor($c, $p['accent'], 80));

        // ── Recipient block (before message, not in footer) ───────────────
        $contentTop = (int) ($h * 0.112);
        $curY       = $contentTop;
        $recipientW = (int)($contentW * 0.60);
        if ($target) {
            $curY = $this->drawRecipientBlock($c, 'KEPADA', $target, $margin, $curY, $recipientW, $metaClr, $dimClr) + 6;
        }
        if ($alias) {
            $curY = $this->drawRecipientBlock($c, 'DARI', $alias, $margin, $curY, $recipientW, $metaClr, $dimClr) + 6;
        }
        if ($target || $alias) {
            imageline($c, $margin, $curY, (int)($margin + $contentW * 0.2), $curY, $this->gdColor($c, $p['accent'], 90));
            $curY += 16;
        }

        // ── Tags: vertical stack in right column of recipient area ─────────
        if (!empty($tags)) {
            $tagColX   = $w - $margin - (int)($contentW * 0.36);
            $tagColW   = (int)($contentW * 0.36);
            $tagFont   = $this->fontPath(false);
            $tagSize   = 17;
            $tagY      = $contentTop + 4;
            [$tbr, $tbg, $tbb] = $p['tag_bg'];
            $tba     = $p['tag_bg'][3] ?? 35;
            $tagBg   = imagecolorallocatealpha($c, $tbr, $tbg, $tbb, $tba);
            $tagTxt  = $this->gdColor($c, $p['tag_text']);
            foreach (array_slice($tags, 0, 3) as $tagName) {
                $label = mb_strtoupper($tagName);
                if ($tagFont) {
                    $bbox  = imagettfbbox($tagSize * 0.75, 0, $tagFont, $label);
                    $tw    = abs($bbox[2] - $bbox[0]);
                    $th    = abs($bbox[7] - $bbox[1]);
                } else { $tw = strlen($label) * 8; $th = 12; }
                $pillW = $tw + 18; $pillH = $th + 12;
                // Right-align each pill
                $pillX = $w - $margin - $pillW;
                $this->filledRoundedRect($c, $pillX, $tagY, $pillX + $pillW, $tagY + $pillH, 8, $tagBg);
                if ($tagFont) {
                    imagettftext($c, $tagSize * 0.75, 0, $pillX + 9, $tagY + $pillH - (int)(($pillH - $th) / 2), $tagTxt, $tagFont, $label);
                } else {
                    imagestring($c, 3, $pillX + 9, $tagY + 6, $label, $tagTxt);
                }
                $tagY += $pillH + 6;
            }
        }

        // ── Footer zone: tags + website left, music card right ───────────
        $footer     = $this->computeFooter($h, false, $music['has_music'], $isStory);
        $msgZoneTop = $curY;
        $msgZoneH   = $footer['zone_top'] - $msgZoneTop;
        $message       = $cfg['message'] ?? '';

        if ($message && $fontReg) {
            $bestSize = 28;
            for ($size = 82; $size >= 28; $size -= 2) {
                $lines = $this->wrapText($message, $fontReg, $size * 0.75, $contentW);
                if (count($lines) * (int)($size * 0.75 * 1.42) <= $msgZoneH) { $bestSize = $size; break; }
            }
            $lines   = $this->wrapText($message, $fontReg, $bestSize * 0.75, $contentW);
            $lineH   = (int) ($bestSize * 0.75 * 1.42);
            $totalH  = count($lines) * $lineH;
            $startY  = $msgZoneTop + (int) max(0, ($msgZoneH - $totalH) / 2);
            $curMsgY = $startY;
            $lastIdx = count($lines) - 1;

            foreach ($lines as $idx => $line) {
                if ($curMsgY + $lineH > $msgZoneTop + $msgZoneH) { $warnings[] = 'message_overflow'; break; }
                $gapW = 0;
                $words = preg_split('/\s+/', trim($line), -1, PREG_SPLIT_NO_EMPTY);
                $wordWidths = [];
                $bbox = imagettfbbox($bestSize * 0.75, 0, $fontReg, $line);
                $th   = abs($bbox[7] - $bbox[1]);
                if ($idx !== $lastIdx && count($words) > 1) {
                    $totalWordW = 0;
                    foreach ($words as $word) {
                        $wb = imagettfbbox($bestSize * 0.75, 0, $fontReg, $word);
                        $ww = abs($wb[2] - $wb[0]);
                        $wordWidths[] = $ww;
                        $totalWordW  += $ww;
                    }
                    $gaps     = count($words) - 1;
                    $gapW     = ($contentW - $totalWordW) / $gaps;
                    $avgWordW = $totalWordW / count($words);
                    if ($gapW > $avgWordW * 0.25) $gapW = 0;
                }
                if ($gapW <= 0 || $idx === $lastIdx || count($words) <= 1) {
                    imagettftext($c, $bestSize * 0.75, 0, $margin, $curMsgY + $th, $mainClr, $fontReg, $line);
                } else {
                    $wx = (float) $margin;
                    foreach ($words as $wi => $word) {
                        $wb  = imagettfbbox($bestSize * 0.75, 0, $fontReg, $word);
                        $wth = abs($wb[7] - $wb[1]);
                        imagettftext($c, $bestSize * 0.75, 0, (int) $wx, $curMsgY + $wth, $mainClr, $fontReg, $word);
                        $wx += $wordWidths[$wi] + $gapW;
                    }
                }
                $curMsgY += $lineH;
            }
            if ($totalH > $msgZoneH) $warnings[] = 'message_overflow';
        } elseif ($message) {
            $result = $this->drawTextAutoSize($c, $message, $margin, $msgZoneTop, $contentW, $msgZoneH, 28, 82, $mainClr, false);
            if ($result['overflow']) $warnings[] = 'message_overflow';
        }

        // ── Footer: website left (bottom-anchored), music card right ──────
        $this->drawWebsiteLabelAt($c, $w, $cfg, $metaClr, $margin, $footer['website_y']);

        if ($music['has_music']) {
            $this->drawMusicCard($c, $music, $w, $margin, $footer['music_y'], [
                'bg_rgba'          => [10, 10, 10, 50],
                'placeholder_rgba' => [200, 240, 80, 80],
                'text_main'        => $mainClr,
                'text_dim'         => $dimClr,
                'text_meta'        => $metaClr,
                'accent'           => $accentClr,
            ], $isStory);
        }
    }

    // -------------------------------------------------------------------------
    // Layout: Quiet Editorial
    //
    // Visual grammar:
    //   - Single left vertical bar. One short horizontal rule.
    //   - Recipient: drawRecipientBlock after rule — prominent, not inline.
    //   - Message: adaptive size, left-aligned.
    //   - Negative space is intentional but content is vertically composed.
    // -------------------------------------------------------------------------

    private function layoutQuietEditorial(\GdImage $c, int $w, int $h, array $cfg, array $p, array &$warnings): void
    {
        $barX     = (int) ($w * 0.072);
        $barW     = max(3, (int) ($w * 0.011));
        $margin   = $barX + $barW + (int) ($w * 0.04);
        $contentW = $w - $margin - (int) ($w * 0.074);

        $mainClr  = $this->gdColor($c, $p['text_main']);
        $dimClr   = $this->gdColor($c, $p['text_dim']);
        $metaClr  = $this->gdColor($c, $p['text_meta']);
        $accentC  = $this->gdColor($c, $p['accent']);
        $barColor = $this->gdColor($c, $p['accent'], 35);

        // ── Left vertical bar ─────────────────────────────────────────────
        imagefilledrectangle($c, $barX, (int)($h*0.08), $barX + $barW - 1, (int)($h*0.92), $barColor);

        // ── Class name left, #ID right ────────────────────────────────────
        $curY = (int) ($h * 0.085);
        $font = $this->fontPath(false);
        if ($cfg['class']['name'] ?? '') {
            $this->drawText($c, mb_strtoupper($cfg['class']['name']), $margin, $curY, (int)($contentW * 0.62), 20, 28, $dimClr, false);
        }
        // ID: dark text on cream background — near-black, readable
        $pubId  = $cfg['public_id'] ?? '???';
        $idPt   = 22;
        $idColor = imagecolorallocate($c, 28, 24, 20); // near-black, same as text_main
        $idBl   = $curY + ($font ? abs(imagettfbbox($idPt*0.75,0,$font,'#'.$pubId)[7] - imagettfbbox($idPt*0.75,0,$font,'#'.$pubId)[1]) : 16);
        $this->drawPublicIdHeader($c, $w - (int)($w * 0.074), $idBl, $pubId, $idColor, $idPt);
        // Advance curY past class name line
        $curY = $idBl + 6;

        $target = $cfg['target_text'] ?? $cfg['target'] ?? '';
        $alias  = $cfg['alias_text']  ?? $cfg['alias']  ?? '';
        $tags   = $cfg['tags'] ?? [];

        // ── Recipient block ────────────────────────────────────────────────
        if ($target) {
            $curY = $this->drawRecipientBlock($c, 'KEPADA', $target, $margin, $curY, $contentW, $metaClr, $mainClr, 18, 18, 30, 40) + 8;
        }
        if ($alias) {
            $curY = $this->drawRecipientBlock($c, 'DARI', $alias, $margin, $curY, $contentW, $metaClr, $dimClr, 18, 18, 30, 40) + 14;
        }

        // ── Footer zone: measured ─────────────────────────────────────────
        $music   = $this->resolveMusicFromConfig($cfg);
        $isStory = ($cfg['format'] ?? 'story') === 'story';
        $footer  = $this->computeFooter($h, !empty($tags), $music['has_music'], $isStory);

        // ── Message ───────────────────────────────────────────────────────
        $message  = $cfg['message'] ?? '';
        $msgMaxPt = mb_strlen($message) < 80 ? 72 : 60;
        $msgMaxH  = $footer['zone_top'] - $curY - 8;

        if ($message) {
            $result = $this->drawTextAutoSize($c, $message, $margin, $curY, $contentW, max(60, $msgMaxH), 28, $msgMaxPt, $mainClr, false);
            if ($result['overflow']) $warnings[] = 'message_overflow';
            $curY = $result['y'] + 16;
        }

        // ── Footer: bottom-anchored rule → tags → website left, music right ──
        $ruleY = $footer['tags_y'] > 0 ? ($footer['tags_y'] - 12) : ($footer['website_y'] - 12);
        imageline($c, $margin, $ruleY, (int)($margin + $w * 0.08), $ruleY, $accentC);
        if (!empty($tags)) {
            $this->drawCategoryRow($c, $tags, $margin, $footer['tags_y'], (int)($contentW * 0.55), $p);
        }
        $this->drawWebsiteLabelAt($c, $w, $cfg, $metaClr, $margin, $footer['website_y']);

        // Music card right — light bg preset, use DARK card so text is readable on cream
        if ($music['has_music']) {
            $this->drawMusicCard($c, $music, $w, (int)($w * 0.074), $footer['music_y'], [
                'bg_rgba'          => [28, 24, 20, 18],   // dark card, more opaque on light bg
                'placeholder_rgba' => [90, 130, 88, 60],
                'text_main'        => imagecolorallocate($c, 28, 24, 20),   // near-black
                'text_dim'         => imagecolorallocate($c, 80, 76, 68),
                'text_meta'        => imagecolorallocate($c, 130, 126, 118),
                'accent'           => $accentC,
            ], $isStory);
        }
    }

    // -------------------------------------------------------------------------
    // Layout: Grid / Technical
    //
    // Visual grammar:
    //   - Fine grid overlay (very low opacity).
    //   - Vertical column divider at w*0.65.
    //   - Left column: message. Right column: structured metadata.
    //   - KEPADA/DARI value font bumped to 24pt for legibility.
    // -------------------------------------------------------------------------

    private function layoutGridTechnical(\GdImage $c, int $w, int $h, array $cfg, array $p, array &$warnings): void
    {
        $margin  = (int) ($w * 0.072);
        $split   = (int) ($w * 0.65);
        $gutter  = (int) ($w * 0.025);
        $leftW   = $split - $margin - (int)($w * 0.015);
        $rightX  = $split + $gutter;
        $rightW  = $w - $rightX - $margin;

        $mainClr  = $this->gdColor($c, $p['text_main']);
        $dimClr   = $this->gdColor($c, $p['text_dim']);
        $metaClr  = $this->gdColor($c, $p['text_meta']);
        $accentC  = $this->gdColor($c, $p['accent']);
        $ruleClr  = $this->gdColor($c, $p['accent'], 75);

        // ── Fine grid overlay ─────────────────────────────────────────────
        $gridColor = imagecolorallocatealpha($c, $p['accent'][0], $p['accent'][1], $p['accent'][2], 120);
        $tile      = (int) ($w / 24);
        for ($x = 0; $x < $w; $x += $tile) imageline($c, $x, 0, $x, $h, $gridColor);
        for ($y = 0; $y < $h; $y += $tile) imageline($c, 0, $y, $w, $y, $gridColor);

        // ── Header: class name left, #ID right (replaces format label) ───
        $headerY = (int) ($h * 0.072);
        if ($cfg['class']['name'] ?? '') {
            $this->drawText($c, mb_strtoupper($cfg['class']['name']), $margin, $headerY, $leftW, 20, 26, $accentC, true);
        }
        $pubId = $cfg['public_id'] ?? '???';
        $idPt  = 20;
        $font  = $this->fontPath(false);
        $idBl  = $headerY + ($font ? abs(imagettfbbox($idPt*0.75,0,$font,'#'.$pubId)[7] - imagettfbbox($idPt*0.75,0,$font,'#'.$pubId)[1]) : 14);
        $this->drawPublicIdHeader($c, $w - $margin, $idBl, $pubId, $accentC, $idPt);

        $hr1 = (int) ($h * 0.105);
        imageline($c, $margin, $hr1, $w - $margin, $hr1, $ruleClr);
        imageline($c, $margin, $hr1 + 3, $w - $margin, $hr1 + 3, $ruleClr);

        // ── Vertical column divider ───────────────────────────────────────
        imageline($c, $split, (int)($h * 0.10), $split, (int)($h * 0.90), $ruleClr);

        // ── Left column: message (adaptive size) ──────────────────────────
        $msgY    = (int) ($h * 0.125);
        $music   = $this->resolveMusicFromConfig($cfg);
        $isStory = ($cfg['format'] ?? 'story') === 'story';
        $footer  = $this->computeFooter($h, !empty($cfg['tags'] ?? []), $music['has_music'], $isStory);
        $msgMaxH = $footer['zone_top'] - $msgY;
        $message = $cfg['message'] ?? '';
        if ($message) {
            $result = $this->drawTextAutoSize($c, $message, $margin, $msgY, $leftW, max(60, $msgMaxH), 26, 56, $mainClr, true);
            if ($result['overflow']) $warnings[] = 'message_overflow';
        }

        // ── Right column: KEPADA, DARI, KATEGORI only (music moved to bottom-right card) ──
        $rY      = (int) ($h * 0.125);
        $target  = $cfg['target_text'] ?? $cfg['target'] ?? '';
        $alias   = $cfg['alias_text']  ?? $cfg['alias']  ?? '';
        $tags    = $cfg['tags'] ?? [];
        $music   = $this->resolveMusicFromConfig($cfg);
        $isStory = ($cfg['format'] ?? 'story') === 'story';

        $lblSize = 13; $valSize = 24;

        foreach ([['KEPADA', $target], ['DARI', $alias]] as [$label, $val]) {
            if (!$val) continue;
            $this->drawText($c, $label, $rightX, $rY, $rightW, $lblSize, $lblSize, $accentC, true);
            $rY += 17;
            $rY  = $this->drawText($c, $val, $rightX, $rY, $rightW, $valSize - 4, $valSize, $dimClr, false) + 14;
        }

        if (!empty($tags)) {
            $this->drawText($c, 'KATEGORI', $rightX, $rY, $rightW, $lblSize, $lblSize, $accentC, true);
            $rY += 17;
            foreach (array_slice($tags, 0, 3) as $tag) {
                $rY = $this->drawText($c, mb_strtoupper($tag), $rightX, $rY, $rightW, $valSize - 6, $valSize - 2, $dimClr, false) + 2;
            }
        }

        // ── Footer: rule + website left (bottom-anchored), music right ──
        imageline($c, $margin, $footer['zone_top'] + 4, $w - $margin, $footer['zone_top'] + 4, $ruleClr);
        $this->drawWebsiteLabelAt($c, $w, $cfg, $metaClr, $margin, $footer['website_y']);

        if ($music['has_music']) {
            $this->drawMusicCard($c, $music, $w, $margin, $footer['music_y'], [
                'bg_rgba'          => [0, 30, 26, 50],
                'placeholder_rgba' => [0, 210, 180, 70],
                'text_main'        => $mainClr,
                'text_dim'         => $dimClr,
                'text_meta'        => $metaClr,
                'accent'           => $accentC,
            ], $isStory);
        }
    }

    // -------------------------------------------------------------------------
    // Layout: Bold Block
    //
    // Visual grammar:
    //   - Two large color fields (top accent 28% / bottom dark 72%).
    //   - Tonal disc top-right, bleeds right edge.
    //   - Header zone: class name + KEPADA/DARI (dark text on accent) + public ID top-right.
    //   - Bottom zone: message centered vertically. Website label lighter color.
    // -------------------------------------------------------------------------

    private function layoutBoldBlock(\GdImage $c, int $w, int $h, array &$cfg, array $p, array &$warnings): void
    {
        $margin  = (int) ($w * 0.074);
        $split   = (int) ($h * 0.20);   // smaller header zone

        $design  = $cfg['design'] ?? [];
        $bgHex   = $design['background_color'] ?? $p['bg_default'];
        [$br, $bg_, $bb] = self::hexToRgb($bgHex);

        // ── Color blocks ─────────────────────────────────────────────────
        imagefilledrectangle($c, 0, 0, $w, $split, imagecolorallocate($c, $br, $bg_, $bb));
        imagefilledrectangle($c, 0, $split, $w, $h, imagecolorallocate($c, 10, 10, 12));
        $divColor = imagecolorallocate($c, 10, 10, 12);
        imageline($c, 0, $split, $w, $split, $divColor);
        imageline($c, 0, $split + 1, $w, $split + 1, $divColor);

        // ── Pattern overlay on top block only ────────────────────────────
        if (!empty($design['pattern_key'])) {
            $topBuf = imagecreatetruecolor($w, $split);
            imagealphablending($topBuf, true);
            imagecopy($topBuf, $c, 0, 0, 0, 0, $w, $split);
            $this->drawPattern($topBuf, $w, $split, $design);
            imagecopy($c, $topBuf, 0, 0, 0, 0, $w, $split);
            imagedestroy($topBuf);
        }

        // ── Tonal disc (top-right, bleeds right edge) ─────────────────────
        $discClr = imagecolorallocatealpha($c, max(0,$br-30), max(0,$bg_-25), max(0,$bb-20), 55);
        imagefilledellipse($c, (int)($w*1.02), (int)($split*0.48), (int)($w*0.56), (int)($w*0.56), $discClr);
        // Clip disc below split
        imagefilledrectangle($c, 0, $split, $w, $split + (int)($w*0.28) + 4, imagecolorallocate($c, 10, 10, 12));
        imageline($c, 0, $split, $w, $split, $divColor);
        imageline($c, 0, $split + 1, $w, $split + 1, $divColor);

        // ── Header: class name left, #ID right, KEPADA/DARI larger ─────────
        $topTextClr = imagecolorallocate($c, 10, 10, 12);
        $contentW   = $w - $margin * 2;
        $curHeaderY = (int) ($split * 0.18);
        $fontReg    = $this->fontPath(false);

        if ($cfg['class']['name'] ?? '') {
            $this->drawText($c, mb_strtoupper($cfg['class']['name']), $margin, $curHeaderY, (int)($contentW * 0.62), 24, 36, $topTextClr, true);
        }
        $pubId = $cfg['public_id'] ?? '???';
        $idPt  = 22;
        $idBl  = $curHeaderY + ($fontReg ? abs(imagettfbbox($idPt*0.75,0,$fontReg,'#'.$pubId)[7] - imagettfbbox($idPt*0.75,0,$fontReg,'#'.$pubId)[1]) : 14);
        $this->drawPublicIdHeader($c, $w - $margin, $idBl, $pubId, $topTextClr, $idPt);
        $curHeaderY += ($fontReg ? abs(imagettfbbox(36*0.75,0,$fontReg,'A')[7]-imagettfbbox(36*0.75,0,$fontReg,'A')[1]) : 28) + 10;

        $target = $cfg['target_text'] ?? $cfg['target'] ?? '';
        $alias  = $cfg['alias_text']  ?? $cfg['alias']  ?? '';

        if ($target) {
            $curHeaderY = $this->drawText($c, 'KEPADA', $margin, $curHeaderY, $contentW, 15, 17, $topTextClr, true) + 2;
            $curHeaderY = $this->drawText($c, $target, $margin, $curHeaderY, $contentW, 24, 32, $topTextClr, false) + 4;
        }
        if ($alias) {
            $curHeaderY = $this->drawText($c, 'DARI', $margin, $curHeaderY, $contentW, 15, 17, $topTextClr, true) + 2;
            $this->drawText($c, $alias, $margin, $curHeaderY, $contentW, 24, 32, $topTextClr, false);
        }

        $cfg['_skip_pill'] = true;

        // ── Bottom zone ───────────────────────────────────────────────────
        $mainClr     = $this->gdColor($c, $p['text_main']);
        $dimClr      = $this->gdColor($c, $p['text_dim']);
        $metaLighter = imagecolorallocate($c, 180, 174, 162);
        $tags        = $cfg['tags'] ?? [];
        $message     = $cfg['message'] ?? '';
        $music       = $this->resolveMusicFromConfig($cfg);
        $isStory     = ($cfg['format'] ?? 'story') === 'story';
        $musicCardH  = $this->measureMusicCard($isStory, $music['has_music']);

        // ── Tags strip: right side of split line, dark text on white pill ─
        $tagStripY = $split + 8;
        $tagStripH = !empty($tags) ? 40 : 0;
        if (!empty($tags)) {
            $tagOverride = array_merge($p, [
                'tag_bg'   => [255, 255, 255, 30],
                'tag_text' => [10, 10, 12],
            ]);
            $tagMaxW   = (int) ($w * 0.42);
            $tagStartX = $w - $margin - $tagMaxW;
            $this->drawCategoryRow($c, $tags, $tagStartX, $tagStripY, $tagMaxW, $tagOverride);
        }

        $bodyTop = $split + $tagStripH + (int)($h * 0.025);

        // ── Footer zone ───────────────────────────────────────────────────
        $footer  = $this->computeFooter($h, false, $music['has_music'], $isStory);

        // ── Message: full width, vertically centered in remaining space ───
        $msgBtm  = $footer['zone_top'] - 8;
        $availH  = $msgBtm - $bodyTop;
        $msgH    = $this->estimateTextHeight($message, $contentW, 28, 66);
        $startY  = $bodyTop + (int) max(0, ($availH - $msgH) / 2);
        $msgMaxH = $msgBtm - $startY - 8;

        if ($message) {
            $result = $this->drawTextAutoSize($c, $message, $margin, $startY, $contentW, max(60, $msgMaxH), 28, 66, $mainClr, false);
            if ($result['overflow']) $warnings[] = 'message_overflow';
        }

        // ── Footer: website left (bottom-anchored), music card right ──────
        if ($music['has_music']) {
            $this->drawMusicCard($c, $music, $w, $margin, $footer['music_y'], [
                'bg_rgba'          => [20, 20, 22, 55],
                'placeholder_rgba' => [80, 80, 84, 60],
                'text_main'        => $mainClr,
                'text_dim'         => $dimClr,
                'text_meta'        => $metaLighter,
                'accent'           => $this->gdColor($c, $p['accent']),
            ], $isStory);
        }

        $this->drawWebsiteLabelAt($c, $w, $cfg, $metaLighter, $margin, $footer['website_y']);
    }

    // -------------------------------------------------------------------------
    // Pattern generators (secondary texture — always low opacity)
    // -------------------------------------------------------------------------

    private function drawPattern(\GdImage $canvas, int $w, int $h, array $design): void
    {
        $key     = $design['pattern_key'];
        $hex     = $design['pattern_color'] ?? '#FFFFFF';
        $opacity = min(0.18, (float) ($design['pattern_opacity'] ?? 0.06)); // cap at 18% — stays secondary
        [$r, $g, $b] = self::hexToRgb($hex);
        $color = imagecolorallocatealpha($canvas, $r, $g, $b, self::opacityToGdAlpha($opacity));
        $tile  = (int) round($w / 27);

        match ($key) {
            'dots'           => $this->patternDots($canvas, $w, $h, $color, $tile),
            'grid'           => $this->patternGrid($canvas, $w, $h, $color, $tile),
            'diagonal_lines' => $this->patternDiagonalLines($canvas, $w, $h, $color, $tile),
            'plus'           => $this->patternPlus($canvas, $w, $h, $color, $tile),
            'circles'        => $this->patternCircles($canvas, $w, $h, $color, $tile),
            'triangles'      => $this->patternTriangles($canvas, $w, $h, $color, $tile),
            'checker'        => $this->patternChecker($canvas, $w, $h, $color, $tile),
            'waves'          => $this->patternWaves($canvas, $w, $h, $color, $tile),
            default          => null,
        };
    }

    private function patternDots(\GdImage $c, int $w, int $h, int $color, int $tile): void
    {
        $r = (int) max(2, $tile / 5);
        for ($y = $tile / 2; $y < $h; $y += $tile)
            for ($x = $tile / 2; $x < $w; $x += $tile)
                imagefilledellipse($c, (int)$x, (int)$y, $r*2, $r*2, $color);
    }

    private function patternGrid(\GdImage $c, int $w, int $h, int $color, int $tile): void
    {
        for ($x = 0; $x < $w; $x += $tile) imageline($c, $x, 0, $x, $h, $color);
        for ($y = 0; $y < $h; $y += $tile) imageline($c, 0, $y, $w, $y, $color);
    }

    private function patternDiagonalLines(\GdImage $c, int $w, int $h, int $color, int $tile): void
    {
        for ($d = -$h; $d < $w + $h; $d += $tile) imageline($c, $d, 0, $d - $h, $h, $color);
    }

    private function patternPlus(\GdImage $c, int $w, int $h, int $color, int $tile): void
    {
        $arm = (int) max(1, $tile / 4);
        for ($y = $tile / 2; $y < $h; $y += $tile)
            for ($x = $tile / 2; $x < $w; $x += $tile) {
                $cx = (int)$x; $cy = (int)$y;
                imagefilledrectangle($c, $cx - $arm, $cy - 1, $cx + $arm, $cy + 1, $color);
                imagefilledrectangle($c, $cx - 1, $cy - $arm, $cx + 1, $cy + $arm, $color);
            }
    }

    private function patternCircles(\GdImage $c, int $w, int $h, int $color, int $tile): void
    {
        $r = (int) max(3, $tile * 0.4);
        for ($y = $tile / 2; $y < $h; $y += $tile)
            for ($x = $tile / 2; $x < $w; $x += $tile)
                imageellipse($c, (int)$x, (int)$y, $r*2, $r*2, $color);
    }

    private function patternTriangles(\GdImage $c, int $w, int $h, int $color, int $tile): void
    {
        $half = (int)($tile / 2);
        for ($row = 0; $row * $tile < $h + $tile; $row++)
            for ($col = 0; $col * $tile < $w + $tile; $col++) {
                $ox  = $col * $tile + ($row % 2 === 0 ? 0 : $half);
                $oy  = $row * $tile;
                imagefilledpolygon($c, [$ox, $oy + $tile, $ox + $half, $oy, $ox + $tile, $oy + $tile], $color);
            }
    }

    private function patternChecker(\GdImage $c, int $w, int $h, int $color, int $tile): void
    {
        for ($row = 0; $row * $tile < $h; $row++)
            for ($col = 0; $col * $tile < $w; $col++)
                if (($row + $col) % 2 === 0)
                    imagefilledrectangle($c, $col * $tile, $row * $tile, ($col + 1) * $tile - 1, ($row + 1) * $tile - 1, $color);
    }

    private function patternWaves(\GdImage $c, int $w, int $h, int $color, int $tile): void
    {
        $amp = (int)($tile / 3);
        for ($row = 0; $row * $tile < $h + $tile; $row++) {
            $baseY = $row * $tile; $prevX = 0; $prevY = $baseY;
            for ($x = 1; $x <= $w; $x++) {
                $y = $baseY + $amp * sin(2 * M_PI * $x / $tile);
                imageline($c, $prevX, (int)$prevY, $x, (int)$y, $color);
                $prevX = $x; $prevY = $y;
            }
        }
    }

    // -------------------------------------------------------------------------
    // Shared UI elements
    // -------------------------------------------------------------------------

    /**
     * Draw category markers.
     * Internally: tags domain. User-facing: Kategori.
     * Single row, up to 3. Displayed as "KATEGORI" label, not #hashtags.
     * ponytail: if only 1 category used by convention, hide multi-category UI then.
     */
    private function drawCategoryRow(\GdImage $c, array $tags, int $x, int $y, int $maxW, array $p): void
    {
        $font   = $this->fontPath(false);
        $size   = 18;
        $cur    = $x;

        [$tbr, $tbg, $tbb] = $p['tag_bg'];
        $tba    = $p['tag_bg'][3] ?? 35;
        $tagBg  = imagecolorallocatealpha($c, $tbr, $tbg, $tbb, $tba);
        $tagTxt = $this->gdColor($c, $p['tag_text']);

        foreach (array_slice($tags, 0, 3) as $tagName) {
            // Display: UPPERCASE without # prefix
            $label = mb_strtoupper($tagName);
            if ($font) {
                $bbox = imagettfbbox($size * 0.75, 0, $font, $label);
                $tw   = abs($bbox[2] - $bbox[0]);
                $th   = abs($bbox[7] - $bbox[1]);
            } else {
                $tw = strlen($label) * 8; $th = 12;
            }
            $pillW = $tw + 20; $pillH = $th + 14;
            if ($cur + $pillW > $x + $maxW) break;

            $this->filledRoundedRect($c, $cur, $y, $cur + $pillW, $y + $pillH, 8, $tagBg);
            if ($font) {
                imagettftext($c, $size * 0.75, 0, $cur + 10, $y + $pillH - (int)(($pillH - $th) / 2), $tagTxt, $font, $label);
            } else {
                imagestring($c, 3, $cur + 10, $y + 7, $label, $tagTxt);
            }
            $cur += $pillW + 8;
        }
    }

    /**
     * @param float $yFrac Vertical position as fraction of height (default 0.905).
     *                     Editorial Geometry uses 0.930 to push closer to bottom edge.
     */
    private function drawWebsiteLabel(\GdImage $c, int $w, int $h, array $cfg, int $metaClr, float $yFrac = 0.905): void
    {
        if (!($cfg['show_website_url'] ?? true)) return;
        $website = $cfg['class']['website_label'] ?? null;
        $handle  = $cfg['class']['instagram_handle'] ?? null;
        $label   = trim(($handle ? $handle . '  ' : '') . ($website ?? ''));
        if (!$label) return;

        $margin = (int) ($w * 0.074);
        $y      = (int) ($h * $yFrac);
        $this->drawText($c, $label, $margin, $y, $w - $margin * 2, 20, 24, $metaClr, false);
    }

    private function drawPublicIdPill(\GdImage $c, int $w, int $h, string $publicId, array $preset): void
    {
        $margin   = 40;
        $padX     = 22;
        $padY     = 9;
        $fontSize = 30;   // V3: bumped from 26
        $font     = $this->fontPath(false);

        if ($font) {
            $bbox  = imagettfbbox($fontSize * 0.75, 0, $font, $publicId);
            $textW = abs($bbox[2] - $bbox[0]);
            $textH = abs($bbox[7] - $bbox[1]);
        } else {
            $textW = strlen($publicId) * 9; $textH = 13;
        }

        $pillW = $textW + $padX * 2;
        $pillH = $textH + $padY * 2;
        $x2    = $w - $margin;
        $x1    = $x2 - $pillW;
        $y1    = $h - $margin - $pillH;
        $y2    = $h - $margin;

        // V3: luminance-based instead of hardcoded quiet_editorial check
        [$bgR, $bgG, $bgB] = self::hexToRgb($preset['bg_default']);
        $luminance = (0.299 * $bgR + 0.587 * $bgG + 0.114 * $bgB) / 255;
        $isLight   = $luminance > 0.5;

        // Dark presets: high-contrast white pill + pure white text
        // Light presets: dark pill + near-black text
        $pillBg  = $isLight
            ? imagecolorallocatealpha($c, 20, 18, 15, 18)     // dark pill on light bg
            : imagecolorallocatealpha($c, 255, 255, 255, 20); // white pill, high contrast on dark bg
        $textClr = $isLight
            ? imagecolorallocate($c, 20, 18, 15)              // near-black
            : imagecolorallocate($c, 255, 255, 255);          // pure white

        $this->filledRoundedRect($c, $x1, $y1, $x2, $y2, self::PILL_RADIUS, $pillBg);
        if ($font) {
            imagettftext($c, $fontSize * 0.75, 0, $x1 + $padX, $y1 + $padY + $textH, $textClr, $font, $publicId);
        } else {
            imagestring($c, 4, $x1 + $padX, $y1 + $padY, $publicId, $textClr);
        }
    }

    private function drawPageIndicator(\GdImage $c, int $w, int $h, int $page, int $total): void
    {
        $label = "({$page}/{$total})";
        $font  = $this->fontPath(false);
        $size  = 24; $x = 40; $y = $h - 40 - 34;
        $bg    = imagecolorallocatealpha($c, 30, 20, 40, 30);
        $white = imagecolorallocate($c, 255, 255, 255);
        $padX  = 16; $padY = 7;

        if ($font) {
            $bbox = imagettfbbox($size * 0.75, 0, $font, $label);
            $tw = abs($bbox[2] - $bbox[0]); $th = abs($bbox[7] - $bbox[1]);
            $this->filledRoundedRect($c, $x, $y, $x + $tw + $padX * 2, $y + $th + $padY * 2, 10, $bg);
            imagettftext($c, $size * 0.75, 0, $x + $padX, $y + $padY + $th, $white, $font, $label);
        } else {
            imagestring($c, 4, $x, $y, $label, $white);
        }
    }

    // -------------------------------------------------------------------------
    // Text helpers
    // -------------------------------------------------------------------------

    private function drawText(
        \GdImage $c, string $text,
        int $x, int $y, int $maxW,
        int $minSize, int $maxSize,
        int $color, bool $bold
    ): int {
        $font = $this->fontPath($bold) ?? $this->fontPath(false);
        if (!$font) { imagestring($c, 4, $x, $y, $text, $color); return $y + 16; }

        $size = $maxSize;
        while ($size >= $minSize) {
            if (abs(imagettfbbox($size * 0.75, 0, $font, $text)[2] - imagettfbbox($size * 0.75, 0, $font, $text)[0]) <= $maxW) break;
            $size--;
        }
        $bbox = imagettfbbox($size * 0.75, 0, $font, $text);
        $th   = abs($bbox[7] - $bbox[1]);
        imagettftext($c, $size * 0.75, 0, $x, $y + $th, $color, $font, $text);
        return $y + $th + 4;
    }

    private function drawTextAutoSize(
        \GdImage $c, string $text,
        int $x, int $y, int $maxW, int $maxH,
        int $minSize, int $maxSize,
        int $color, bool $bold
    ): array {
        $font = $this->fontPath($bold) ?? $this->fontPath(false);

        if (!$font) {
            $words = explode(' ', $text); $line = ''; $lineH = 18; $curY = $y; $overflow = false;
            foreach ($words as $word) {
                $test = $line ? "$line $word" : $word;
                if (strlen($test) * 8 > $maxW) {
                    if ($curY + $lineH > $y + $maxH) { $overflow = true; break; }
                    imagestring($c, 4, $x, $curY, $line, $color); $curY += $lineH; $line = $word;
                } else { $line = $test; }
            }
            if ($line && !$overflow) { imagestring($c, 4, $x, $curY, $line, $color); $curY += $lineH; }
            return ['y' => $curY, 'overflow' => $overflow];
        }

        $size = $maxSize;
        while ($size >= $minSize) {
            $lines = $this->wrapText($text, $font, $size * 0.75, $maxW);
            if (count($lines) * (int)($size * 0.75 * 1.5) <= $maxH) break;
            $size--;
        }

        $lines    = $this->wrapText($text, $font, $size * 0.75, $maxW);
        $lineH    = (int) ($size * 0.75 * 1.5);
        $overflow = (count($lines) * $lineH > $maxH);
        $curY     = $y;

        foreach ($lines as $line) {
            if ($curY + $lineH > $y + $maxH) { $overflow = true; break; }
            $bbox = imagettfbbox($size * 0.75, 0, $font, $line);
            $th   = abs($bbox[7] - $bbox[1]);
            imagettftext($c, $size * 0.75, 0, $x, $curY + $th, $color, $font, $line);
            $curY += $lineH;
        }

        return ['y' => $curY, 'overflow' => $overflow];
    }

    private function wrapText(string $text, string $font, float $ptSize, int $maxW): array
    {
        $words = preg_split('/\s+/', trim($text), -1, PREG_SPLIT_NO_EMPTY);
        $lines = []; $line = '';
        foreach ($words as $word) {
            // If a single word is wider than maxW, break it character by character
            $wordBbox = imagettfbbox($ptSize, 0, $font, $word);
            if (abs($wordBbox[2] - $wordBbox[0]) > $maxW) {
                if ($line !== '') { $lines[] = $line; $line = ''; }
                $chunk = '';
                foreach (mb_str_split($word) as $char) {
                    $test = $chunk . $char;
                    $bbox = imagettfbbox($ptSize, 0, $font, $test);
                    if (abs($bbox[2] - $bbox[0]) > $maxW && $chunk !== '') {
                        $lines[] = $chunk;
                        $chunk = $char;
                    } else { $chunk = $test; }
                }
                $line = $chunk;
                continue;
            }
            $test = $line === '' ? $word : "$line $word";
            $bbox = imagettfbbox($ptSize, 0, $font, $test);
            if (abs($bbox[2] - $bbox[0]) > $maxW && $line !== '') {
                $lines[] = $line; $line = $word;
            } else { $line = $test; }
        }
        if ($line !== '') $lines[] = $line;
        return $lines ?: [''];
    }

    // -------------------------------------------------------------------------
    // Drawing primitives
    // -------------------------------------------------------------------------

    private function filledRoundedRect(\GdImage $c, int $x1, int $y1, int $x2, int $y2, int $r, int $color): void
    {
        $r = min($r, (int)(($x2 - $x1) / 2), (int)(($y2 - $y1) / 2));
        imagefilledrectangle($c, $x1 + $r, $y1, $x2 - $r, $y2, $color);
        imagefilledrectangle($c, $x1, $y1 + $r, $x2, $y2 - $r, $color);
        imagefilledarc($c, $x1 + $r, $y1 + $r, $r*2, $r*2, 180, 270, $color, IMG_ARC_PIE);
        imagefilledarc($c, $x2 - $r, $y1 + $r, $r*2, $r*2, 270, 360, $color, IMG_ARC_PIE);
        imagefilledarc($c, $x1 + $r, $y2 - $r, $r*2, $r*2,  90, 180, $color, IMG_ARC_PIE);
        imagefilledarc($c, $x2 - $r, $y2 - $r, $r*2, $r*2,   0,  90, $color, IMG_ARC_PIE);
    }
}
