<?php
namespace App\Music\Providers;

use App\Music\Contracts\MusicProvider;
use App\Music\MusicProviderHealth;
use App\Music\MusicSearchResult;
use App\Music\MusicTrack;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class SpotifyProvider implements MusicProvider
{
    public function name(): string  { return 'spotify'; }
    public function label(): string { return 'Spotify'; }

    public function isEnabled(): bool
    {
        return in_array('spotify', config('music.providers', []), true);
    }

    public function search(string $query, int $page, int $limit): MusicSearchResult
    {
        if (!$this->isEnabled()) return new MusicSearchResult([], 0, false, $this->name());

        $cacheKey = 'music:sp:' . md5($query . ':' . $page . ':' . $limit);
        $ttl = (int) config('music.cache_ttl', 60);
        $cfg = config('music.spotify');

        return Cache::remember($cacheKey, $ttl, function () use ($query, $page, $limit, $cfg) {
            try {
                $response = Http::timeout($cfg['timeout'])
                    ->get($cfg['base_url'] . '/api/search', [
                        'q'      => $query,
                        'type'   => 'track',
                        'limit'  => $limit,
                        'offset' => ($page - 1) * $limit,
                    ]);

                if (!$response->successful()) {
                    Log::warning('SpotifyProvider: search failed', ['status' => $response->status()]);
                    return new MusicSearchResult([], 0, false, $this->name());
                }

                $data   = $response->json();
                // xwolf may return { tracks: { items: [...] } } or { items: [...] }
                $items  = $data['tracks']['items'] ?? $data['items'] ?? $data['results'] ?? [];
                $tracks = array_values(array_filter(array_map([$this, 'normalise'], $items)));

                return new MusicSearchResult(
                    $tracks,
                    $data['tracks']['total'] ?? $data['total'] ?? count($tracks),
                    !empty($data['tracks']['next']) || (count($items) >= $limit),
                    $this->name(),
                );
            } catch (\Throwable $e) {
                Log::error('SpotifyProvider: exception', ['error' => $e->getMessage()]);
                return new MusicSearchResult([], 0, false, $this->name());
            }
        });
    }

    public function getTrack(string $trackId): ?MusicTrack
    {
        $cfg = config('music.spotify');
        try {
            $r = Http::timeout($cfg['timeout'])
                ->get($cfg['base_url'] . '/api/track/' . urlencode($trackId));
            return $r->successful() ? $this->normalise($r->json()) : null;
        } catch (\Throwable) { return null; }
    }

    public function health(): MusicProviderHealth
    {
        $cfg = config('music.spotify');
        try {
            $t0 = microtime(true);
            $r  = Http::timeout(3)->get($cfg['base_url'] . '/api/search', ['q' => 'test', 'limit' => 1]);
            $ms = round((microtime(true) - $t0) * 1000);
            return new MusicProviderHealth($this->name(), $r->successful(), null, $ms);
        } catch (\Throwable $e) {
            return new MusicProviderHealth($this->name(), false, $e->getMessage());
        }
    }

    private function normalise(array $t): ?MusicTrack
    {
        if (empty($t['id']) || empty($t['name'])) return null;
        $artists   = $t['artists'] ?? [];
        $artistStr = implode(', ', array_column($artists, 'name'));
        $images    = $t['album']['images'] ?? $t['images'] ?? [];
        $artwork   = $images[0]['url'] ?? null;
        return new MusicTrack(
            provider:            'spotify',
            trackId:             (string)$t['id'],
            title:               (string)$t['name'],
            artist:              $artistStr ?: null,
            album:               $t['album']['name'] ?? null,
            artworkUrl:          $artwork,
            trackUrl:            $t['external_urls']['spotify'] ?? null,
            durationMs:          isset($t['duration_ms']) ? (int)$t['duration_ms'] : null,
            previewAvailable:    false,   // Spotify: no audio preview for Menfess
            previewType:         null,
            previewUrl:          null,
            previewVideoId:      null,
            previewStartMs:      0,
            previewDurationMs:   30000,
            license:             null,
            licenseUrl:          null,
            attributionText:     null,
            attributionRequired: false,
            explicit:            $t['explicit'] ?? null,
            providerLabel:       'Spotify',
        );
    }
}
