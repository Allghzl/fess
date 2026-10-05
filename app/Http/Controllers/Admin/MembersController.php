<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\ClassJoinRequest;
use App\Models\ClassWorkspace;
use App\Services\InvitationService;
use App\Support\JoinRequestStatus;
use App\Support\MemberRole;
use Illuminate\Http\Request;
use Inertia\Inertia;
use RuntimeException;

class MembersController extends Controller
{
    public function __construct(private InvitationService $invitationService) {}

    /**
     * List base members, pending join requests, and invitations.
     *
     * Non-owner admins see members only. Owners additionally see pending join
     * requests and the full invitation history. Raw invitation codes are never
     * returned — only the last 4 characters (hint) are shown.
     *
     * @summary List Members & Invitations
     * @tags Base Members
     */
    public function index(Request $request, ClassWorkspace $class)
    {
        $this->authorize('view', $class);

        $user    = $request->user();
        $isOwner = $class->isOwner($user);

        $members = $class->members()->get()->map(fn ($m) => [
            'id'   => $m->id,
            'name' => $m->name,
            'role' => $m->pivot->role,
        ]);

        $pendingRequests = $isOwner
            ? $class->joinRequests()
                ->with('user:id,name')
                ->where('status', JoinRequestStatus::Pending->value)
                ->get()
                ->map(fn ($r) => [
                    'id'         => $r->id,
                    'user_name'  => $r->user->name,
                    'created_at' => $r->created_at->toIso8601String(),
                ])
            : collect();

        $invitations = $isOwner
            ? $class->invitations()
                ->orderByDesc('created_at')
                ->get()
                ->map(fn ($inv) => [
                    'id'                => $inv->id,
                    'code_hint'         => $inv->code_hint,
                    'expires_at'        => $inv->expires_at?->toIso8601String(),
                    'max_uses'          => $inv->max_uses,
                    'claimed_count'     => $inv->claimed_count,
                    'requires_approval' => $inv->requires_approval,
                    'revoked_at'        => $inv->revoked_at?->toIso8601String(),
                    'is_valid'          => $inv->isValid(),
                ])
            : collect();

        return Inertia::render('Admin/Members/Index', [
            'class'            => $class,
            'members'          => $members,
            'pending_requests' => $pendingRequests,
            'invitations'      => $invitations,
            'is_owner'         => $isOwner,
            'flash'            => [
                'new_invite' => session('new_invite'),
                'success'    => session('success'),
            ],
        ]);
    }

    /**
     * Approve a pending join request (owner only).
     *
     * Grants `admin` role membership to the requesting user.
     *
     * @summary Approve Join Request
     * @tags Base Members
     */
    public function approveRequest(Request $request, ClassWorkspace $class, ClassJoinRequest $joinRequest)
    {
        if (!$class->isOwner($request->user())) {
            abort(403);
        }
        abort_if($joinRequest->class_id !== $class->id, 404);

        try {
            $this->invitationService->approveJoinRequest($joinRequest, $request->user());
        } catch (RuntimeException $e) {
            return back()->withErrors(['request' => 'Permintaan tidak dapat diproses.']);
        }

        return back()->with('success', 'Admin berhasil ditambahkan.');
    }

    /**
     * Reject a pending join request (owner only).
     *
     * @summary Reject Join Request
     * @tags Base Members
     */
    public function rejectRequest(Request $request, ClassWorkspace $class, ClassJoinRequest $joinRequest)
    {
        if (!$class->isOwner($request->user())) {
            abort(403);
        }
        abort_if($joinRequest->class_id !== $class->id, 404);

        try {
            $this->invitationService->rejectJoinRequest($joinRequest, $request->user());
        } catch (RuntimeException $e) {
            return back()->withErrors(['request' => 'Permintaan tidak dapat diproses.']);
        }

        return back()->with('success', 'Permintaan ditolak.');
    }

    /**
     * Remove a secondary admin from a base (owner only).
     *
     * Cannot remove the owner. Cannot be used by non-owners.
     *
     * @summary Remove Admin
     * @tags Base Members
     */
    public function removeAdmin(Request $request, ClassWorkspace $class, string $userId)
    {
        if (!$class->isOwner($request->user())) {
            abort(403);
        }

        $targetMember = $class->members()
            ->wherePivot('user_id', $userId)
            ->first();

        if (!$targetMember) {
            abort(404);
        }

        if ($targetMember->pivot->role === MemberRole::Owner->value) {
            abort(403, 'Owner tidak dapat dihapus.');
        }

        $class->members()->detach($userId);

        return back()->with('success', 'Admin berhasil dihapus.');
    }
}
