<?php

namespace Tests\Feature;

use App\Actions\Submissions\ApproveSubmission;
use App\Actions\Submissions\RejectSubmission;
use App\Models\ClassWorkspace;
use App\Models\Submission;
use App\Models\User;
use App\Services\PublicIdGenerator;
use App\Support\SubmissionStatus;
use Illuminate\Auth\Access\AuthorizationException;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class ApprovalTest extends TestCase
{
    use RefreshDatabase;

    private function makeActorInClass(): array
    {
        $user  = User::factory()->create();
        $class = ClassWorkspace::factory()->create();
        $class->members()->attach($user, ['role' => 'admin']);
        $submission = Submission::factory()->create(['class_id' => $class->id]);
        return [$user, $class, $submission];
    }

    public function test_pending_to_approved(): void
    {
        [$user,, $submission] = $this->makeActorInClass();
        $action = new ApproveSubmission(new PublicIdGenerator());
        $result = $action->execute($user, $submission);

        $this->assertEquals(SubmissionStatus::Approved, $result->status);
    }

    public function test_public_id_assigned_on_approval(): void
    {
        [$user,, $submission] = $this->makeActorInClass();
        $action = new ApproveSubmission(new PublicIdGenerator());
        $result = $action->execute($user, $submission);

        $this->assertNotNull($result->public_id);
        $this->assertMatchesRegularExpression('/^MF-[ABCDEFGHJKMNPQRSTUVWXYZ23456789]{6}$/', $result->public_id);
    }

    public function test_no_public_id_before_approval(): void
    {
        [,, $submission] = $this->makeActorInClass();
        $this->assertNull($submission->public_id);
    }

    public function test_approved_by_and_approved_at_captured(): void
    {
        [$user,, $submission] = $this->makeActorInClass();
        $action = new ApproveSubmission(new PublicIdGenerator());
        $result = $action->execute($user, $submission);

        $this->assertEquals($user->id, $result->approved_by);
        $this->assertNotNull($result->approved_at);
    }

    public function test_repeated_approval_is_idempotent(): void
    {
        [$user,, $submission] = $this->makeActorInClass();
        $action  = new ApproveSubmission(new PublicIdGenerator());
        $first   = $action->execute($user, $submission);
        $second  = $action->execute($user, $submission->fresh());

        $this->assertEquals($first->public_id, $second->public_id);
        $this->assertEquals(SubmissionStatus::Approved, $second->status);
    }

    public function test_cross_class_admin_blocked(): void
    {
        $this->expectException(AuthorizationException::class);

        $outsider = User::factory()->create();
        $classB   = ClassWorkspace::factory()->create();
        // outsider is NOT a member of classB
        $submission = Submission::factory()->create(['class_id' => $classB->id]);

        (new ApproveSubmission(new PublicIdGenerator()))->execute($outsider, $submission);
    }

    public function test_reject_sets_status_and_no_public_id(): void
    {
        [$user,, $submission] = $this->makeActorInClass();
        $action = new RejectSubmission();
        $result = $action->execute($user, $submission, 'Not appropriate');

        $this->assertEquals(SubmissionStatus::Rejected, $result->status);
        $this->assertNull($result->public_id);
        $this->assertEquals('Not appropriate', $result->rejection_reason);
    }

    public function test_reject_captures_actor_and_timestamp(): void
    {
        [$user,, $submission] = $this->makeActorInClass();
        $result = (new RejectSubmission())->execute($user, $submission);

        $this->assertEquals($user->id, $result->rejected_by);
        $this->assertNotNull($result->rejected_at);
    }
}
