<?php

namespace App\Http\Controllers\Admin;

use App\Actions\Submissions\ApproveSubmission;
use App\Actions\Submissions\RejectSubmission;
use App\Http\Controllers\Controller;
use App\Models\ClassWorkspace;
use App\Models\Submission;
use App\Support\SubmissionStatus;
use Illuminate\Http\Request;
use Inertia\Inertia;

class SubmissionController extends Controller
{
    public function __construct(
        private ApproveSubmission $approveAction,
        private RejectSubmission  $rejectAction,
    ) {}

    /**
     * List submissions in the inbox.
     *
     * Returns paginated submissions for the base. Defaults to pending
     * (`submitted` + `under_review`). Supports filtering by status, category,
     * free-text search, sort order, and unread-only. Each submission includes
     * `is_read` (whether the current admin has read it) and `read_by_count`
     * (how many distinct admins have opened it).
     *
     * @summary List Inbox Submissions
     * @tags Moderation
     */
    public function index(Request $request, ClassWorkspace $class)
    {
        $this->authorize('view', $class);

        $query = $class->submissions()
            ->orderBy('created_at', $request->input('sort', 'asc')); // oldest first by default for inbox

        // Default: submitted + under_review
        $status = $request->input('status', 'pending');
        if ($status === 'pending') {
            $query->whereIn('status', [SubmissionStatus::Submitted->value, SubmissionStatus::UnderReview->value]);
        } elseif ($status !== 'all') {
            $query->where('status', $status);
        }

        if ($category = $request->input('category')) {
            $query->where('category', $category);
        }

        if ($search = $request->input('search')) {
            $query->where('original_message', 'like', '%' . $search . '%');
        }

        // Unread only filter
        if ($request->boolean('unread_only')) {
            $readIds = \App\Models\SubmissionRead::where('user_id', $request->user()->id)
                ->pluck('submission_id');
            $query->whereNotIn('id', $readIds);
        }

        $user = $request->user();

        $submissions = $query->paginate(30)->withQueryString();

        // Attach read info per submission for this user
        $submissionIds = $submissions->pluck('id');
        $readIds = \App\Models\SubmissionRead::whereIn('submission_id', $submissionIds)
            ->where('user_id', $user->id)
            ->pluck('submission_id')
            ->flip();

        // Per-submission reader count (how many distinct admins read it)
        $readerCounts = \App\Models\SubmissionRead::whereIn('submission_id', $submissionIds)
            ->selectRaw('submission_id, count(*) as cnt')
            ->groupBy('submission_id')
            ->pluck('cnt', 'submission_id');

        $submissions->through(function ($sub) use ($readIds, $readerCounts) {
            $sub->is_read        = $readIds->has($sub->id);
            $sub->read_by_count  = (int) ($readerCounts[$sub->id] ?? 0);
            return $sub;
        });

        return Inertia::render('Admin/Submissions/Index', [
            'class'       => $class,
            'submissions' => $submissions,
            'filters'     => $request->only(['status', 'category', 'search', 'sort', 'unread_only']),
        ]);
    }

    /**
     * Get a single submission.
     *
     * Marks the submission as read by the current admin (upserts a
     * `submission_reads` row). Returns the list of admins who have read it.
     *
     * @summary Get Submission
     * @tags Moderation
     */
    public function show(ClassWorkspace $class, Submission $submission)
    {
        abort_if($submission->class_id !== $class->id, 404);
        $this->authorize('view', $submission);

        // Mark as read by current user
        $submission->markReadBy(request()->user());

        // Who else has read it
        $readers = $submission->reads()
            ->with('user:id,name')
            ->get()
            ->map(fn ($r) => ['name' => $r->user->name, 'read_at' => $r->read_at->toIso8601String()]);

        $submission->load('tags');

        return Inertia::render('Admin/Submissions/Show', [
            'class'      => $class,
            'submission' => $submission,
            'readers'    => $readers,
            'class_tags' => $class->tags()->orderBy('name')->get(['id', 'name', 'slug']),
        ]);
    }

    /**
     * Update submission moderation fields.
     *
     * Updates editable fields: moderated message, target text, alias text,
     * category, internal note. Does not change submission status.
     *
     * @summary Update Submission
     * @tags Moderation
     */
    public function update(Request $request, ClassWorkspace $class, Submission $submission)
    {
        abort_if($submission->class_id !== $class->id, 404);
        $this->authorize('update', $submission);

        // Content fields (target_text, alias_text, category, song_text, etc.) are
        // intentionally NOT editable — admins must not modify sender's words.
        $data = $request->validate([
            'internal_note' => 'nullable|string',
        ]);

        $submission->fill($data)->save();

        return back()->with('success', 'Saved.');
    }

    /**
     * Start reviewing a submission.
     *
     * Transitions status from `submitted` to `under_review` and redirects
     * to the submission detail page.
     *
     * @summary Start Review
     * @tags Moderation
     */
    public function startReview(ClassWorkspace $class, Submission $submission)
    {
        abort_if($submission->class_id !== $class->id, 404);
        $this->authorize('update', $submission);

        if ($submission->status === SubmissionStatus::Submitted) {
            $submission->status = SubmissionStatus::UnderReview;
            $submission->save();
        }

        return redirect()->route('admin.classes.submissions.show', [$class, $submission]);
    }

    /**
     * Approve a submission.
     *
     * Assigns a permanent, non-sequential public ID (e.g. `MF-K7X4QM`),
     * records the approving admin and timestamp, and transitions status to
     * `approved`. Redirects to the approved post detail page.
     *
     * @summary Approve Submission
     * @tags Moderation
     */
    public function approve(Request $request, ClassWorkspace $class, Submission $submission)
    {
        abort_if($submission->class_id !== $class->id, 404);
        $this->authorize('approve', $submission);

        $data = $request->validate([
            'internal_note' => 'nullable|string',
        ]);

        if (isset($data['internal_note'])) {
            $submission->internal_note = $data['internal_note'];
            $submission->save();
        }

        $result = $this->approveAction->execute($request->user(), $submission);

        return redirect()
            ->route('admin.classes.approved.show', [$class, $result])
            ->with('approved_public_id', $result->public_id);
    }

    /**
     * Reject a submission.
     *
     * Transitions status to `rejected`. Accepts an optional rejection reason
     * and internal note. No public ID is assigned.
     *
     * @summary Reject Submission
     * @tags Moderation
     */
    public function reject(Request $request, ClassWorkspace $class, Submission $submission)
    {
        abort_if($submission->class_id !== $class->id, 404);
        $this->authorize('reject', $submission);

        $data = $request->validate([
            'rejection_reason' => 'nullable|string|max:500',
            'internal_note'    => 'nullable|string',
        ]);

        if (isset($data['internal_note'])) {
            $submission->internal_note = $data['internal_note'];
            $submission->save();
        }

        $this->rejectAction->execute($request->user(), $submission, $data['rejection_reason'] ?? '');

        return redirect()
            ->route('admin.classes.submissions.index', $class)
            ->with('success', 'Submission rejected.');
    }
}
