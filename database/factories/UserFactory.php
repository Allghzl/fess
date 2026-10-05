<?php

namespace Database\Factories;

use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;
use Illuminate\Support\Str;

/**
 * @extends Factory<User>
 */
class UserFactory extends Factory
{
    protected $model = User::class;

    public function definition(): array
    {
        return [
            'pinat_puid'     => 'puid_' . Str::random(16),
            'name'           => fake()->name(),
            'email'          => fake()->unique()->safeEmail(),
            'avatar_key'     => null,
            'last_synced_at' => now(),
        ];
    }
}
