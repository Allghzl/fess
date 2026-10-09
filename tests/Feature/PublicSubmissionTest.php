<?php

namespace Tests\Feature;

use App\Models\ClassWorkspace;
use App\Models\User;
use App\Support\SubmissionStatus;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class PublicSubmissionTest extends TestCase
{
    use RefreshDatabase;

    public function test_active_base_page_loads(): void
    {
        $class = ClassWorkspace::factory()->create(['is_active' => true]);

        $this->get("/b/{$class->slug}")
             ->assertOk()
             ->assertInertia(fn ($page) => $page->component('Public/BasePage'));
    }

    public function test_inactive_base_returns_404(): void
    {
        $class = ClassWorkspace::factory()->create(['is_active' => false]);

        $this->get("/b/{$class->slug}")->assertRedirect('/');
    }

    public function test_unauthenticated_submit_form_loads(): void
    {
        $class = ClassWorkspace::factory()->create(['is_active' => true]);

        $this->get("/b/{$class->slug}/submit")
             ->assertOk()
             ->assertInertia(fn ($page) => $page->component('Public/SubmitForm'));
    }

    public function test_authenticated_submit_form_loads(): void
    {
        $user  = User::factory()->create();
        $class = ClassWorkspace::factory()->create(['is_active' => true]);

        $this->actingAs($user)
             ->get("/b/{$class->slug}/submit")
             ->assertOk()
             ->assertInertia(fn ($page) => $page->component('Public/SubmitForm'));
    }

    public function test_valid_authenticated_submission_created(): void
    {
        $user  = User::factory()->create();
        $class = ClassWorkspace::factory()->create(['is_active' => true]);

        $this->actingAs($user)
             ->post("/b/{$class->slug}/submit", [
                 'message' => 'Halo semua, ini pesan dari saya!',
                 'consent' => true,
             ])->assertRedirect("/b/{$class->slug}/submitted");

        $this->assertDatabaseHas('submissions', [
            'class_id'         => $class->id,
            'original_message' => 'Halo semua, ini pesan dari saya!',
            'status'           => SubmissionStatus::Submitted->value,
            'public_id'        => null,
        ]);
    }

    public function test_unauthenticated_can_submit(): void
    {
        $class = ClassWorkspace::factory()->create(['is_active' => true]);

        $this->post("/b/{$class->slug}/submit", [
            'message' => 'Halo semua, ini pesan dari saya!',
            'consent' => true,
        ])->assertRedirect("/b/{$class->slug}/submitted");
    }

    public function test_message_too_short(): void
    {
        $user  = User::factory()->create();
        $class = ClassWorkspace::factory()->create(['is_active' => true]);

        $this->actingAs($user)
             ->post("/b/{$class->slug}/submit", ['message' => 'ab', 'consent' => true])
             ->assertSessionHasErrors(['message']);
    }

    public function test_message_too_long(): void
    {
        $user  = User::factory()->create();
        $class = ClassWorkspace::factory()->create(['is_active' => true]);

        $this->actingAs($user)
             ->post("/b/{$class->slug}/submit", [
                 'message' => str_repeat('a', 2001),
                 'consent' => true,
             ])->assertSessionHasErrors(['message']);
    }

    public function test_success_page_loads(): void
    {
        $class = ClassWorkspace::factory()->create(['is_active' => true]);

        $this->get("/b/{$class->slug}/submitted")
             ->assertOk()
             ->assertInertia(fn ($page) => $page->component('Public/SubmitSuccess')
                 ->where('base_name', $class->name)
                 ->where('base_slug', $class->slug));
    }

    public function test_legacy_c_slug_redirects_to_b_slug(): void
    {
        $class = ClassWorkspace::factory()->create(['is_active' => true]);

        $this->get("/c/{$class->slug}")
             ->assertRedirect("/b/{$class->slug}");
    }
}
