<?php
namespace App\Music\Providers;

use App\Music\Contracts\MusicProvider;
use App\Music\MusicProviderHealth;
use App\Music\MusicSearchResult;
use App\Music\MusicTrack;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class YouTubeMusicProvider implements MusicProvider
{
    public function name(): string  { return 'youtube_music'; }
    public function label(): string { return 'YouTube Music'; }

    public function isEnabled(): bool
    {
        return in_array('youtube_music', config('music.providers', []), true);
    }

    public function search(string $query, int $page, int $limit): MusicSearchResult
    {
        if (!$this->isEnabled()) return new MusicSearchResult([], 0, false, $this->name());

        $cacheKey = 'music:yt:' . md5($query . ':' . $page . ':' . $limit);
        $ttl = (int) config('music.cache_ttl', 60);
        $cfg = config('music.youtube_music');

        return Cache::remember($cacheKey, $ttl, function () use ($query, $page, $limit, $cfg) {
            try {
                $offset = ($page - 1) * $limit;
                $response = Http::timeout($cfg['timeout'])
                    ->get($cfg['base_url'] . '/search', [
                        'q'        => $query,
                        'limit'    => $limit,
                        'language' => $cfg['language'],
                        'region'   => $cfg['region'],
                    ]);

                if (!$response->successful()) {
                    Log::warning('YouTubeMusicProvider: search failed', [
                        'status' => $response->status(), 'query' => $query,
                    ]);
                    return new MusicSearchResult([], 0, false, $this->name());
                }

                $data = $response->json();
                $tracks = array_map(
                    fn($t) => $this->normalise($t),
                    array_filter($data['tracks'] ?? [], fn($t) => !empty($t['trackId']))
                );

                return new MusicSearchResult(
                    array_values(array_filter($tracks)),
                    (int)($data['total'] ?? count($tracks)),
                    (bool)($data['hasMore'] ?? false),
                    $this->name(),
                );
            } catch (\Throwable $e) {
                Log::error('YouTubeMusicProvider: exception', ['error' => $e->getMessage()]);
                return new MusicSearchResult([], 0, false, $this->name());
            }
        });
    }

    public function getTrack(string $trackId): ?MusicTrack
    {
        $cfg = config('music.youtube_music');
        try {
            $response = Http::timeout($cfg['timeout'])
                ->get($cfg['base_url'] . '/track/' . urlencode($trackId));
            if (!$response->successful()) return null;
            return $this->normalise($response->json());
        } catch (\Throwable) { return null; }
    }

    public function health(): MusicProviderHealth
    {
        $cfg = config('music.youtube_music');
        try {
            $t0 = microtime(true);
            $r  = Http::timeout(3)->get($cfg['base_url'] . '/health');
            $ms = round((microtime(true) - $t0) * 1000);
            return new MusicProviderHealth($this->name(), $r->successful(), null, $ms);
        } catch (\Throwable $e) {
            return new MusicProviderHealth($this->name(), false, $e->getMessage());
        }
    }

    private function normalise(array $t): ?MusicTrack
    {
        if (empty($t['trackId']) || empty($t['title'])) return null;
        return new MusicTrack(
            provider:            'youtube_music',
            trackId:             (string)$t['trackId'],
            title:               (string)$t['title'],
            artist:              $t['artist'] ?? null,
            album:               $t['album'] ?? null,
            artworkUrl:          $t['artworkUrl'] ?? null,
            trackUrl:            $t['trackUrl'] ?? null,
            durationMs:          isset($t['durationMs']) ? (int)$t['durationMs'] : null,
            previewAvailable:    true,
            previewType:         'youtube_iframe',
            previewUrl:          null,
            previewVideoId:      (string)$t['trackId'],
            previewStartMs:      0,
            previewDurationMs:   30000,
            license:             null,
            licenseUrl:          null,
            attributionText:     'YouTube Music',
            attributionRequired: true,
            explicit:            null,
            providerLabel:       'YouTube Music',
        );
    }
}
