<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\ClassWorkspace;
use App\Models\TakedownRequest;
use App\Support\SubmissionStatus;
use App\Support\TakedownStatus;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;

class TakedownAdminController extends Controller
{
    /**
     * List pending takedown requests for a base.
     *
     * @summary List Takedown Requests
     * @tags Takedown
     */
    public function index(Request $request, ClassWorkspace $class)
    {
        $this->authorize('view', $class);

        $filter = $request->input('filter', 'pending');

        $query = $class->takedownRequests()
            ->with('submission')
            ->orderBy('created_at', 'desc');

        if ($filter === 'pending') {
            $query->whereIn('status', [TakedownStatus::Pending->value, TakedownStatus::Reviewing->value]);
        } elseif ($filter !== 'all') {
            $query->where('status', $filter);
        }

        $requests = $query->paginate(30)->withQueryString();

        return Inertia::render('Admin/Takedowns/Index', [
            'class'    => $class,
            'requests' => $requests,
            'filter'   => $filter,
        ]);
    }

    /**
     * Get a takedown request detail.
     *
     * @summary Get Takedown Request
     * @tags Takedown
     */
    public function show(ClassWorkspace $class, TakedownRequest $takedown)
    {
        abort_if($takedown->class_id !== $class->id, 404);
        $this->authorize('view', $takedown);

        $takedown->load('submission');

        return Inertia::render('Admin/Takedowns/Show', [
            'class'    => $class,
            'takedown' => $takedown,
        ]);
    }

    /**
     * Start reviewing a takedown request.
     *
     * @summary Start Takedown Review
     * @tags Takedown
     */
    public function startReview(ClassWorkspace $class, TakedownRequest $takedown)
    {
        abort_if($takedown->class_id !== $class->id, 404);
        $this->authorize('handle', $takedown);

        if ($takedown->status === TakedownStatus::Pending) {
            $takedown->status = TakedownStatus::Reviewing;
            $takedown->save();
        }

        return redirect()->route('admin.classes.takedowns.show', [$class, $takedown]);
    }

    /**
     * Approve a takedown request.
     *
     * Sets submission status to `taken_down`. The public ID is preserved
     * (immutable) so the takedown can be confirmed by requesters. The
     * submission is removed from the approved list.
     *
     * @summary Approve Takedown
     * @tags Takedown
     */
    public function approve(Request $request, ClassWorkspace $class, TakedownRequest $takedown)
    {
        abort_if($takedown->class_id !== $class->id, 404);
        $this->authorize('handle', $takedown);

        $data = $request->validate(['admin_note' => 'nullable|string|max:1000']);

        DB::transaction(function () use ($request, $takedown, $data) {
            $takedown->status     = TakedownStatus::Approved;
            $takedown->handled_by = $request->user()->id;
            $takedown->handled_at = now();
            $takedown->admin_note = $data['admin_note'] ?? null;
            $takedown->save();

            // Mark submission taken_down; public_id preserved (never nulled)
            $takedown->submission()->update(['status' => SubmissionStatus::TakenDown->value]);
        });

        return redirect()
            ->route('admin.classes.takedowns.show', [$class, $takedown])
            ->with('takedown_approved', true);
    }

    /**
     * Reject a takedown request.
     *
     * Leaves submission status as `approved`.
     *
     * @summary Reject Takedown
     * @tags Takedown
     */
    public function reject(Request $request, ClassWorkspace $class, TakedownRequest $takedown)
    {
        abort_if($takedown->class_id !== $class->id, 404);
        $this->authorize('handle', $takedown);

        $data = $request->validate(['admin_note' => 'nullable|string|max:1000']);

        $takedown->status     = TakedownStatus::Rejected;
        $takedown->handled_by = $request->user()->id;
        $takedown->handled_at = now();
        $takedown->admin_note = $data['admin_note'] ?? null;
        $takedown->save();

        return redirect()
            ->route('admin.classes.takedowns.show', [$class, $takedown])
            ->with('success', 'Takedown request rejected.');
    }
}
