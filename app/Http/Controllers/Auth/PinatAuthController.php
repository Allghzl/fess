<?php

namespace App\Http\Controllers\Auth;

use App\Http\Controllers\Controller;
use App\Models\User;
use App\Services\PinatAuthService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Str;
use Inertia\Inertia;
use RuntimeException;

class PinatAuthController extends Controller
{
    public function __construct(private PinatAuthService $pinatAuth) {}

    /**
     * Initiate PinatAuth Google OAuth login.
     *
     * Stores a CSRF state token in the session and redirects the user to the
     * PinatAuth Google OAuth consent page. An optional `redirect` query parameter
     * (relative path only) determines where the user lands after authentication.
     *
     * @summary Initiate Login
     * @tags Auth
     * @unauthenticated
     */
    public function login(Request $request)
    {
        $state = Str::random(32);
        $request->session()->put('pinat_oauth_state', $state);

        // Store safe return URL
        $returnTo = $request->input('redirect');
        if ($returnTo && $this->isSafeRedirect($returnTo)) {
            $request->session()->put('auth_return_to', $returnTo);
        }

        $params = http_build_query([
            'redirect_uri' => config('services.pinat_auth.redirect_uri'),
            'state'        => $state,
        ]);

        return redirect(config('services.pinat_auth.url') . '/api/auth/oauth/google?' . $params);
    }

    /**
     * OAuth callback page.
     *
     * Renders the React callback page. The frontend JavaScript reads the access
     * token from the URL fragment and posts it to `/auth/pinat/session`.
     *
     * @summary OAuth Callback Page
     * @tags Auth
     * @unauthenticated
     */
    public function callback(Request $request)
    {
        // Renders a React page — JS reads fragment, posts tokens to /auth/pinat/session
        return Inertia::render('Auth/Callback');
    }

    /**
     * Exchange PinatAuth token for a Laravel session.
     *
     * Verifies the access token via JWKS or the `/api/auth/me` fallback, then
     * creates or updates the local shadow user and establishes a Laravel session.
     * Returns a redirect URL for the frontend to follow.
     *
     * The access token and refresh token are never logged or stored.
     *
     * @summary Establish Session
     * @tags Auth
     * @unauthenticated
     */
    public function session(Request $request)
    {
        $request->validate([
            'access_token'  => 'required|string',
            'refresh_token' => 'nullable|string',
            'state'         => 'required|string',
        ]);

        // CSRF-like state check
        $storedState = $request->session()->pull('pinat_oauth_state');
        if (!$storedState || !hash_equals($storedState, $request->input('state'))) {
            return response()->json(['error' => 'Invalid state'], 422);
        }

        try {
            $claims = $this->pinatAuth->verifyToken($request->input('access_token'));
        } catch (RuntimeException $e) {
            return response()->json(['error' => 'Token verification failed'], 401);
        }

        $puid = $claims['puid'] ?? $claims['sub'] ?? null;
        if (!$puid) {
            return response()->json(['error' => 'No puid in token'], 401);
        }

        $user = User::updateOrCreate(
            ['pinat_puid' => $puid],
            [
                'name'           => $claims['name'] ?? 'Unknown',
                'email'          => $claims['email'] ?? '',
                'last_synced_at' => now(),
            ]
        );

        Auth::login($user);
        $request->session()->regenerate();

        // Never log or store access_token / refresh_token in DB
        $returnTo = $request->session()->pull('auth_return_to', '/admin');
        return response()->json(['redirect' => $returnTo]);
    }

    private function isSafeRedirect(string $url): bool
    {
        if (!str_starts_with($url, '/')) {
            return false;
        }
        if (str_starts_with($url, '//')) {
            return false;
        }
        $blocked = ['/auth/pinat/session', '/auth/callback'];
        foreach ($blocked as $b) {
            if (str_starts_with($url, $b)) {
                return false;
            }
        }
        return true;
    }

    /**
     * Log out the current user.
     *
     * Invalidates the Laravel session and regenerates the CSRF token.
     *
     * @summary Logout
     * @tags Auth
     */
    public function logout(Request $request)
    {
        Auth::logout();
        $request->session()->invalidate();
        $request->session()->regenerateToken();

        return redirect('/');
    }
}
