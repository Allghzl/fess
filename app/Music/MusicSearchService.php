<?php
namespace App\Music;

use App\Music\Contracts\MusicProvider;
use App\Music\Providers\AudiusProvider;
use App\Music\Providers\AppleMusicProvider;
use App\Music\Providers\SpotifyProvider;
use App\Music\Providers\YouTubeMusicProvider;
use Illuminate\Support\Facades\Log;

class MusicSearchService
{
    /** @var MusicProvider[] */
    private array $providers;

    public function __construct(
        YouTubeMusicProvider $youtube,
        SpotifyProvider      $spotify,
        AppleMusicProvider   $apple,
        AudiusProvider       $audius,
    ) {
        $this->providers = [$youtube, $spotify, $apple, $audius];
    }

    public function search(string $query, int $page, int $limit): array
    {
        $enabled = array_filter($this->providers, fn($p) => $p->isEnabled());

        if (empty($enabled)) {
            return ['tracks' => [], 'total' => 0, 'hasMore' => false];
        }

        // Each provider is already cached internally; just call them
        // Sequential with individual try/catch — one failure doesn't kill others
        $allTracks = [];
        foreach ($enabled as $provider) {
            try {
                $result = $provider->search($query, $page, $limit);
                foreach ($result->tracks as $track) {
                    $allTracks[] = $track;
                }
            } catch (\Throwable $e) {
                Log::warning('MusicSearchService: provider failed', [
                    'provider' => $provider->name(),
                    'error'    => $e->getMessage(),
                ]);
            }
        }

        $deduped = $this->deduplicate($allTracks);
        $ranked  = $this->rank($deduped, $query);
        $paged   = array_slice($ranked, 0, $limit);

        return [
            'tracks'  => array_map(fn(MusicTrack $t) => $t->toArray(), $paged),
            'total'   => count($ranked),
            'hasMore' => count($ranked) > $limit,
        ];
    }

    public function healthAll(): array
    {
        $out = [];
        foreach ($this->providers as $p) {
            if (!$p->isEnabled()) continue;
            try {
                $h = $p->health();
                $out[$p->name()] = [
                    'healthy'   => $h->healthy,
                    'message'   => $h->message,
                    'latencyMs' => $h->latencyMs,
                ];
            } catch (\Throwable $e) {
                $out[$p->name()] = ['healthy' => false, 'message' => $e->getMessage()];
            }
        }
        return $out;
    }

    /**
     * Deduplicate by ISRC (if available) then by normalized title+artist.
     * When duplicate: prefer previewAvailable, then provider priority order.
     */
    private function deduplicate(array $tracks): array
    {
        $providerPriority = ['youtube_music' => 0, 'spotify' => 1, 'apple' => 2, 'audius' => 3];
        $seen = [];
        $result = [];

        foreach ($tracks as $track) {
            $key = $this->dedupeKey($track);
            if (!isset($seen[$key])) {
                $seen[$key] = $track;
                $result[$key] = $track;
            } else {
                $existing = $seen[$key];
                // Prefer: preview available > provider priority
                $existPri = $providerPriority[$existing->provider] ?? 99;
                $newPri   = $providerPriority[$track->provider] ?? 99;
                if ((!$existing->previewAvailable && $track->previewAvailable)
                    || ($track->previewAvailable === $existing->previewAvailable && $newPri < $existPri)) {
                    $seen[$key]   = $track;
                    $result[$key] = $track;
                }
            }
        }

        return array_values($result);
    }

    private function dedupeKey(MusicTrack $track): string
    {
        $title  = mb_strtolower(preg_replace('/[^\p{L}\p{N}]/u', '', $track->title ?? ''));
        $artist = mb_strtolower(preg_replace('/[^\p{L}\p{N}]/u', '', $track->artist ?? ''));
        return $title . '|' . $artist;
    }

    /**
     * Rank: YouTube official > preview available > provider priority > duration available
     */
    private function rank(array $tracks, string $query): array
    {
        $queryNorm = mb_strtolower($query);
        $providerPriority = ['youtube_music' => 0, 'spotify' => 1, 'apple' => 2, 'audius' => 3];

        usort($tracks, function (MusicTrack $a, MusicTrack $b) use ($queryNorm, $providerPriority) {
            // 1. Exact title match boost
            $aTitleMatch = str_contains(mb_strtolower($a->title ?? ''), $queryNorm) ? 0 : 1;
            $bTitleMatch = str_contains(mb_strtolower($b->title ?? ''), $queryNorm) ? 0 : 1;
            if ($aTitleMatch !== $bTitleMatch) return $aTitleMatch - $bTitleMatch;

            // 2. Preview available
            if ($a->previewAvailable !== $b->previewAvailable) {
                return $a->previewAvailable ? -1 : 1;
            }

            // 3. Provider priority
            $aPri = $providerPriority[$a->provider] ?? 99;
            $bPri = $providerPriority[$b->provider] ?? 99;
            return $aPri - $bPri;
        });

        return $tracks;
    }
}
