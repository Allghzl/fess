<?php
namespace App\Music\Providers;

use App\Music\Contracts\MusicProvider;
use App\Music\MusicProviderHealth;
use App\Music\MusicSearchResult;
use App\Music\MusicTrack;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class AppleMusicProvider implements MusicProvider
{
    private const ITUNES_URL = 'https://itunes.apple.com';

    public function name(): string  { return 'apple'; }
    public function label(): string { return 'Apple Music'; }

    public function isEnabled(): bool
    {
        return in_array('apple', config('music.providers', []), true);
    }

    public function search(string $query, int $page, int $limit): MusicSearchResult
    {
        if (!$this->isEnabled()) return new MusicSearchResult([], 0, false, $this->name());

        $cfg      = config('music.apple');
        $cacheKey = 'music:ap:' . md5($query . ':' . $page . ':' . $limit . ':' . $cfg['country']);
        $ttl      = (int) config('music.cache_ttl', 60);

        return Cache::remember($cacheKey, $ttl, function () use ($query, $page, $limit, $cfg) {
            try {
                // iTunes search does not support offset pagination natively
                $response = Http::timeout($cfg['timeout'])
                    ->get(self::ITUNES_URL . '/search', [
                        'term'      => $query,
                        'entity'    => 'song',
                        'country'   => $cfg['country'],
                        'limit'     => min(50, $limit),
                        'explicit'  => 'Yes',
                    ]);

                if (!$response->successful()) {
                    Log::warning('AppleMusicProvider: search failed', ['status' => $response->status()]);
                    return new MusicSearchResult([], 0, false, $this->name());
                }

                $items  = $response->json('results', []);
                $tracks = array_values(array_filter(array_map([$this, 'normalise'], $items)));
                return new MusicSearchResult($tracks, count($tracks), false, $this->name());
            } catch (\Throwable $e) {
                Log::error('AppleMusicProvider: exception', ['error' => $e->getMessage()]);
                return new MusicSearchResult([], 0, false, $this->name());
            }
        });
    }

    public function getTrack(string $trackId): ?MusicTrack
    {
        $cfg = config('music.apple');
        try {
            $r = Http::timeout($cfg['timeout'])
                ->get(self::ITUNES_URL . '/lookup', ['id' => $trackId, 'entity' => 'song']);
            if (!$r->successful()) return null;
            $results = $r->json('results', []);
            return !empty($results[0]) ? $this->normalise($results[0]) : null;
        } catch (\Throwable) { return null; }
    }

    public function health(): MusicProviderHealth
    {
        try {
            $t0 = microtime(true);
            $r  = Http::timeout(3)->get(self::ITUNES_URL . '/search', ['term' => 'test', 'limit' => 1]);
            $ms = round((microtime(true) - $t0) * 1000);
            return new MusicProviderHealth($this->name(), $r->successful(), null, $ms);
        } catch (\Throwable $e) {
            return new MusicProviderHealth($this->name(), false, $e->getMessage());
        }
    }

    private function normalise(array $t): ?MusicTrack
    {
        if (empty($t['trackId']) || empty($t['trackName'])) return null;
        if (($t['kind'] ?? '') !== 'song') return null;
        $artworkUrl = isset($t['artworkUrl100'])
            ? str_replace('100x100', '480x480', $t['artworkUrl100'])
            : null;
        return new MusicTrack(
            provider:            'apple',
            trackId:             (string)$t['trackId'],
            title:               (string)$t['trackName'],
            artist:              $t['artistName'] ?? null,
            album:               $t['collectionName'] ?? null,
            artworkUrl:          $artworkUrl,
            trackUrl:            $t['trackViewUrl'] ?? null,
            durationMs:          isset($t['trackTimeMillis']) ? (int)$t['trackTimeMillis'] : null,
            previewAvailable:    false,   // Apple: metadata only by default
            previewType:         null,
            previewUrl:          null,
            previewVideoId:      null,
            previewStartMs:      0,
            previewDurationMs:   30000,
            license:             null,
            licenseUrl:          null,
            attributionText:     null,
            attributionRequired: false,
            explicit:            ($t['trackExplicitness'] ?? '') === 'explicit',
            providerLabel:       'Apple Music',
        );
    }
}
