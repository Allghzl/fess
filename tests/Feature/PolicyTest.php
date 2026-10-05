<?php

namespace Tests\Feature;

use App\Models\ClassWorkspace;
use App\Models\Submission;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class PolicyTest extends TestCase
{
    use RefreshDatabase;

    private function actingAsMemberOf(ClassWorkspace $class, string $role = 'admin'): User
    {
        $user = User::factory()->create();
        $class->members()->attach($user, ['role' => $role]);
        return $user;
    }

    public function test_class_a_admin_cannot_read_class_b_submission(): void
    {
        $classA = ClassWorkspace::factory()->create();
        $classB = ClassWorkspace::factory()->create();

        $adminA     = $this->actingAsMemberOf($classA);
        $submissionB = Submission::factory()->create(['class_id' => $classB->id]);

        $this->actingAs($adminA);
        $this->assertFalse($adminA->can('view', $submissionB));
    }

    public function test_class_a_admin_cannot_approve_class_b_submission(): void
    {
        $classA = ClassWorkspace::factory()->create();
        $classB = ClassWorkspace::factory()->create();

        $adminA      = $this->actingAsMemberOf($classA);
        $submissionB = Submission::factory()->create(['class_id' => $classB->id]);

        $this->actingAs($adminA);
        $this->assertFalse($adminA->can('approve', $submissionB));
    }

    public function test_class_member_can_view_own_class_submission(): void
    {
        $class      = ClassWorkspace::factory()->create();
        $admin      = $this->actingAsMemberOf($class);
        $submission = Submission::factory()->create(['class_id' => $class->id]);

        $this->actingAs($admin);
        $this->assertTrue($admin->can('view', $submission));
    }

    public function test_class_member_can_approve_own_class_submission(): void
    {
        $class      = ClassWorkspace::factory()->create();
        $admin      = $this->actingAsMemberOf($class);
        $submission = Submission::factory()->create(['class_id' => $class->id]);

        $this->actingAs($admin);
        $this->assertTrue($admin->can('approve', $submission));
    }
}
