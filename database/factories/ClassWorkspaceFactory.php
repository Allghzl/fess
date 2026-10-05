<?php

namespace Database\Factories;

use App\Models\ClassWorkspace;
use Illuminate\Database\Eloquent\Factories\Factory;
use Illuminate\Support\Str;

/**
 * @extends Factory<ClassWorkspace>
 */
class ClassWorkspaceFactory extends Factory
{
    protected $model = ClassWorkspace::class;

    public function definition(): array
    {
        $name = fake()->words(3, true);
        return [
            'name'             => ucwords($name),
            'slug'             => Str::slug($name) . '-' . Str::random(4),
            'short_code'       => strtoupper(Str::random(6)),
            'instagram_handle' => null,
            'logo_asset_key'   => null,
            'website_label'    => null,
            'is_active'        => true,
            'settings'         => [
                'default_render' => [
                    'show_logo'        => true,
                    'show_website_url' => true,
                    'template_key'     => 'pastel-grid',
                    'background_color' => '#F5DCE8',
                    'pattern_key'      => 'dots',
                    'pattern_color'    => '#FFFFFF',
                    'pattern_opacity'  => 0.35,
                ],
            ],
        ];
    }
}
