<?php

namespace App\Policies;

use App\Models\TakedownRequest;
use App\Models\User;

class TakedownRequestPolicy
{
    public function view(User $user, TakedownRequest $request): bool
    {
        return $user->isMemberOf($request->classWorkspace);
    }

    public function handle(User $user, TakedownRequest $request): bool
    {
        return $user->isMemberOf($request->classWorkspace);
    }
}
