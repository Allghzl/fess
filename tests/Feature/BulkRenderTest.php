<?php

namespace Tests\Feature;

use App\Models\ClassWorkspace;
use App\Models\Submission;
use App\Models\User;
use App\Support\SubmissionStatus;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class BulkRenderTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        // Clean up any leftover temp render dirs from previous runs
        $tmpBase = storage_path('app/tmp/renders');
        if (is_dir($tmpBase)) {
            foreach (glob($tmpBase . '/*', GLOB_ONLYDIR) ?: [] as $dir) {
                foreach (glob($dir . '/*') ?: [] as $f) { @unlink($f); }
                @rmdir($dir);
            }
        }
    }

    private function setupClassWithMember(): array
    {
        $user  = User::factory()->create();
        $class = ClassWorkspace::factory()->create();
        $class->members()->attach($user->id, ['role' => 'admin']);
        return [$user, $class];
    }

    private function bulkPayload(array $ids, string $format = 'story'): array
    {
        return [
            'submission_ids' => $ids,
            'format'         => $format,
            'bulk_config'    => [
                'design' => [
                    'source'           => 'builtin',
                    'template_key'     => 'pastel-grid',
                    'background_color' => '#D6E8F6',
                    'pattern_key'      => 'grid',
                    'pattern_color'    => '#FFFFFF',
                    'pattern_opacity'  => 0.35,
                ],
            ],
            'item_overrides' => [],
        ];
    }

    public function test_zip_contains_expected_png_filenames(): void
    {
        [$user, $class] = $this->setupClassWithMember();

        $s1 = Submission::factory()->approved()->create(['class_id' => $class->id, 'public_id' => 'MF-AAAA01']);
        $s2 = Submission::factory()->approved()->create(['class_id' => $class->id, 'public_id' => 'MF-BBBB02']);

        $response = $this->actingAs($user)
            ->postJson("/admin/classes/{$class->id}/approved/bulk-render",
                $this->bulkPayload([$s1->id, $s2->id])
            );

        $response->assertStatus(200);
        $response->assertHeader('Content-Type', 'application/zip');

        // Extract ZIP and check filenames
        $tmp = tempnam(sys_get_temp_dir(), 'bulktest_') . '.zip';
        file_put_contents($tmp, $response->getContent());

        $zip = new \ZipArchive();
        $this->assertTrue($zip->open($tmp) === true);

        $names = [];
        for ($i = 0; $i < $zip->numFiles; $i++) {
            $names[] = $zip->getNameIndex($i);
        }
        $zip->close();
        @unlink($tmp);

        $this->assertContains('MF-AAAA01_story.png', $names);
        $this->assertContains('MF-BBBB02_story.png', $names);
    }

    public function test_taken_down_item_excluded_from_zip(): void
    {
        [$user, $class] = $this->setupClassWithMember();

        $approved  = Submission::factory()->approved()->create(['class_id' => $class->id, 'public_id' => 'MF-GOOD01']);
        $takenDown = Submission::factory()->create([
            'class_id'  => $class->id,
            'public_id' => 'MF-TKDN01',
            'status'    => SubmissionStatus::TakenDown->value,
        ]);

        $response = $this->actingAs($user)
            ->postJson("/admin/classes/{$class->id}/approved/bulk-render",
                $this->bulkPayload([$approved->id, $takenDown->id])
            );

        $response->assertStatus(200);

        $tmp = tempnam(sys_get_temp_dir(), 'bulktest_') . '.zip';
        file_put_contents($tmp, $response->getContent());
        $zip = new \ZipArchive();
        $zip->open($tmp);
        $names = [];
        for ($i = 0; $i < $zip->numFiles; $i++) $names[] = $zip->getNameIndex($i);
        $zip->close();
        @unlink($tmp);

        $this->assertContains('MF-GOOD01_story.png', $names);
        $this->assertNotContains('MF-TKDN01_story.png', $names);
    }

    public function test_foreign_class_submission_id_rejected(): void
    {
        [$user, $class] = $this->setupClassWithMember();

        $otherClass = ClassWorkspace::factory()->create();
        $foreign    = Submission::factory()->approved()->create(['class_id' => $otherClass->id]);

        $response = $this->actingAs($user)
            ->postJson("/admin/classes/{$class->id}/approved/bulk-render",
                $this->bulkPayload([$foreign->id])
            );

        $response->assertStatus(422);
        $response->assertJsonPath('error', 'Foreign class submission IDs rejected.');
    }

    public function test_temp_files_cleaned_up_after_render(): void
    {
        [$user, $class] = $this->setupClassWithMember();

        $sub = Submission::factory()->approved()->create(['class_id' => $class->id, 'public_id' => 'MF-CLEAN1']);

        $this->actingAs($user)
            ->postJson("/admin/classes/{$class->id}/approved/bulk-render",
                $this->bulkPayload([$sub->id])
            )
            ->assertStatus(200);

        // tmp dir should be gone after response
        $tmpBase = storage_path('app/tmp/renders');
        $dirs    = glob($tmpBase . '/*', GLOB_ONLYDIR) ?: [];
        $this->assertEmpty($dirs, 'Temp render directories not cleaned up: ' . implode(', ', $dirs));
    }

    public function test_non_member_gets_403(): void
    {
        [, $class] = $this->setupClassWithMember();
        $stranger = User::factory()->create();

        $this->actingAs($stranger)
            ->postJson("/admin/classes/{$class->id}/approved/bulk-render",
                $this->bulkPayload([])
            )
            ->assertStatus(403);
    }
}
