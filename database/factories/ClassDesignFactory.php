<?php

namespace Database\Factories;

use App\Models\ClassDesign;
use App\Models\ClassWorkspace;
use App\Models\User;
use App\Support\DesignFormat;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<ClassDesign>
 */
class ClassDesignFactory extends Factory
{
    protected $model = ClassDesign::class;

    public function definition(): array
    {
        return [
            'class_id'          => ClassWorkspace::factory(),
            'name'              => fake()->words(2, true),
            'format'            => DesignFormat::Story->value,
            'slot_index'        => 1,
            'source_asset_key'  => 'classes/test/designs/test/source.jpg',
            'source_width'      => 1080,
            'source_height'     => 1920,
            'crop_x'            => 0,
            'crop_y'            => 0,
            'crop_width'        => 1080,
            'crop_height'       => 1920,
            'focal_x'           => 0.5,
            'focal_y'           => 0.5,
            'feed_fallback_crop'=> null,
            'active'            => true,
            'created_by'        => User::factory(),
        ];
    }
}
