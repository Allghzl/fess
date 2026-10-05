<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\ClassWorkspace;
use App\Support\SubmissionStatus;
use App\Support\TakedownStatus;
use Illuminate\Http\Request;
use Inertia\Inertia;

class ClassOverviewController extends Controller
{
    /**
     * Get base overview for the admin dashboard.
     *
     * Returns summary statistics for the base.
     *
     * @summary Base Overview
     * @tags Admin
     */
    public function index(Request $request, ClassWorkspace $class)
    {
        $this->authorize('view', $class);

        $stats = [
            'pending'          => $class->submissions()
                ->whereIn('status', [SubmissionStatus::Submitted->value, SubmissionStatus::UnderReview->value])
                ->count(),
            'approved'         => $class->submissions()
                ->where('status', SubmissionStatus::Approved->value)
                ->count(),
            'rejected'         => $class->submissions()
                ->where('status', SubmissionStatus::Rejected->value)
                ->count(),
            'taken_down'       => $class->submissions()
                ->where('status', SubmissionStatus::TakenDown->value)
                ->count(),
            'takedown_pending'  => $class->takedownRequests()
                ->whereIn('status', [TakedownStatus::Pending->value, TakedownStatus::Reviewing->value])
                ->count(),
        ];

        return Inertia::render('Admin/ClassOverview', [
            'class' => $class,
            'stats' => $stats,
        ]);
    }
}
