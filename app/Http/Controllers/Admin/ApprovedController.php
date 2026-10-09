<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\ClassWorkspace;
use App\Models\Submission;
use App\Support\SubmissionStatus;
use Illuminate\Http\Request;
use Inertia\Inertia;

class ApprovedController extends Controller
{
    /**
     * List approved posts.
     *
     * Returns paginated approved and taken-down submissions. Supports
     * `filter` values: `all`, `not_posted`, `posted`, `taken_down`.
     * Also returns active custom designs for the bulk-render modal.
     *
     * @summary List Approved Posts
     * @tags Approved Posts
     */
    public function index(Request $request, ClassWorkspace $class)
    {
        $this->authorize('view', $class);

        $filter = $request->input('filter', 'all');

        $query = $class->submissions()
            ->whereIn('status', [SubmissionStatus::Approved->value, SubmissionStatus::TakenDown->value])
            ->orderBy('approved_at', 'desc');

        if ($filter === 'not_posted') {
            $query->where('status', SubmissionStatus::Approved->value)->whereNull('posted_at');
        } elseif ($filter === 'posted') {
            $query->where('status', SubmissionStatus::Approved->value)->whereNotNull('posted_at');
        } elseif ($filter === 'taken_down') {
            $query->where('status', SubmissionStatus::TakenDown->value);
        }

        $submissions = $query->paginate(50)->withQueryString();

        $designs = $class->designs()->where('active', true)->get();

        return Inertia::render('Admin/Approved/Index', [
            'class'       => $class,
            'submissions' => $submissions,
            'filter'      => $filter,
            'designs'     => $designs,
        ]);
    }

    /**
     * Get an approved post detail.
     *
     * Returns the submission with its active custom designs for the
     * single-item render form.
     *
     * @summary Get Approved Post
     * @tags Approved Posts
     */
    public function show(ClassWorkspace $class, Submission $submission)
    {
        abort_if($submission->class_id !== $class->id, 404);
        $this->authorize('view', $submission);

        $designs = $class->designs()->where('active', true)->get();

        return Inertia::render('Admin/Approved/Show', [
            'class'      => $class,
            'submission' => $submission,
            'designs'    => $designs,
            'flash'      => [
                'approved_public_id' => session('approved_public_id'),
            ],
        ]);
    }

    /**
     * Toggle posted status.
     *
     * Sets or clears `posted_at` timestamp on an approved submission.
     *
     * @summary Mark as Posted / Unposted
     * @tags Approved Posts
     */
    public function markPosted(Request $request, ClassWorkspace $class, Submission $submission)
    {
        abort_if($submission->class_id !== $class->id, 404);
        $this->authorize('update', $submission);

        $submission->posted_at = $submission->posted_at ? null : now();
        $submission->save();

        return back();
    }

    /**
     * Bulk mark submissions as posted (or unposted).
     *
     * Sets posted_at = now() on all given IDs that belong to this class
     * and have approved status. Pass posted=false to clear posted_at.
     *
     * @summary Bulk Mark Posted
     * @tags Approved Posts
     */
    public function bulkMarkPosted(Request $request, ClassWorkspace $class)
    {
        $this->authorize('update', $class);

        $data = $request->validate([
            'ids'    => 'required|array|min:1|max:200',
            'ids.*'  => 'string|uuid',
            'posted' => 'boolean',
        ]);

        $markPosted = $data['posted'] ?? true;

        $updated = $class->submissions()
            ->whereIn('id', $data['ids'])
            ->where('status', SubmissionStatus::Approved->value)
            ->update(['posted_at' => $markPosted ? now() : null]);

        return back()->with('success', $updated . ' item ditandai ' . ($markPosted ? 'sudah' : 'belum') . ' diposting.');
    }

    public function bulkRender(Request $request, ClassWorkspace $class)
    {
        $this->authorize('view', $class);

        $data = $request->validate([
            'ids'              => 'required|array|min:1',
            'ids.*'            => 'string|uuid',
            'format'           => 'required|in:story,feed_portrait',
            'design_id'        => 'nullable|string|uuid',
            'show_logo'        => 'boolean',
            'show_website_url' => 'boolean',
            'overrides'        => 'nullable|array',
        ]);

        $valid = $class->submissions()
            ->whereIn('id', $data['ids'])
            ->where('status', SubmissionStatus::Approved->value)
            ->pluck('id');

        if ($valid->count() !== count($data['ids'])) {
            abort(422, 'Some submissions are invalid for bulk render (not approved, taken down, or cross-class).');
        }

        return response()->json(['status' => 'queued', 'count' => $valid->count()], 202);
    }
}
