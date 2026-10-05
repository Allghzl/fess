<?php

namespace App\Services;

use Illuminate\Support\Facades\Http;

/**
 * Audius music provider service.
 *
 * Uses the official Audius public API (api.audius.co gateway).
 * All requests are read-only and unauthenticated.
 */
class AudiusService
{
    private const BASE_URL    = 'https://api.audius.co';
    private const APP_NAME    = 'Pinatmenfess';
    private const TIMEOUT_SEC = 8;

    /**
     * Search tracks by query string.
     *
     * Returns normalised track objects ready for the frontend.
     */
    public function searchTracks(string $query, int $limit = 20, int $offset = 0): array
    {
        if (trim($query) === '') return ['tracks' => [], 'total' => 0, 'hasMore' => false];

        try {
            $response = Http::timeout(self::TIMEOUT_SEC)
                ->withHeaders(['X-App-Name' => self::APP_NAME])
                ->get(self::BASE_URL . '/v1/tracks/search', [
                    'query'  => $query,
                    'limit'  => min(50, max(1, $limit)),
                    'offset' => max(0, $offset),
                ]);

            if (!$response->successful()) {
                return ['tracks' => [], 'total' => 0, 'hasMore' => false];
            }

            $data   = $response->json('data', []);
            $tracks = array_map([$this, 'normaliseTrack'], $data);

            return [
                'tracks'  => array_values(array_filter($tracks)),
                'total'   => count($data),
                'hasMore' => count($data) >= $limit,
            ];
        } catch (\Throwable) {
            return ['tracks' => [], 'total' => 0, 'hasMore' => false];
        }
    }

    /**
     * Return the stream URL for a track (redirect target).
     * Returns null when the track is not streamable or not found.
     */
    public function getStreamUrl(string $trackId): ?string
    {
        // Validate track ID format (alphanumeric, Audius uses base58-like IDs)
        if (!preg_match('/^[A-Za-z0-9]{5,30}$/', $trackId)) return null;

        try {
            // Verify track exists + is streamable before issuing the redirect
            $response = Http::timeout(self::TIMEOUT_SEC)
                ->withHeaders(['X-App-Name' => self::APP_NAME])
                ->get(self::BASE_URL . '/v1/tracks/' . urlencode($trackId));

            if (!$response->successful()) return null;

            $track = $response->json('data');
            if (empty($track)) return null;

            // Respect provider restrictions
            if (isset($track['is_streamable']) && $track['is_streamable'] === false) return null;

            return self::BASE_URL . '/v1/tracks/' . urlencode($trackId) . '/stream'
                . '?app_name=' . urlencode(self::APP_NAME);
        } catch (\Throwable) {
            return null;
        }
    }

    /**
     * Normalise a raw Audius API track object to our frontend contract.
     */
    private function normaliseTrack(array $track): ?array
    {
        if (empty($track['id']) || empty($track['title'])) return null;

        $artwork = $track['artwork'] ?? [];
        $artworkUrl = $artwork['480x480'] ?? $artwork['150x150'] ?? $artwork['1000x1000'] ?? null;

        $durationMs = isset($track['duration']) ? (int)($track['duration'] * 1000) : null;

        // Attribution: check license field
        $license             = $track['license'] ?? null;
        $attributionRequired = !empty($license) && stripos($license, 'cc') !== false
            && stripos($license, 'by') !== false;

        return [
            'provider'            => 'audius',
            'trackId'             => $track['id'],
            'title'               => $track['title'],
            'artist'              => $track['user']['name'] ?? null,
            'artworkUrl'          => $artworkUrl,
            'trackUrl'            => $track['permalink'] ?? null,
            'durationMs'          => $durationMs,
            'isStreamable'        => $track['is_streamable'] ?? true,
            'license'             => $license,
            'licenseUrl'          => null,
            'attributionText'     => $attributionRequired
                ? (($track['user']['name'] ?? '') . ' — ' . ($track['title'] ?? ''))
                : null,
            'attributionRequired' => $attributionRequired,
        ];
    }
}
