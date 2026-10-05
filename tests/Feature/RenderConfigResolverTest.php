<?php

namespace Tests\Feature;

use App\Models\ClassWorkspace;
use App\Services\RenderConfigResolver;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class RenderConfigResolverTest extends TestCase
{
    use RefreshDatabase;

    private function makeClass(array $defaultRender = []): ClassWorkspace
    {
        return ClassWorkspace::factory()->create([
            'settings' => ['default_render' => $defaultRender],
        ]);
    }

    public function test_class_default_used_when_no_overrides(): void
    {
        $class    = $this->makeClass(['preset' => 'bold_block', 'show_logo' => false]);
        $resolver = app(RenderConfigResolver::class);
        $result   = $resolver->resolve($class, null, null);

        $this->assertSame(false, $result['show_logo']);
        $this->assertSame('bold_block', $result['design']['preset']);
    }

    public function test_bulk_override_replaces_class_default(): void
    {
        $class    = $this->makeClass(['show_logo' => false, 'show_website_url' => false]);
        $resolver = app(RenderConfigResolver::class);

        $bulk   = ['show_logo' => true, 'show_website_url' => true];
        $result = $resolver->resolve($class, $bulk, null);

        $this->assertSame(true, $result['show_logo']);
        $this->assertSame(true, $result['show_website_url']);
    }

    public function test_item_override_replaces_bulk_override(): void
    {
        $class    = $this->makeClass(['show_logo' => false]);
        $resolver = app(RenderConfigResolver::class);

        $bulk   = ['show_logo' => true, 'format' => 'story'];
        $item   = ['show_logo' => false, 'format' => 'feed_portrait'];
        $result = $resolver->resolve($class, $bulk, $item);

        $this->assertSame(false, $result['show_logo']);
        $this->assertSame('feed_portrait', $result['format']);
    }

    public function test_show_public_id_always_true_regardless_of_config(): void
    {
        $class    = $this->makeClass([]);
        $resolver = app(RenderConfigResolver::class);

        $result = $resolver->resolve($class, ['show_public_id' => false], ['show_public_id' => false]);
        $this->assertTrue($result['show_public_id']);
    }
}
