<?php

namespace Database\Factories;

use App\Models\ClassWorkspace;
use App\Models\Submission;
use App\Models\TakedownRequest;
use App\Models\User;
use App\Support\TakedownStatus;
use Illuminate\Database\Eloquent\Factories\Factory;
use Illuminate\Support\Str;

/**
 * @extends Factory<TakedownRequest>
 */
class TakedownRequestFactory extends Factory
{
    protected $model = TakedownRequest::class;

    public function definition(): array
    {
        return [
            'submission_id'      => Submission::factory()->approved(),
            'class_id'           => ClassWorkspace::factory(),
            'public_id_snapshot' => 'MF-' . strtoupper(Str::random(6)),
            'reason_code'        => fake()->randomElement(['defamation', 'privacy', 'harassment', 'other']),
            'reason_text'        => fake()->paragraph(),
            'contact'            => fake()->optional()->email(),
            'evidence_asset_key' => null,
            'status'             => TakedownStatus::Pending,
            'handled_by'         => null,
            'handled_at'         => null,
            'admin_note'         => null,
        ];
    }
}
