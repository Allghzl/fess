<?php

namespace Tests\Feature;

use App\Models\ClassInvitation;
use App\Models\ClassJoinRequest;
use App\Models\ClassWorkspace;
use App\Models\User;
use App\Services\InvitationService;
use App\Support\JoinRequestStatus;
use App\Support\MemberRole;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class InvitationTest extends TestCase
{
    use RefreshDatabase;

    private function makeClass(User $owner): ClassWorkspace
    {
        $class = ClassWorkspace::factory()->create();
        $class->members()->attach($owner->id, [
            'role'       => MemberRole::Owner->value,
            'created_at' => now(),
        ]);
        return $class;
    }

    public function test_base_creator_becomes_owner(): void
    {
        $user = User::factory()->create();
        $this->actingAs($user);

        $response = $this->post('/admin/bases', [
            'name'       => 'Test Base',
            'slug'       => 'test-base',
            'short_code' => 'TST',
        ]);

        $class = ClassWorkspace::where('slug', 'test-base')->first();
        $this->assertNotNull($class);

        $pivot = $class->members()->where('user_id', $user->id)->first();
        $this->assertNotNull($pivot);
        $this->assertEquals(MemberRole::Owner->value, $pivot->pivot->role);
    }

    public function test_base_cannot_have_two_owners(): void
    {
        $owner = User::factory()->create();
        $admin = User::factory()->create();
        $class = $this->makeClass($owner);

        // Verify that the invitation system never creates an owner role
        $service = app(InvitationService::class);
        $rawCode = $service->generateCode();
        $invitation = ClassInvitation::create([
            'class_id'          => $class->id,
            'created_by'        => $owner->id,
            'code_hash'         => $service->hashCode($rawCode),
            'code_hint'         => $service->codeHint($rawCode),
            'requires_approval' => false,
        ]);

        $result = $service->claimInvitation($invitation, $admin);
        $this->assertEquals('joined', $result['action']);

        // Admin should have role=admin, not owner
        $pivot = $class->members()->where('user_id', $admin->id)->first();
        $this->assertEquals(MemberRole::Admin->value, $pivot->pivot->role);

        // Only one owner
        $owners = $class->members()->wherePivot('role', MemberRole::Owner->value)->count();
        $this->assertEquals(1, $owners);
    }

    public function test_auto_approve_invite_creates_membership_immediately(): void
    {
        $owner = User::factory()->create();
        $user  = User::factory()->create();
        $class = $this->makeClass($owner);
        $service = app(InvitationService::class);

        $rawCode = $service->generateCode();
        $invitation = ClassInvitation::create([
            'class_id'          => $class->id,
            'created_by'        => $owner->id,
            'code_hash'         => $service->hashCode($rawCode),
            'code_hint'         => $service->codeHint($rawCode),
            'requires_approval' => false,
        ]);

        $result = $service->claimInvitation($invitation, $user);

        $this->assertEquals('joined', $result['action']);
        $this->assertTrue($class->isMember($user));
        $invitation->refresh();
        $this->assertEquals(1, $invitation->claimed_count);
    }

    public function test_manual_approval_invite_creates_pending_request(): void
    {
        $owner = User::factory()->create();
        $user  = User::factory()->create();
        $class = $this->makeClass($owner);
        $service = app(InvitationService::class);

        $rawCode = $service->generateCode();
        $invitation = ClassInvitation::create([
            'class_id'          => $class->id,
            'created_by'        => $owner->id,
            'code_hash'         => $service->hashCode($rawCode),
            'code_hint'         => $service->codeHint($rawCode),
            'requires_approval' => true,
        ]);

        $result = $service->claimInvitation($invitation, $user);

        $this->assertEquals('pending', $result['action']);
        $this->assertFalse($class->isMember($user));
        $this->assertInstanceOf(ClassJoinRequest::class, $result['request']);
        $this->assertEquals(JoinRequestStatus::Pending, $result['request']->status);
    }

    public function test_invite_expiry(): void
    {
        $owner = User::factory()->create();
        $user  = User::factory()->create();
        $class = $this->makeClass($owner);
        $service = app(InvitationService::class);

        $rawCode = $service->generateCode();
        $invitation = ClassInvitation::create([
            'class_id'          => $class->id,
            'created_by'        => $owner->id,
            'code_hash'         => $service->hashCode($rawCode),
            'code_hint'         => $service->codeHint($rawCode),
            'requires_approval' => false,
            'expires_at'        => now()->subMinute(),
        ]);

        $this->assertFalse($invitation->isValid());

        $this->expectException(\RuntimeException::class);
        $service->claimInvitation($invitation, $user);
    }

    public function test_invite_revocation(): void
    {
        $owner = User::factory()->create();
        $class = $this->makeClass($owner);
        $service = app(InvitationService::class);

        $rawCode = $service->generateCode();
        $invitation = ClassInvitation::create([
            'class_id'          => $class->id,
            'created_by'        => $owner->id,
            'code_hash'         => $service->hashCode($rawCode),
            'code_hint'         => $service->codeHint($rawCode),
            'requires_approval' => false,
            'revoked_at'        => now(),
        ]);

        $this->assertFalse($invitation->isValid());
    }

    public function test_one_use_invite(): void
    {
        $owner = User::factory()->create();
        $class = $this->makeClass($owner);
        $service = app(InvitationService::class);

        $rawCode = $service->generateCode();
        $invitation = ClassInvitation::create([
            'class_id'          => $class->id,
            'created_by'        => $owner->id,
            'code_hash'         => $service->hashCode($rawCode),
            'code_hint'         => $service->codeHint($rawCode),
            'requires_approval' => false,
            'max_uses'          => 1,
        ]);

        $user1 = User::factory()->create();
        $service->claimInvitation($invitation, $user1);

        $invitation->refresh();
        $this->assertFalse($invitation->isValid());

        $user2 = User::factory()->create();
        $this->expectException(\RuntimeException::class);
        $service->claimInvitation($invitation, $user2);
    }

    public function test_duplicate_membership_prevented(): void
    {
        $owner = User::factory()->create();
        $user  = User::factory()->create();
        $class = $this->makeClass($owner);
        $service = app(InvitationService::class);

        $rawCode = $service->generateCode();
        $invitation = ClassInvitation::create([
            'class_id'          => $class->id,
            'created_by'        => $owner->id,
            'code_hash'         => $service->hashCode($rawCode),
            'code_hint'         => $service->codeHint($rawCode),
            'requires_approval' => false,
        ]);

        $service->claimInvitation($invitation, $user);

        $rawCode2 = $service->generateCode();
        $invitation2 = ClassInvitation::create([
            'class_id'          => $class->id,
            'created_by'        => $owner->id,
            'code_hash'         => $service->hashCode($rawCode2),
            'code_hint'         => $service->codeHint($rawCode2),
            'requires_approval' => false,
        ]);

        $this->expectException(\RuntimeException::class);
        $this->expectExceptionMessage('already_member');
        $service->claimInvitation($invitation2, $user);
    }

    public function test_duplicate_pending_join_prevented(): void
    {
        $owner = User::factory()->create();
        $user  = User::factory()->create();
        $class = $this->makeClass($owner);
        $service = app(InvitationService::class);

        $rawCode = $service->generateCode();
        $invitation = ClassInvitation::create([
            'class_id'          => $class->id,
            'created_by'        => $owner->id,
            'code_hash'         => $service->hashCode($rawCode),
            'code_hint'         => $service->codeHint($rawCode),
            'requires_approval' => true,
        ]);
        $service->claimInvitation($invitation, $user);

        $rawCode2 = $service->generateCode();
        $invitation2 = ClassInvitation::create([
            'class_id'          => $class->id,
            'created_by'        => $owner->id,
            'code_hash'         => $service->hashCode($rawCode2),
            'code_hint'         => $service->codeHint($rawCode2),
            'requires_approval' => true,
        ]);

        $this->expectException(\RuntimeException::class);
        $this->expectExceptionMessage('request_pending');
        $service->claimInvitation($invitation2, $user);
    }

    public function test_approve_join_request_creates_membership(): void
    {
        $owner = User::factory()->create();
        $user  = User::factory()->create();
        $class = $this->makeClass($owner);
        $service = app(InvitationService::class);

        $rawCode = $service->generateCode();
        $invitation = ClassInvitation::create([
            'class_id'          => $class->id,
            'created_by'        => $owner->id,
            'code_hash'         => $service->hashCode($rawCode),
            'code_hint'         => $service->codeHint($rawCode),
            'requires_approval' => true,
        ]);

        $result = $service->claimInvitation($invitation, $user);
        $joinRequest = $result['request'];

        $this->assertFalse($class->isMember($user));

        $service->approveJoinRequest($joinRequest, $owner);

        $this->assertTrue($class->isMember($user));
        $joinRequest->refresh();
        $this->assertEquals(JoinRequestStatus::Approved, $joinRequest->status);
    }

    public function test_owner_only_can_revoke_invite(): void
    {
        $owner = User::factory()->create();
        $admin = User::factory()->create();
        $class = $this->makeClass($owner);

        $class->members()->attach($admin->id, [
            'role'       => MemberRole::Admin->value,
            'created_at' => now(),
        ]);

        $service = app(InvitationService::class);
        $rawCode = $service->generateCode();
        $invitation = ClassInvitation::create([
            'class_id'          => $class->id,
            'created_by'        => $owner->id,
            'code_hash'         => $service->hashCode($rawCode),
            'code_hint'         => $service->codeHint($rawCode),
            'requires_approval' => true,
        ]);

        // Admin tries to revoke — should get 403
        $this->actingAs($admin);
        $response = $this->delete("/admin/classes/{$class->id}/members/invitations/{$invitation->id}/revoke");
        $response->assertForbidden();

        // Owner can revoke
        $this->actingAs($owner);
        $response = $this->delete("/admin/classes/{$class->id}/members/invitations/{$invitation->id}/revoke");
        $response->assertRedirect();
        $invitation->refresh();
        $this->assertNotNull($invitation->revoked_at);
    }

    public function test_admin_cannot_remove_owner(): void
    {
        $owner = User::factory()->create();
        $admin = User::factory()->create();
        $class = $this->makeClass($owner);

        $class->members()->attach($admin->id, [
            'role'       => MemberRole::Admin->value,
            'created_at' => now(),
        ]);

        $this->actingAs($admin);
        $response = $this->delete("/admin/classes/{$class->id}/members/admins/{$owner->id}");
        $response->assertForbidden();
    }

    public function test_cross_base_invitation_access_blocked(): void
    {
        $owner1 = User::factory()->create();
        $owner2 = User::factory()->create();
        $class1 = $this->makeClass($owner1);
        $class2 = $this->makeClass($owner2);

        $service = app(InvitationService::class);
        $rawCode = $service->generateCode();
        $invitation = ClassInvitation::create([
            'class_id'          => $class1->id,
            'created_by'        => $owner1->id,
            'code_hash'         => $service->hashCode($rawCode),
            'code_hint'         => $service->codeHint($rawCode),
            'requires_approval' => true,
        ]);

        // Owner2 tries to revoke class1's invitation via class2 URL
        $this->actingAs($owner2);
        $response = $this->delete("/admin/classes/{$class2->id}/members/invitations/{$invitation->id}/revoke");
        $response->assertNotFound();
    }

    public function test_landing_page_does_not_expose_base_directory(): void
    {
        ClassWorkspace::factory()->count(3)->create(['is_active' => true]);

        $response = $this->get('/');
        $response->assertOk();
        $response->assertInertia(fn ($page) =>
            $page->component('Public/Welcome')
                ->missing('classes')
                ->has('app_name')
        );
    }

    public function test_valid_base_code_redirects_to_canonical_route(): void
    {
        ClassWorkspace::factory()->create([
            'slug'       => 'test-base',
            'short_code' => 'TSTB',
            'is_active'  => true,
        ]);

        $response = $this->post('/base-lookup', ['code' => 'TSTB']);
        $response->assertRedirect('/b/test-base');
    }

    public function test_invalid_base_code_does_not_reveal_valid_bases(): void
    {
        ClassWorkspace::factory()->create([
            'slug'       => 'real-base',
            'short_code' => 'REAL',
            'is_active'  => true,
        ]);

        $response = $this->post('/base-lookup', ['code' => 'FAKE']);
        $response->assertRedirect();
        $response->assertSessionHasErrors('code');
    }

    public function test_public_base_page_accessible_without_login(): void
    {
        ClassWorkspace::factory()->create([
            'slug'      => 'open-base',
            'is_active' => true,
        ]);

        $response = $this->get('/b/open-base');
        $response->assertOk();
        $response->assertInertia(fn ($page) =>
            $page->component('Public/BasePage')
        );
    }
}
