<?php

namespace App\Actions\Submissions;

use App\Models\Submission;
use App\Models\User;
use App\Support\SubmissionStatus;
use Illuminate\Auth\Access\AuthorizationException;

class RejectSubmission
{
    public function execute(User $actor, Submission $submission, string $reason = ''): Submission
    {
        if (!$actor->isMemberOf($submission->classWorkspace)) {
            throw new AuthorizationException('Actor does not belong to this class.');
        }

        $submission->status      = SubmissionStatus::Rejected;
        $submission->rejection_reason = $reason ?: null;
        $submission->rejected_at = now();
        $submission->rejected_by = $actor->id;
        // public_id intentionally never set here
        $submission->save();

        return $submission;
    }
}
