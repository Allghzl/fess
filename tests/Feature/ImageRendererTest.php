<?php

namespace Tests\Feature;

use App\Models\ClassWorkspace;
use App\Models\Submission;
use App\Models\User;
use App\Services\ImageRenderer;
use App\Support\SubmissionStatus;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class ImageRendererTest extends TestCase
{
    use RefreshDatabase;

    private function baseConfig(string $format = 'story'): array
    {
        return [
            'submission_id'   => 'test-uuid',
            'public_id'       => 'MF-TEST01',
            'message'         => 'Hello this is a test message for rendering.',
            'target'          => 'Someone',
            'alias'           => 'Anonymous',
            'category'        => 'general',
            'class'           => [
                'name'             => 'XII RPL 1',
                'logo_asset_key'   => null,
                'website_label'    => 'example.com',
                'instagram_handle' => '@example',
            ],
            'format'          => $format,
            'show_logo'       => false,
            'show_website_url'=> true,
            'show_public_id'  => true,
            'design'          => [
                'source'           => 'builtin',
                'template_key'     => 'pastel-grid',
                'background_color' => '#D6E8F6',
                'pattern_key'      => 'grid',
                'pattern_color'    => '#FFFFFF',
                'pattern_opacity'  => 0.35,
            ],
        ];
    }

    public function test_story_format_produces_correct_dimensions(): void
    {
        $renderer = app(ImageRenderer::class);
        $config   = $this->baseConfig('story');
        $png      = $renderer->renderToPng($config);

        $img = imagecreatefromstring($png);
        $this->assertNotFalse($img);
        $this->assertSame(1080, imagesx($img));
        $this->assertSame(1920, imagesy($img));
        imagedestroy($img);
    }

    public function test_feed_portrait_produces_correct_dimensions(): void
    {
        $renderer = app(ImageRenderer::class);
        $config   = $this->baseConfig('feed_portrait');
        $png      = $renderer->renderToPng($config);

        $img = imagecreatefromstring($png);
        $this->assertNotFalse($img);
        $this->assertSame(1080, imagesx($img));
        $this->assertSame(1350, imagesy($img));
        imagedestroy($img);
    }

    public function test_render_produces_valid_png(): void
    {
        $renderer = app(ImageRenderer::class);
        $config   = $this->baseConfig('story');
        $png      = $renderer->renderToPng($config);

        // PNG magic bytes: 137 80 78 71
        $this->assertSame("\x89PNG", substr($png, 0, 4));
    }

    public function test_show_public_id_false_is_ignored(): void
    {
        $renderer = app(ImageRenderer::class);
        $config   = $this->baseConfig('story');
        $config['show_public_id'] = false; // must be ignored

        $png = $renderer->renderToPng($config);
        // Config should have been forced true — render completes without error
        $this->assertSame("\x89PNG", substr($png, 0, 4));
        $this->assertSame(true, $config['show_public_id']);
    }

    public function test_all_builtin_patterns_render_without_error(): void
    {
        $renderer = app(ImageRenderer::class);
        $patterns = ['dots', 'grid', 'diagonal_lines', 'plus', 'circles', 'triangles', 'checker', 'waves'];

        foreach ($patterns as $pattern) {
            $config = $this->baseConfig('story');
            $config['design']['pattern_key'] = $pattern;
            $png = $renderer->renderToPng($config);
            $this->assertSame("\x89PNG", substr($png, 0, 4), "Pattern {$pattern} failed");
        }
    }

    public function test_render_with_taken_down_submission_rejected_via_route(): void
    {
        $user  = User::factory()->create();
        $class = ClassWorkspace::factory()->create();
        $class->members()->attach($user->id, ['role' => 'admin']);

        $submission = Submission::factory()->create([
            'class_id' => $class->id,
            'status'   => SubmissionStatus::TakenDown->value,
            'public_id'=> 'MF-TAKEN',
        ]);

        $this->actingAs($user)
            ->postJson("/admin/classes/{$class->id}/approved/{$submission->id}/render", [
                'format' => 'story',
                'design' => ['source' => 'builtin', 'template_key' => 'pastel-grid'],
            ])
            ->assertStatus(403);
    }
}
