<?php

namespace Tests\Feature;

use App\Models\ClassWorkspace;
use App\Models\Submission;
use App\Models\User;
use App\Support\SubmissionStatus;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class AdminBulkTest extends TestCase
{
    use RefreshDatabase;

    private function makeAdmin(): array
    {
        $user  = User::factory()->create();
        $class = ClassWorkspace::factory()->create();
        $class->members()->attach($user, ['role' => 'admin']);
        return [$user, $class];
    }

    public function test_bulk_render_accepts_approved_items(): void
    {
        [$user, $class] = $this->makeAdmin();
        $subs = Submission::factory()->count(2)->approved($user)->create(['class_id' => $class->id]);

        $response = $this->actingAs($user)->postJson("/admin/classes/{$class->id}/approved/bulk-render", [
            'submission_ids' => $subs->pluck('id')->toArray(),
            'format'         => 'story',
        ]);

        $response->assertStatus(200);
        $response->assertHeader('Content-Type', 'application/zip');
    }

    public function test_taken_down_item_excluded(): void
    {
        [$user, $class] = $this->makeAdmin();
        $approved  = Submission::factory()->approved($user)->create(['class_id' => $class->id]);
        $takenDown = Submission::factory()->takenDown()->create(['class_id' => $class->id, 'public_id' => 'MF-TDTEST']);

        $response = $this->actingAs($user)->postJson("/admin/classes/{$class->id}/approved/bulk-render", [
            'submission_ids' => [$approved->id, $takenDown->id],
            'format'         => 'story',
        ]);

        // taken_down item is skipped; approved item still renders → 200 ZIP
        $response->assertStatus(200);
        $response->assertHeader('Content-Type', 'application/zip');
    }

    public function test_foreign_class_id_rejected(): void
    {
        [$user, $class] = $this->makeAdmin();
        $otherClass = ClassWorkspace::factory()->create();
        $foreignSub = Submission::factory()->approved($user)->create(['class_id' => $otherClass->id]);

        $response = $this->actingAs($user)->postJson("/admin/classes/{$class->id}/approved/bulk-render", [
            'submission_ids' => [$foreignSub->id],
            'format'         => 'story',
        ]);

        $response->assertStatus(422);
    }

    public function test_non_approved_item_excluded(): void
    {
        [$user, $class] = $this->makeAdmin();
        $pending = Submission::factory()->create(['class_id' => $class->id, 'status' => SubmissionStatus::Submitted]);

        $response = $this->actingAs($user)->postJson("/admin/classes/{$class->id}/approved/bulk-render", [
            'submission_ids' => [$pending->id],
            'format'         => 'story',
        ]);

        $response->assertStatus(422);
    }
}
