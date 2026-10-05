<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Support\SubmissionStatus;
use App\Support\TakedownStatus;
use Illuminate\Http\Request;
use Inertia\Inertia;

class DashboardController extends Controller
{
    /**
     * List all bases the authenticated user manages.
     *
     * Returns base cards with pending submission count, approved count, and
     * open takedown request count. Each base includes the user's role
     * (`owner` or `admin`). Returns an empty array when the user has no bases.
     *
     * @summary Admin Dashboard
     * @tags Admin
     */
    public function index(Request $request)
    {
        $user = $request->user();

        $classes = $user->classes()->get()->map(function ($class) use ($user) {
            return [
                'id'             => $class->id,
                'name'           => $class->name,
                'slug'           => $class->slug,
                'short_code'     => $class->short_code,
                'role'           => $class->pivot->role,
                'pending_count'  => $class->submissions()
                    ->whereIn('status', [SubmissionStatus::Submitted->value, SubmissionStatus::UnderReview->value])
                    ->count(),
                'approved_count' => $class->submissions()
                    ->where('status', SubmissionStatus::Approved->value)
                    ->count(),
                'takedown_count' => $class->takedownRequests()
                    ->whereIn('status', [TakedownStatus::Pending->value, TakedownStatus::Reviewing->value])
                    ->count(),
            ];
        });

        return Inertia::render('Admin/Dashboard', ['bases' => $classes]);
    }
}
