<?php

namespace App\Policies;

use App\Models\ClassDesign;
use App\Models\User;

class ClassDesignPolicy
{
    public function view(User $user, ClassDesign $design): bool
    {
        return $user->isMemberOf($design->classWorkspace);
    }

    public function create(User $user, \App\Models\ClassWorkspace $class): bool
    {
        return $user->isMemberOf($class);
    }

    public function update(User $user, ClassDesign $design): bool
    {
        return $user->isMemberOf($design->classWorkspace);
    }

    public function delete(User $user, ClassDesign $design): bool
    {
        return $user->isMemberOf($design->classWorkspace);
    }
}
