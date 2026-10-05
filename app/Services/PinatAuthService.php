<?php

namespace App\Services;

use Firebase\JWT\CachedKeySet;
use Firebase\JWT\JWT;
use GuzzleHttp\Client;
use GuzzleHttp\Psr7\HttpFactory;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Http;
use RuntimeException;

class PinatAuthService
{
    public function verifyToken(string $token): array
    {
        $jwksUri = config('services.pinat_auth.jwks_url');

        // ponytail: CachedKeySet requires PSR-17/18; fallback to /api/auth/me if JWKS unavailable
        try {
            $httpClient  = new Client();
            $httpFactory = new HttpFactory();
            $keySet      = new CachedKeySet(
                $jwksUri,
                $httpClient,
                $httpFactory,
                Cache::store(),
                300, // TTL seconds
                true // allow early refresh
            );

            $decoded = JWT::decode($token, $keySet);
            $claims  = (array) $decoded;

            if (($claims['type'] ?? null) !== 'user') {
                throw new RuntimeException('PinatAuth: token type is not user');
            }

            return $claims;
        } catch (\Throwable $e) {
            // Fallback: validate via /api/auth/me
            return $this->fetchUser($token);
        }
    }

    public function fetchUser(string $token): array
    {
        $meUrl = config('services.pinat_auth.me_url');

        $response = Http::withToken($token)
            ->get($meUrl);

        if (!$response->successful()) {
            throw new RuntimeException('PinatAuth: /api/auth/me failed — ' . $response->status());
        }

        $data = $response->json();

        // /api/auth/me returns {"user":{...}} wrapper
        $user = $data['user'] ?? $data;

        if (empty($user['id'])) {
            throw new RuntimeException('PinatAuth: me response missing user id');
        }

        // Normalize to match JWT claims shape
        return array_merge($user, [
            'sub'  => $user['id'],
            'type' => 'user',
        ]);
    }
}
