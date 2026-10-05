<?php

namespace Tests\Feature;

use App\Models\ClassWorkspace;
use App\Models\Submission;
use App\Models\TakedownRequest;
use App\Models\User;
use App\Support\SubmissionStatus;
use App\Support\TakedownStatus;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class AdminTakedownTest extends TestCase
{
    use RefreshDatabase;

    private function makeAdminWithTakedown(): array
    {
        $user  = User::factory()->create();
        $class = ClassWorkspace::factory()->create();
        $class->members()->attach($user, ['role' => 'admin']);

        $submission = Submission::factory()->approved($user)->create(['class_id' => $class->id]);
        $takedown   = TakedownRequest::factory()->create([
            'class_id'      => $class->id,
            'submission_id' => $submission->id,
        ]);

        return [$user, $class, $submission, $takedown];
    }

    public function test_admin_sees_own_takedown_queue(): void
    {
        [$user, $class,,] = $this->makeAdminWithTakedown();

        $this->actingAs($user)
            ->get("/admin/classes/{$class->id}/takedowns")
            ->assertOk()
            ->assertInertia(fn ($page) => $page->has('requests.data', 1));
    }

    public function test_other_class_queue_blocked(): void
    {
        [$user,,,] = $this->makeAdminWithTakedown();
        $otherClass = ClassWorkspace::factory()->create();

        $this->actingAs($user)
            ->get("/admin/classes/{$otherClass->id}/takedowns")
            ->assertForbidden();
    }

    public function test_approve_takedown_marks_submission_taken_down(): void
    {
        [$user, $class, $submission, $takedown] = $this->makeAdminWithTakedown();

        $this->actingAs($user)
            ->post("/admin/classes/{$class->id}/takedowns/{$takedown->id}/approve", [
                'admin_note' => 'Confirmed valid takedown',
            ])
            ->assertRedirect();

        $submission->refresh();
        $this->assertEquals(SubmissionStatus::TakenDown, $submission->status);

        $takedown->refresh();
        $this->assertEquals(TakedownStatus::Approved, $takedown->status);
        $this->assertEquals($user->id, $takedown->handled_by);
    }

    public function test_public_id_unchanged_after_takedown(): void
    {
        [$user, $class, $submission, $takedown] = $this->makeAdminWithTakedown();
        $originalPublicId = $submission->public_id;

        $this->actingAs($user)
            ->post("/admin/classes/{$class->id}/takedowns/{$takedown->id}/approve");

        $submission->refresh();
        $this->assertEquals($originalPublicId, $submission->public_id);
    }

    public function test_reject_takedown_leaves_submission_approved(): void
    {
        [$user, $class, $submission, $takedown] = $this->makeAdminWithTakedown();

        $this->actingAs($user)
            ->post("/admin/classes/{$class->id}/takedowns/{$takedown->id}/reject", [
                'admin_note' => 'Not valid',
            ])
            ->assertRedirect();

        $submission->refresh();
        $this->assertEquals(SubmissionStatus::Approved, $submission->status);

        $takedown->refresh();
        $this->assertEquals(TakedownStatus::Rejected, $takedown->status);
    }

    public function test_cross_class_takedown_blocked(): void
    {
        [$user,,,] = $this->makeAdminWithTakedown();
        $otherClass = ClassWorkspace::factory()->create();
        $otherSub   = Submission::factory()->approved($user)->create(['class_id' => $otherClass->id]);
        $otherTd    = TakedownRequest::factory()->create([
            'class_id'      => $otherClass->id,
            'submission_id' => $otherSub->id,
        ]);

        $this->actingAs($user)
            ->get("/admin/classes/{$otherClass->id}/takedowns/{$otherTd->id}")
            ->assertForbidden();
    }
}
