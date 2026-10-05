<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\ClassInvitation;
use App\Models\ClassWorkspace;
use App\Services\InvitationService;
use App\Support\MemberRole;
use Illuminate\Http\Request;
use Inertia\Inertia;

class InvitationController extends Controller
{
    public function __construct(private InvitationService $invitationService) {}

    private function requireOwner(ClassWorkspace $class, Request $request): void
    {
        if (!$class->isOwner($request->user())) {
            abort(403, 'Hanya owner yang dapat mengelola invite.');
        }
    }

    /**
     * Create a base admin invitation (owner only).
     *
     * Generates a cryptographically random 8-character invitation code
     * (`XXXX-XXXX`). The raw code is returned ONCE via session flash and
     * never stored in plaintext — only an HMAC hash is persisted.
     *
     * Supports optional expiry (1h / 24h / 7d), usage limits (1, 3, N, or
     * unlimited), and approval mode (requires owner approval vs auto-approve).
     *
     * Auto-approve grants immediate admin membership to anyone with a valid
     * remaining use. Use with caution.
     *
     * @summary Create Invitation (owner only)
     * @tags Base Invitations
     */
    public function store(Request $request, ClassWorkspace $class)
    {
        $this->requireOwner($class, $request);

        $data = $request->validate([
            'expires_in_hours'  => 'nullable|integer|in:1,24,168',
            'max_uses'          => 'nullable|integer|min:1|max:100',
            'requires_approval' => 'boolean',
        ]);

        $rawCode = $this->invitationService->generateCode();

        $invitation = ClassInvitation::create([
            'class_id'          => $class->id,
            'created_by'        => $request->user()->id,
            'code_hash'         => $this->invitationService->hashCode($rawCode),
            'code_hint'         => $this->invitationService->codeHint($rawCode),
            'expires_at'        => isset($data['expires_in_hours'])
                ? now()->addHours((int) $data['expires_in_hours'])
                : null,
            'max_uses'          => $data['max_uses'] ?? null,
            'requires_approval' => $data['requires_approval'] ?? true,
        ]);

        // Return raw code ONCE — it is never stored in plaintext
        return back()->with('new_invite', [
            'id'                => $invitation->id,
            'code'              => $rawCode,
            'expires_at'        => $invitation->expires_at?->toIso8601String(),
            'max_uses'          => $invitation->max_uses,
            'requires_approval' => $invitation->requires_approval,
            'base_name'         => $class->name,
        ]);
    }

    /**
     * Revoke an invitation (owner only).
     *
     * Sets `revoked_at` timestamp. Revoked invitations cannot be claimed.
     * Already-claimed memberships are not affected.
     *
     * @summary Revoke Invitation (owner only)
     * @tags Base Invitations
     */
    public function revoke(Request $request, ClassWorkspace $class, ClassInvitation $invitation)
    {
        $this->requireOwner($class, $request);
        abort_if($invitation->class_id !== $class->id, 404);

        $invitation->update(['revoked_at' => now()]);

        return back()->with('success', 'Invite berhasil dicabut.');
    }
}
