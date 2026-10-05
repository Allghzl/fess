<?php

namespace App\Policies;

use App\Models\ClassWorkspace;
use App\Models\User;

class ClassWorkspacePolicy
{
    public function view(User $user, ClassWorkspace $class): bool
    {
        return $user->isMemberOf($class);
    }

    public function update(User $user, ClassWorkspace $class): bool
    {
        return $this->hasRole($user, $class, ['owner', 'admin']);
    }

    public function delete(User $user, ClassWorkspace $class): bool
    {
        return $this->hasRole($user, $class, ['owner']);
    }

    public function manageMembers(User $user, ClassWorkspace $class): bool
    {
        return $this->hasRole($user, $class, ['owner', 'admin']);
    }

    private function hasRole(User $user, ClassWorkspace $class, array $roles): bool
    {
        return $class->members()
            ->where('users.id', $user->id)
            ->wherePivotIn('role', $roles)
            ->exists();
    }
}
