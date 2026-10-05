<?php

namespace App\Services;

use App\Support\DesignFormat;

class DesignCropService
{
    /**
     * Calculate cover crop rect (x, y, w, h) to fill target format from source dimensions.
     * Never stretches — picks the largest rect matching target aspect ratio, centered by default.
     * focal_x/focal_y: 0.0–1.0 relative to source, clamped to bounds.
     */
    public function coverCrop(
        int $srcW, int $srcH,
        DesignFormat $format,
        float $focalX = 0.5,
        float $focalY = 0.5
    ): array {
        $dim = $format->dimensions();
        $targetW = $dim['width'];
        $targetH = $dim['height'];

        return $this->computeCrop($srcW, $srcH, $targetW, $targetH, $focalX, $focalY);
    }

    /**
     * Story → Feed fallback crop.
     * Source is story dimensions (or any source); target ratio is feed_portrait (4:5).
     * Returns crop array: [x, y, width, height, focal_x, focal_y]
     */
    public function storyToFeedFallbackCrop(
        int $srcW, int $srcH,
        float $focalX = 0.5,
        float $focalY = 0.5
    ): array {
        $feed = DesignFormat::FeedPortrait->dimensions();
        return $this->computeCrop($srcW, $srcH, $feed['width'], $feed['height'], $focalX, $focalY);
    }

    /**
     * Core crop math — no stretch, aspect-ratio preserving.
     */
    public function computeCrop(
        int $srcW, int $srcH,
        int $targetW, int $targetH,
        float $focalX = 0.5,
        float $focalY = 0.5
    ): array {
        $targetRatio = $targetW / $targetH;
        $srcRatio    = $srcW / $srcH;

        if ($srcRatio > $targetRatio) {
            // source wider than target → crop sides
            $cropH = $srcH;
            $cropW = (int) round($srcH * $targetRatio);
        } else {
            // source taller than target → crop top/bottom
            $cropW = $srcW;
            $cropH = (int) round($srcW / $targetRatio);
        }

        // clamp focal to valid range
        $focalX = max(0.0, min(1.0, $focalX));
        $focalY = max(0.0, min(1.0, $focalY));

        // focal point in source px
        $centerX = (int) round($focalX * $srcW);
        $centerY = (int) round($focalY * $srcH);

        // desired top-left
        $x = $centerX - (int) round($cropW / 2);
        $y = $centerY - (int) round($cropH / 2);

        // clamp to source bounds
        $x = max(0, min($srcW - $cropW, $x));
        $y = max(0, min($srcH - $cropH, $y));

        return [
            'x'       => $x,
            'y'       => $y,
            'width'   => $cropW,
            'height'  => $cropH,
            'focal_x' => $focalX,
            'focal_y' => $focalY,
        ];
    }

    /**
     * Verify aspect ratio preserved (no stretch).
     * Returns true if computed crop matches target ratio within tolerance.
     */
    public function validateNonStretched(array $crop, int $targetW, int $targetH, float $tolerance = 0.01): bool
    {
        $cropRatio   = $crop['width'] / $crop['height'];
        $targetRatio = $targetW / $targetH;
        return abs($cropRatio - $targetRatio) <= $tolerance;
    }
}
