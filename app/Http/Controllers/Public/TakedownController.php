<?php

namespace App\Http\Controllers\Public;

use App\Http\Controllers\Controller;
use App\Http\Requests\StoreTakedownRequest;
use App\Models\Submission;
use App\Models\TakedownRequest;
use App\Services\PublicIdGenerator;
use App\Support\SubmissionStatus;
use App\Support\TakedownStatus;
use Illuminate\Http\RedirectResponse;
use Inertia\Inertia;
use Inertia\Response;

class TakedownController extends Controller
{
    /**
     * Show the public takedown request form.
     *
     * @summary Show Takedown Form
     * @tags Takedown
     * @unauthenticated
     */
    public function show(): Response
    {
        return Inertia::render('Public/Takedown', [
            'id_prefix' => config('menfess.public_id_prefix', 'MF'),
        ]);
    }

    /**
     * Submit a public takedown request.
     *
     * Looks up an approved submission by its public ID (e.g. `MF-K7X4QM`).
     * Creates a takedown request without changing the submission's status —
     * the submission remains `approved` until an admin processes the request.
     * Rate limited. Duplicate active requests for the same public ID are rejected.
     *
     * @summary Request Content Takedown
     * @tags Takedown
     * @unauthenticated
     */
    public function store(StoreTakedownRequest $request, PublicIdGenerator $generator): Response|RedirectResponse
    {
        $data       = $request->validated();
        $normalizedId = $generator->normalize($data['public_id']);

        $visibleStatuses = [
            SubmissionStatus::Approved->value,
            SubmissionStatus::TakenDown->value,
        ];

        $submission = Submission::where('public_id', $normalizedId)
            ->whereIn('status', $visibleStatuses)
            ->first();

        if (! $submission) {
            return back()->withErrors([
                'public_id' => 'ID tidak ditemukan. Periksa ID pada gambar/post.',
            ])->withInput();
        }

        // Duplicate active request guard
        $exists = TakedownRequest::where('submission_id', $submission->id)
            ->whereIn('status', [TakedownStatus::Pending->value, TakedownStatus::Reviewing->value])
            ->exists();

        if ($exists) {
            return back()->withErrors([
                'public_id' => 'Permintaan takedown untuk ID ini sudah kami terima dan sedang diproses.',
            ])->withInput();
        }

        TakedownRequest::create([
            'submission_id'      => $submission->id,
            'class_id'           => $submission->class_id,
            'public_id_snapshot' => $normalizedId,
            'reason_code'        => $data['reason_code'],
            'reason_text'        => strip_tags($data['reason_text']),
            'contact'            => isset($data['contact']) ? strip_tags($data['contact']) : null,
            'status'             => TakedownStatus::Pending,
        ]);

        // submission.status stays 'approved' until admin processes the takedown request
        return redirect()->route('public.takedown.success', ['public_id' => $normalizedId]);
    }

    public function success(string $publicId): Response
    {
        return Inertia::render('Public/TakedownSuccess', [
            'publicId' => $publicId,
        ]);
    }
}
