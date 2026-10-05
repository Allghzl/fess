<?php

namespace Tests\Feature;

use App\Models\ClassWorkspace;
use App\Models\Submission;
use App\Models\User;
use App\Support\SubmissionStatus;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class AdminInboxTest extends TestCase
{
    use RefreshDatabase;

    private function makeAdmin(): array
    {
        $user  = User::factory()->create();
        $class = ClassWorkspace::factory()->create();
        $class->members()->attach($user, ['role' => 'admin']);
        return [$user, $class];
    }

    public function test_admin_sees_own_class_submissions(): void
    {
        [$user, $class] = $this->makeAdmin();
        Submission::factory()->count(3)->create(['class_id' => $class->id]);

        $response = $this->actingAs($user)->get("/admin/classes/{$class->id}/submissions");

        $response->assertOk();
        $response->assertInertia(fn ($page) => $page->has('submissions.data', 3));
    }

    public function test_cross_class_submission_is_hidden(): void
    {
        [$user, $class] = $this->makeAdmin();

        $otherClass = ClassWorkspace::factory()->create();
        Submission::factory()->count(2)->create(['class_id' => $otherClass->id]);

        $response = $this->actingAs($user)->get("/admin/classes/{$class->id}/submissions");

        $response->assertOk();
        $response->assertInertia(fn ($page) => $page->has('submissions.data', 0));
    }

    public function test_unauthenticated_redirected(): void
    {
        $class = ClassWorkspace::factory()->create();
        $this->get("/admin/classes/{$class->id}/submissions")->assertRedirect('/auth/login');
    }

    public function test_non_member_gets_403(): void
    {
        $outsider = User::factory()->create();
        $class    = ClassWorkspace::factory()->create();

        $this->actingAs($outsider)->get("/admin/classes/{$class->id}/submissions")->assertForbidden();
    }

    public function test_filter_by_status(): void
    {
        [$user, $class] = $this->makeAdmin();
        Submission::factory()->create(['class_id' => $class->id, 'status' => SubmissionStatus::Submitted]);
        Submission::factory()->approved()->create(['class_id' => $class->id]);

        $response = $this->actingAs($user)->get("/admin/classes/{$class->id}/submissions?status=approved");

        $response->assertOk();
        $response->assertInertia(fn ($page) => $page->has('submissions.data', 1));
    }

    public function test_filter_by_search(): void
    {
        [$user, $class] = $this->makeAdmin();
        Submission::factory()->create(['class_id' => $class->id, 'original_message' => 'unique-search-term-xyz']);
        Submission::factory()->create(['class_id' => $class->id, 'original_message' => 'something else entirely']);

        // Both are submitted so default filter shows them — search narrows
        $response = $this->actingAs($user)->get("/admin/classes/{$class->id}/submissions?status=all&search=unique-search-term-xyz");

        $response->assertOk();
        $response->assertInertia(fn ($page) => $page->has('submissions.data', 1));
    }
}
