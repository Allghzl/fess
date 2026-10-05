<?php

namespace App\Actions\Submissions;

use App\Models\Submission;
use App\Models\User;
use App\Services\PublicIdGenerator;
use App\Support\SubmissionStatus;
use Illuminate\Auth\Access\AuthorizationException;
use Illuminate\Support\Facades\DB;
use RuntimeException;

class ApproveSubmission
{
    public function __construct(private PublicIdGenerator $idGen) {}

    public function execute(User $actor, Submission $submission): Submission
    {
        return DB::transaction(function () use ($actor, $submission) {
            /** @var Submission $submission */
            $submission = Submission::lockForUpdate()->findOrFail($submission->id);

            // Authorization: actor must belong to submission's class
            if (!$actor->isMemberOf($submission->classWorkspace)) {
                throw new AuthorizationException('Actor does not belong to this class.');
            }

            // Idempotent
            if ($submission->status === SubmissionStatus::Approved) {
                return $submission;
            }

            if (in_array($submission->status, [
                SubmissionStatus::Rejected,
                SubmissionStatus::TakenDown,
            ])) {
                throw new RuntimeException("Cannot approve submission in status: {$submission->status->value}");
            }

            $submission->moderated_message ??= $submission->original_message;
            $submission->public_id          = $this->idGen->generate();
            $submission->status             = SubmissionStatus::Approved;
            $submission->approved_at        = now();
            $submission->approved_by        = $actor->id;
            $submission->save();

            return $submission;
        });
    }
}
