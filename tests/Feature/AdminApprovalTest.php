<?php

namespace Tests\Feature;

use App\Models\ClassWorkspace;
use App\Models\Submission;
use App\Models\User;
use App\Support\SubmissionStatus;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class AdminApprovalTest extends TestCase
{
    use RefreshDatabase;

    private function makeAdmin(): array
    {
        $user  = User::factory()->create();
        $class = ClassWorkspace::factory()->create();
        $class->members()->attach($user, ['role' => 'admin']);
        return [$user, $class];
    }

    public function test_approve_sets_status_and_public_id(): void
    {
        [$user, $class] = $this->makeAdmin();
        $submission = Submission::factory()->create(['class_id' => $class->id]);

        $this->actingAs($user)
            ->post("/admin/classes/{$class->id}/submissions/{$submission->id}/approve")
            ->assertRedirect();

        $submission->refresh();
        $this->assertEquals(SubmissionStatus::Approved, $submission->status);
        $this->assertNotNull($submission->public_id);
        $this->assertMatchesRegularExpression('/^MF-[ABCDEFGHJKMNPQRSTUVWXYZ23456789]{6}$/', $submission->public_id);
    }

    public function test_approve_redirects_to_approved_detail(): void
    {
        [$user, $class] = $this->makeAdmin();
        $submission = Submission::factory()->create(['class_id' => $class->id]);

        $response = $this->actingAs($user)
            ->post("/admin/classes/{$class->id}/submissions/{$submission->id}/approve");

        $submission->refresh();
        $response->assertRedirect("/admin/classes/{$class->id}/approved/{$submission->id}");
    }

    public function test_repeat_approve_is_stable(): void
    {
        [$user, $class] = $this->makeAdmin();
        $submission = Submission::factory()->create(['class_id' => $class->id]);

        $this->actingAs($user)->post("/admin/classes/{$class->id}/submissions/{$submission->id}/approve");
        $firstId = $submission->fresh()->public_id;

        $this->actingAs($user)->post("/admin/classes/{$class->id}/submissions/{$submission->id}/approve");
        $secondId = $submission->fresh()->public_id;

        $this->assertEquals($firstId, $secondId);
    }

    public function test_reject_works_and_records_actor(): void
    {
        [$user, $class] = $this->makeAdmin();
        $submission = Submission::factory()->create(['class_id' => $class->id]);

        $this->actingAs($user)
            ->post("/admin/classes/{$class->id}/submissions/{$submission->id}/reject", [
                'rejection_reason' => 'Not appropriate',
            ])
            ->assertRedirect();

        $submission->refresh();
        $this->assertEquals(SubmissionStatus::Rejected, $submission->status);
        $this->assertEquals($user->id, $submission->rejected_by);
        $this->assertNotNull($submission->rejected_at);
        $this->assertNull($submission->public_id);
    }

    public function test_cross_class_approve_blocked(): void
    {
        [$user,] = $this->makeAdmin();
        $otherClass = ClassWorkspace::factory()->create();
        $submission = Submission::factory()->create(['class_id' => $otherClass->id]);

        $this->actingAs($user)
            ->post("/admin/classes/{$otherClass->id}/submissions/{$submission->id}/approve")
            ->assertForbidden();
    }

    public function test_cross_class_id_in_url_blocked(): void
    {
        [$user, $class] = $this->makeAdmin();
        $otherClass = ClassWorkspace::factory()->create();
        $otherClass->members()->attach($user, ['role' => 'admin']); // user is in both, but submission belongs to otherClass
        $submission = Submission::factory()->create(['class_id' => $otherClass->id]);

        // Try to approve otherClass submission via $class URL → 404
        $this->actingAs($user)
            ->post("/admin/classes/{$class->id}/submissions/{$submission->id}/approve")
            ->assertNotFound();
    }
}
