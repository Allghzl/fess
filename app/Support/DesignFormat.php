<?php

namespace App\Support;

enum DesignFormat: string
{
    case Story        = 'story';
    case FeedPortrait = 'feed_portrait';

    public function dimensions(): array
    {
        return match($this) {
            self::Story        => ['width' => 1080, 'height' => 1920],
            self::FeedPortrait => ['width' => 1080, 'height' => 1350],
        };
    }

    public function aspectRatio(): float
    {
        $d = $this->dimensions();
        return $d['width'] / $d['height'];
    }
}
