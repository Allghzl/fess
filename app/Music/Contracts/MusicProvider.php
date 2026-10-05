<?php
namespace App\Music\Contracts;

use App\Music\MusicSearchResult;
use App\Music\MusicTrack;
use App\Music\MusicProviderHealth;

interface MusicProvider
{
    public function name(): string;
    public function label(): string;
    public function isEnabled(): bool;

    public function search(string $query, int $page, int $limit): MusicSearchResult;
    public function getTrack(string $trackId): ?MusicTrack;
    public function health(): MusicProviderHealth;
}
