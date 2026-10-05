<?php

namespace Database\Factories;

use App\Models\ClassWorkspace;
use App\Models\Submission;
use App\Models\User;
use App\Services\PublicIdGenerator;
use App\Support\SubmissionStatus;
use Illuminate\Database\Eloquent\Factories\Factory;
use Illuminate\Support\Str;

/**
 * @extends Factory<Submission>
 */
class SubmissionFactory extends Factory
{
    protected $model = Submission::class;

    public function definition(): array
    {
        return [
            'class_id'         => ClassWorkspace::factory(),
            'public_id'        => null,
            'original_message' => fake()->paragraph(),
            'moderated_message' => null,
            'target_text'      => fake()->optional()->firstName(),
            'alias_text'       => fake()->optional()->firstName(),
            'category'         => fake()->optional()->word(),
            'status'           => SubmissionStatus::Submitted,
            'rejection_reason' => null,
            'internal_note'    => null,
            'approved_at'      => null,
            'approved_by'      => null,
            'rejected_at'      => null,
            'rejected_by'      => null,
            'posted_at'        => null,
        ];
    }

    public function approved(?User $approver = null): static
    {
        return $this->state(function () use ($approver) {
            $idGen = new PublicIdGenerator();
            return [
                'status'           => SubmissionStatus::Approved,
                'public_id'        => $idGen->generate(),
                'moderated_message' => fake()->paragraph(),
                'approved_at'      => now(),
                'approved_by'      => $approver?->id ?? User::factory(),
            ];
        });
    }

    public function rejected(?User $rejector = null): static
    {
        return $this->state(function () use ($rejector) {
            return [
                'status'           => SubmissionStatus::Rejected,
                'public_id'        => null,
                'rejection_reason' => fake()->sentence(),
                'rejected_at'      => now(),
                'rejected_by'      => $rejector?->id ?? User::factory(),
            ];
        });
    }

    public function underReview(): static
    {
        return $this->state(['status' => SubmissionStatus::UnderReview]);
    }

    public function takenDown(): static
    {
        return $this->state(['status' => SubmissionStatus::TakenDown]);
    }
}
