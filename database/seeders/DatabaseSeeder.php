<?php

namespace Database\Seeders;

use App\Models\ClassWorkspace;
use App\Models\Submission;
use App\Models\User;
use App\Support\SubmissionStatus;
use Illuminate\Database\Seeder;
use Illuminate\Support\Str;

class DatabaseSeeder extends Seeder
{
    public function run(): void
    {
        $user = User::factory()->create([
            'pinat_puid' => 'puid_demo_user_001',
            'name'       => 'Demo Admin',
            'email'      => 'demo@pinatmenfess.test',
        ]);

        $class = ClassWorkspace::factory()->create([
            'name'       => 'XII RPL 1',
            'slug'       => 'xii-rpl-1',
            'short_code' => 'XIIRPL1',
        ]);

        $class->members()->attach($user, ['role' => 'owner']);

        // Several submissions across statuses
        Submission::factory()->count(3)->create(['class_id' => $class->id]);
        Submission::factory()->underReview()->count(2)->create(['class_id' => $class->id]);
        Submission::factory()->approved($user)->count(4)->create(['class_id' => $class->id]);
        Submission::factory()->rejected($user)->count(2)->create(['class_id' => $class->id]);
    }
}
