<?php

namespace Tests\Feature;

use App\Models\ClassWorkspace;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class AdminSettingsTest extends TestCase
{
    use RefreshDatabase;

    private function makeAdmin(): array
    {
        $user  = User::factory()->create();
        $class = ClassWorkspace::factory()->create();
        $class->members()->attach($user, ['role' => 'admin']);
        return [$user, $class];
    }

    public function test_admin_can_view_settings(): void
    {
        [$user, $class] = $this->makeAdmin();

        $this->actingAs($user)->get("/admin/classes/{$class->id}/settings")->assertOk();
    }

    public function test_admin_can_update_settings(): void
    {
        [$user, $class] = $this->makeAdmin();

        $this->actingAs($user)->patch("/admin/classes/{$class->id}/settings", [
            'name'                     => 'Updated Name',
            'short_code'               => 'UPD001',
            'default_show_logo'        => true,
            'default_show_website_url' => false,
            'default_preset'           => 'bold_block',
            'default_background_color' => '#FF5A36',
            'default_pattern_key'      => 'dots',
            'default_pattern_color'    => '#FFFFFF',
            'default_pattern_opacity'  => 0.06,
        ])->assertRedirect();

        $class->refresh();
        $this->assertEquals('Updated Name', $class->name);
        $this->assertEquals('bold_block', $class->settings['default_render']['preset']);
        $this->assertFalse($class->settings['default_render']['show_website_url']);
    }

    public function test_other_class_settings_blocked(): void
    {
        [$user,] = $this->makeAdmin();
        $otherClass = ClassWorkspace::factory()->create();

        $this->actingAs($user)->get("/admin/classes/{$otherClass->id}/settings")->assertForbidden();
    }

    public function test_other_class_settings_update_blocked(): void
    {
        [$user,] = $this->makeAdmin();
        $otherClass = ClassWorkspace::factory()->create();

        $this->actingAs($user)->patch("/admin/classes/{$otherClass->id}/settings", [
            'name'       => 'Hacked',
            'short_code' => 'HACK',
        ])->assertForbidden();
    }
}
