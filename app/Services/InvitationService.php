<?php

namespace App\Services;

use App\Models\ClassInvitation;
use App\Models\ClassJoinRequest;
use App\Models\ClassWorkspace;
use App\Models\User;
use App\Support\JoinRequestStatus;
use App\Support\MemberRole;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use RuntimeException;

class InvitationService
{
    // Unambiguous alphabet: no I, L, O, 0, 1
    const ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
    const CODE_LENGTH = 8; // e.g. K7XMPQ4A split as K7XM-PQ4A

    public function generateCode(): string
    {
        $len    = strlen(self::ALPHABET);
        $result = '';
        for ($i = 0; $i < self::CODE_LENGTH; $i++) {
            $result .= self::ALPHABET[random_int(0, $len - 1)];
        }
        // Format as XXXX-XXXX
        return substr($result, 0, 4) . '-' . substr($result, 4, 4);
    }

    public function hashCode(string $rawCode): string
    {
        // Remove dash, uppercase for canonical form
        $canonical = strtoupper(str_replace('-', '', $rawCode));
        return hash_hmac('sha256', $canonical, config('app.key'));
    }

    public function codeHint(string $rawCode): string
    {
        // Last 4 chars of canonical form (without dash)
        $canonical = strtoupper(str_replace('-', '', $rawCode));
        return substr($canonical, -4);
    }

    /**
     * Find a valid invitation by raw code. Returns null if not found or invalid.
     */
    public function findValidInvitation(string $rawCode): ?ClassInvitation
    {
        $hash       = $this->hashCode($rawCode);
        $invitation = ClassInvitation::where('code_hash', $hash)->first();

        if (!$invitation) {
            return null;
        }

        return $invitation->isValid() ? $invitation : null;
    }

    /**
     * Atomically claim an invitation for a user.
     * Returns ['action' => 'joined'|'pending', 'request' => ClassJoinRequest|null]
     * Throws RuntimeException on failure.
     */
    public function claimInvitation(ClassInvitation $invitation, User $user): array
    {
        return DB::transaction(function () use ($invitation, $user) {
            // Re-fetch with lock to prevent race conditions
            $locked = ClassInvitation::lockForUpdate()->find($invitation->id);

            if (!$locked || !$locked->isValid()) {
                throw new RuntimeException('invite_invalid');
            }

            $class = $locked->classWorkspace;

            // Check if already a member
            if ($class->isMember($user)) {
                throw new RuntimeException('already_member');
            }

            // Check if owner trying to join own base
            if ($class->isOwner($user)) {
                throw new RuntimeException('already_member');
            }

            // Check for existing pending request
            $existingRequest = ClassJoinRequest::where('class_id', $class->id)
                ->where('user_id', $user->id)
                ->where('status', JoinRequestStatus::Pending->value)
                ->first();

            if ($existingRequest) {
                throw new RuntimeException('request_pending');
            }

            // Increment claimed_count atomically
            $locked->increment('claimed_count');

            if ($locked->requires_approval) {
                // Create pending join request
                $joinRequest = ClassJoinRequest::create([
                    'class_id'      => $class->id,
                    'invitation_id' => $locked->id,
                    'user_id'       => $user->id,
                    'status'        => JoinRequestStatus::Pending->value,
                ]);

                return ['action' => 'pending', 'request' => $joinRequest, 'class' => $class];
            } else {
                // Auto-approve: create membership immediately
                $class->members()->attach($user->id, [
                    'role'       => MemberRole::Admin->value,
                    'created_at' => now(),
                ]);

                return ['action' => 'joined', 'request' => null, 'class' => $class];
            }
        });
    }

    /**
     * Approve a pending join request (owner only).
     */
    public function approveJoinRequest(ClassJoinRequest $joinRequest, User $reviewer): void
    {
        DB::transaction(function () use ($joinRequest, $reviewer) {
            if ($joinRequest->status !== JoinRequestStatus::Pending) {
                throw new RuntimeException('not_pending');
            }

            $joinRequest->update([
                'status'      => JoinRequestStatus::Approved->value,
                'reviewed_by' => $reviewer->id,
                'reviewed_at' => now(),
            ]);

            // Create membership
            $joinRequest->classWorkspace->members()->attach($joinRequest->user_id, [
                'role'       => MemberRole::Admin->value,
                'created_at' => now(),
            ]);
        });
    }

    /**
     * Reject a pending join request (owner only).
     */
    public function rejectJoinRequest(ClassJoinRequest $joinRequest, User $reviewer): void
    {
        if ($joinRequest->status !== JoinRequestStatus::Pending) {
            throw new RuntimeException('not_pending');
        }

        $joinRequest->update([
            'status'      => JoinRequestStatus::Rejected->value,
            'reviewed_by' => $reviewer->id,
            'reviewed_at' => now(),
        ]);
    }
}
