<?php

namespace App\Http\Middleware;

use Illuminate\Http\Request;
use Inertia\Middleware;
use Tighten\Ziggy\Ziggy;

class HandleInertiaRequests extends Middleware
{
    protected $rootView = 'app';

    public function version(Request $request): ?string
    {
        return parent::version($request);
    }

    public function share(Request $request): array
    {
        return [
            ...parent::share($request),
            'auth' => [
                'user' => $request->user() ? [
                    'id'         => $request->user()->id,
                    'name'       => $request->user()->name,
                    'email'      => $request->user()->email,
                    'avatar_key' => $request->user()->avatar_key,
                ] : null,
            ],
            'url'   => $request->path() === '/' ? '/' : '/' . $request->path(),
            'ziggy' => fn () => [
                ...(new Ziggy)->toArray(),
                'location' => $request->url(),
            ],
            // Shared for AdminLayout base-switcher: lightweight list, only for authed users
            'bases' => fn () => $request->user()
                ? $request->user()->classes()->get()->map(fn ($c) => [
                    'id'         => $c->id,
                    'name'       => $c->name,
                    'short_code' => $c->short_code,
                ])->values()->all()
                : [],
        ];
    }
}
