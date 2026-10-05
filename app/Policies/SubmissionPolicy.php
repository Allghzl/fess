<?php

namespace App\Policies;

use App\Models\Submission;
use App\Models\User;

class SubmissionPolicy
{
    public function view(User $user, Submission $submission): bool
    {
        return $user->isMemberOf($submission->classWorkspace);
    }

    public function update(User $user, Submission $submission): bool
    {
        return $user->isMemberOf($submission->classWorkspace);
    }

    public function approve(User $user, Submission $submission): bool
    {
        return $user->isMemberOf($submission->classWorkspace);
    }

    public function reject(User $user, Submission $submission): bool
    {
        return $user->isMemberOf($submission->classWorkspace);
    }

    public function delete(User $user, Submission $submission): bool
    {
        return $user->isMemberOf($submission->classWorkspace);
    }
}
