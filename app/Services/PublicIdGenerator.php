<?php

namespace App\Services;

use App\Models\Submission;
use Illuminate\Support\Str;
use RuntimeException;

class PublicIdGenerator
{
    const ALPHABET   = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
    const SEGMENT_LEN = 6;
    const MAX_RETRIES = 10;

    public function generate(): string
    {
        $prefix = strtoupper(config('menfess.public_id_prefix', 'MF'));

        for ($i = 0; $i < self::MAX_RETRIES; $i++) {
            $segment = $this->randomSegment();
            $id      = $prefix . '-' . $segment;

            if (!Submission::where('public_id', $id)->exists()) {
                return $id;
            }
        }

        throw new RuntimeException('PublicIdGenerator: max retries exceeded — collision storm');
    }

    public function normalize(string $input): string
    {
        $input  = strtoupper(trim($input));
        $prefix = strtoupper(config('menfess.public_id_prefix', 'MF'));

        // Accept "MFK7X4QM" (no hyphen) → "MF-K7X4QM"
        if (!str_contains($input, '-') && str_starts_with($input, $prefix)) {
            $segment = substr($input, strlen($prefix));
            $input   = $prefix . '-' . $segment;
        }

        return $input;
    }

    public function isValid(string $id): bool
    {
        $prefix  = strtoupper(config('menfess.public_id_prefix', 'MF'));
        $pattern = '/^' . preg_quote($prefix, '/') . '-[' . self::ALPHABET . ']{' . self::SEGMENT_LEN . '}$/';
        return (bool) preg_match($pattern, $id);
    }

    private function randomSegment(): string
    {
        $len    = strlen(self::ALPHABET);
        $result = '';
        for ($i = 0; $i < self::SEGMENT_LEN; $i++) {
            $result .= self::ALPHABET[random_int(0, $len - 1)];
        }
        return $result;
    }
}
