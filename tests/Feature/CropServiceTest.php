<?php

namespace Tests\Feature;

use App\Services\DesignCropService;
use App\Support\DesignFormat;
use Tests\TestCase;

class CropServiceTest extends TestCase
{
    private DesignCropService $svc;

    protected function setUp(): void
    {
        parent::setUp();
        $this->svc = new DesignCropService();
    }

    public function test_story_cover_crop_correct_dimensions(): void
    {
        // arbitrary 1200×2400 source → story 1080×1920
        $crop = $this->svc->coverCrop(1200, 2400, DesignFormat::Story);

        $storyRatio = 1080 / 1920;
        $cropRatio  = $crop['width'] / $crop['height'];
        $this->assertEqualsWithDelta($storyRatio, $cropRatio, 0.01);
        $this->assertLessThanOrEqual(1200, $crop['x'] + $crop['width']);
        $this->assertLessThanOrEqual(2400, $crop['y'] + $crop['height']);
    }

    public function test_feed_cover_crop_correct_dimensions(): void
    {
        // 2000×2000 source → feed_portrait 1080×1350 (4:5 = 0.8)
        $crop = $this->svc->coverCrop(2000, 2000, DesignFormat::FeedPortrait);

        $feedRatio = 1080 / 1350;
        $cropRatio = $crop['width'] / $crop['height'];
        $this->assertEqualsWithDelta($feedRatio, $cropRatio, 0.01);
    }

    public function test_story_to_feed_fallback_never_stretches(): void
    {
        $srcW = 1080;
        $srcH = 1920;
        $crop = $this->svc->storyToFeedFallbackCrop($srcW, $srcH);

        // Crop ratio must match feed_portrait ratio within tolerance
        $feedRatio = 1080 / 1350;
        $cropRatio = $crop['width'] / $crop['height'];
        $this->assertEqualsWithDelta($feedRatio, $cropRatio, 0.01);

        // Crop must fit within source
        $this->assertGreaterThanOrEqual(0, $crop['x']);
        $this->assertGreaterThanOrEqual(0, $crop['y']);
        $this->assertLessThanOrEqual($srcW, $crop['x'] + $crop['width']);
        $this->assertLessThanOrEqual($srcH, $crop['y'] + $crop['height']);
    }

    public function test_focal_adjustment_clamped_to_image_bounds(): void
    {
        $crop = $this->svc->coverCrop(1080, 1920, DesignFormat::FeedPortrait, 1.5, -0.3);

        // focal should be clamped
        $this->assertLessThanOrEqual(1.0, $crop['focal_x']);
        $this->assertGreaterThanOrEqual(0.0, $crop['focal_x'] - 1.0); // x <= 1.0
        $this->assertGreaterThanOrEqual(0.0, $crop['focal_y']);

        // crop within bounds
        $this->assertGreaterThanOrEqual(0, $crop['x']);
        $this->assertGreaterThanOrEqual(0, $crop['y']);
        $this->assertLessThanOrEqual(1080, $crop['x'] + $crop['width']);
        $this->assertLessThanOrEqual(1920, $crop['y'] + $crop['height']);
    }

    public function test_center_focal_produces_centered_crop(): void
    {
        $crop = $this->svc->coverCrop(1080, 1920, DesignFormat::FeedPortrait, 0.5, 0.5);

        // Width should equal source width (source is narrower than feed ratio when tall)
        $this->assertSame(1080, $crop['width']);
        $this->assertSame(0, $crop['x']); // no horizontal offset
    }
}
