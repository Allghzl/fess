<?php

namespace Tests\Feature;

use App\Models\ClassDesign;
use App\Models\ClassWorkspace;
use App\Models\User;
use App\Services\ClassDesignService;
use App\Services\DesignCropService;
use App\Support\DesignFormat;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

class ClassDesignTest extends TestCase
{
    use RefreshDatabase;

    private function makePngUpload(int $w = 1080, int $h = 1920): UploadedFile
    {
        $img  = imagecreatetruecolor($w, $h);
        $bg   = imagecolorallocate($img, 240, 220, 232);
        imagefilledrectangle($img, 0, 0, $w - 1, $h - 1, $bg);
        ob_start();
        imagepng($img);
        $bytes = ob_get_clean();
        imagedestroy($img);

        $tmp = tempnam(sys_get_temp_dir(), 'design_test_') . '.png';
        file_put_contents($tmp, $bytes);

        return new UploadedFile($tmp, 'test.png', 'image/png', null, true);
    }

    private function svc(): ClassDesignService
    {
        return app(ClassDesignService::class);
    }

    public function test_max_3_active_story_designs_enforced(): void
    {
        Storage::fake('local');

        $user  = User::factory()->create();
        $class = ClassWorkspace::factory()->create();

        // Create 3 designs manually filling slots 1, 2, 3
        foreach ([1, 2, 3] as $slot) {
            ClassDesign::factory()->create([
                'class_id'   => $class->id,
                'format'     => 'story',
                'slot_index' => $slot,
                'active'     => true,
                'created_by' => $user->id,
            ]);
        }

        $this->expectException(\Illuminate\Validation\ValidationException::class);

        $this->svc()->upload(
            $class,
            ['format' => 'story', 'slot_index' => 1, 'name' => 'Overflow'],
            $this->makePngUpload(),
            $user->id
        );
    }

    public function test_max_3_active_feed_designs_enforced_independently(): void
    {
        Storage::fake('local');

        $user  = User::factory()->create();
        $class = ClassWorkspace::factory()->create();

        // Fill story slots (should not affect feed limit)
        foreach ([1, 2, 3] as $slot) {
            ClassDesign::factory()->create([
                'class_id'   => $class->id,
                'format'     => 'story',
                'slot_index' => $slot,
                'active'     => true,
                'created_by' => $user->id,
            ]);
        }

        // Uploading a feed design should succeed (story slots don't block feed)
        $design = $this->svc()->upload(
            $class,
            ['format' => 'feed_portrait', 'slot_index' => 1, 'name' => 'Feed 1'],
            $this->makePngUpload(1080, 1350),
            $user->id
        );

        $this->assertSame('feed_portrait', $design->format->value);
    }

    public function test_story_fallback_does_not_mutate_source_design(): void
    {
        Storage::fake('local');

        $user  = User::factory()->create();
        $class = ClassWorkspace::factory()->create();

        $design = $this->svc()->upload(
            $class,
            ['format' => 'story', 'slot_index' => 1, 'name' => 'Story 1'],
            $this->makePngUpload(),
            $user->id
        );

        // feed_fallback_crop is stored on story design; format stays story
        $this->assertSame('story', $design->format->value);
        $this->assertNotNull($design->feed_fallback_crop);

        // source_asset_key unchanged
        $this->assertStringContainsString('source.', $design->source_asset_key);
    }

    public function test_delete_removes_storage_object(): void
    {
        Storage::fake('local');

        $user  = User::factory()->create();
        $class = ClassWorkspace::factory()->create();

        $design = $this->svc()->upload(
            $class,
            ['format' => 'story', 'slot_index' => 1, 'name' => 'To Delete'],
            $this->makePngUpload(),
            $user->id
        );

        $key = $design->source_asset_key;
        Storage::disk('local')->assertExists($key);

        $this->svc()->delete($design);

        Storage::disk('local')->assertMissing($key);
        $this->assertDatabaseMissing('class_designs', ['id' => $design->id]);
    }

    public function test_delete_keeps_storage_when_other_record_references_same_key(): void
    {
        Storage::fake('local');

        $user  = User::factory()->create();
        $class = ClassWorkspace::factory()->create();

        // Two records with same key (edge case)
        $key = 'classes/shared/designs/abc/source.png';
        Storage::disk('local')->put($key, 'fake-png');

        $d1 = ClassDesign::factory()->create([
            'class_id' => $class->id, 'format' => 'story', 'slot_index' => 1,
            'source_asset_key' => $key, 'created_by' => $user->id,
        ]);
        $d2 = ClassDesign::factory()->create([
            'class_id' => $class->id, 'format' => 'story', 'slot_index' => 2,
            'source_asset_key' => $key, 'created_by' => $user->id,
        ]);

        $this->svc()->delete($d1);

        // d2 still references key — must not be deleted
        Storage::disk('local')->assertExists($key);
    }
}
