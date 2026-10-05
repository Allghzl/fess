<?php

namespace App\Http\Controllers\Public;

use App\Http\Controllers\Controller;
use App\Services\InvitationService;
use App\Support\JoinRequestStatus;
use Illuminate\Http\Request;
use Inertia\Inertia;
use RuntimeException;

class JoinController extends Controller
{
    public function __construct(private InvitationService $invitationService) {}

    /**
     * Show the join-by-invite-code page.
     *
     * Accepts an optional `code` query parameter to prefill the invitation
     * code input. If the user is authenticated, their display name is shown.
     *
     * @summary Show Join Page
     * @tags Base Invitations
     * @unauthenticated
     */
    public function show(Request $request)
    {
        $code = $request->input('code', '');

        return Inertia::render('Public/Join', [
            'prefill_code' => $code,
            'auth_user'    => $request->user() ? [
                'name' => $request->user()->name,
            ] : null,
        ]);
    }

    /**
     * Claim a base admin invitation.
     *
     * Validates the invitation code and either creates a pending join request
     * (when `requires_approval` is true) or immediately grants admin membership
     * (auto-approve). Redirects to PinatAuth login if unauthenticated.
     *
     * Possible errors: invalid/expired/revoked code, already a member,
     * pending request already exists.
     *
     * @summary Claim Invitation
     * @tags Base Invitations
     */
    public function claim(Request $request)
    {
        $request->validate([
            'code' => 'required|string|max:20',
        ]);

        if (!$request->user()) {
            // Store code and redirect to login
            $returnTo = '/join?code=' . urlencode($request->input('code'));
            return redirect()->route('auth.login', ['redirect' => $returnTo]);
        }

        $rawCode    = strtoupper(str_replace(' ', '', $request->input('code')));
        $invitation = $this->invitationService->findValidInvitation($rawCode);

        if (!$invitation) {
            return back()->withErrors([
                'code' => 'Invite tidak ditemukan, sudah kedaluwarsa, atau sudah tidak berlaku.',
            ])->withInput();
        }

        try {
            $result = $this->invitationService->claimInvitation($invitation, $request->user());
        } catch (RuntimeException $e) {
            $message = match ($e->getMessage()) {
                'already_member'  => 'Kamu sudah menjadi admin base ini.',
                'request_pending' => 'Kamu sudah memiliki permintaan bergabung yang sedang menunggu persetujuan.',
                'invite_invalid'  => 'Invite sudah tidak berlaku.',
                default           => 'Gagal memproses invite. Coba lagi.',
            };

            return back()->withErrors(['code' => $message])->withInput();
        }

        if ($result['action'] === 'joined') {
            return redirect()->route('admin.classes.overview', ['class' => $result['class']->id])
                ->with('success', 'Kamu berhasil bergabung sebagai admin!');
        }

        // pending approval
        return Inertia::render('Public/JoinPending', [
            'base_name' => $result['class']->name,
        ]);
    }
}
