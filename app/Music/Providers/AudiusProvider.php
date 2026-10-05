<?php
namespace App\Music\Providers;

use App\Music\Contracts\MusicProvider;
use App\Music\MusicProviderHealth;
use App\Music\MusicSearchResult;
use App\Music\MusicTrack;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class AudiusProvider implements MusicProvider
{
    public function name(): string  { return 'audius'; }
    public function label(): string { return 'Audius'; }

    public function isEnabled(): bool
    {
        return in_array('audius', config('music.providers', []), true);
    }

    private function cfg(): array { return config('music.audius'); }
    private function headers(): array { return ['X-App-Name' => $this->cfg()['app_name']]; }

    public function search(string $query, int $page, int $limit): MusicSearchResult
    {
        if (!$this->isEnabled()) return new MusicSearchResult([], 0, false, $this->name());

        $cacheKey = 'music:ad:' . md5($query . ':' . $page . ':' . $limit);
        $ttl = (int) config('music.cache_ttl', 60);
        $cfg = $this->cfg();

        return Cache::remember($cacheKey, $ttl, function () use ($query, $page, $limit, $cfg) {
            try {
                $offset   = ($page - 1) * $limit;
                $response = Http::timeout($cfg['timeout'])
                    ->withHeaders($this->headers())
                    ->get($cfg['base_url'] . '/v1/tracks/search', [
                        'query'  => $query,
                        'limit'  => min(50, $limit),
                        'offset' => $offset,
                    ]);

                if (!$response->successful()) {
                    return new MusicSearchResult([], 0, false, $this->name());
                }

                $data   = $response->json('data', []);
                $tracks = array_values(array_filter(array_map([$this, 'normalise'], $data)));
                return new MusicSearchResult($tracks, count($data), count($data) >= $limit, $this->name());
            } catch (\Throwable $e) {
                Log::error('AudiusProvider: search error', ['error' => $e->getMessage()]);
                return new MusicSearchResult([], 0, false, $this->name());
            }
        });
    }

    public function getTrack(string $trackId): ?MusicTrack
    {
        if (!preg_match('/^[A-Za-z0-9]{5,30}$/', $trackId)) return null;
        $cfg = $this->cfg();
        try {
            $r = Http::timeout($cfg['timeout'])
                ->withHeaders($this->headers())
                ->get($cfg['base_url'] . '/v1/tracks/' . urlencode($trackId));
            if (!$r->successful()) return null;
            $data = $r->json('data');
            return $data ? $this->normalise($data) : null;
        } catch (\Throwable) { return null; }
    }

    /**
     * Returns the provider-side stream/preview URL for Audius tracks.
     * SSRF-safe: only returns URLs pointing back to the configured Audius base URL.
     */
    public function getStreamUrl(string $trackId): ?string
    {
        if (!preg_match('/^[A-Za-z0-9]{5,30}$/', $trackId)) return null;
        $cfg = $this->cfg();
        try {
            $r = Http::timeout($cfg['timeout'])
                ->withHeaders($this->headers())
                ->get($cfg['base_url'] . '/v1/tracks/' . urlencode($trackId));
            if (!$r->successful()) return null;
            $track = $r->json('data');
            if (empty($track)) return null;
            if (isset($track['is_streamable']) && $track['is_streamable'] === false) return null;
            return $cfg['base_url'] . '/v1/tracks/' . urlencode($trackId) . '/stream'
                . '?app_name=' . urlencode($cfg['app_name']);
        } catch (\Throwable) { return null; }
    }

    public function health(): MusicProviderHealth
    {
        $cfg = $this->cfg();
        try {
            $t0 = microtime(true);
            $r  = Http::timeout(3)->withHeaders($this->headers())
                ->get($cfg['base_url'] . '/v1/tracks/search', ['query' => 'test', 'limit' => 1]);
            $ms = round((microtime(true) - $t0) * 1000);
            return new MusicProviderHealth($this->name(), $r->successful(), null, $ms);
        } catch (\Throwable $e) {
            return new MusicProviderHealth($this->name(), false, $e->getMessage());
        }
    }

    private function normalise(array $t): ?MusicTrack
    {
        if (empty($t['id']) || empty($t['title'])) return null;
        if (isset($t['is_streamable']) && $t['is_streamable'] === false) return null;

        $artwork = $t['artwork'] ?? [];
        $artworkUrl = $artwork['480x480'] ?? $artwork['150x150'] ?? $artwork['1000x1000'] ?? null;
        $durationMs = isset($t['duration']) ? (int)($t['duration'] * 1000) : null;
        $license    = $t['license'] ?? null;
        $needsAttrib = !empty($license)
            && stripos($license, 'cc')  !== false
            && stripos($license, 'by')  !== false;

        // Preview: use previewCid if available, else regular stream
        $cfg       = $this->cfg();
        $previewUrl = null;
        if (!empty($t['preview_cid'])) {
            $previewUrl = $cfg['base_url'] . '/v1/tracks/' . urlencode($t['id']) . '/stream'
                . '?app_name=' . urlencode($cfg['app_name']) . '&preview=true';
        } elseif ($t['is_streamable'] ?? true) {
            $previewUrl = $cfg['base_url'] . '/v1/tracks/' . urlencode($t['id']) . '/stream'
                . '?app_name=' . urlencode($cfg['app_name']);
        }

        return new MusicTrack(
            provider:            'audius',
            trackId:             (string)$t['id'],
            title:               (string)$t['title'],
            artist:              $t['user']['name'] ?? null,
            album:               null,
            artworkUrl:          $artworkUrl,
            trackUrl:            $t['permalink'] ?? null,
            durationMs:          $durationMs,
            previewAvailable:    $previewUrl !== null,
            previewType:         $previewUrl !== null ? 'audio_url' : null,
            previewUrl:          $previewUrl,
            previewVideoId:      null,
            previewStartMs:      0,
            previewDurationMs:   30000,
            license:             $license,
            licenseUrl:          null,
            attributionText:     $needsAttrib
                ? (($t['user']['name'] ?? '') . ' — ' . $t['title'])
                : null,
            attributionRequired: $needsAttrib,
            explicit:            null,
            providerLabel:       'Audius',
        );
    }
}
