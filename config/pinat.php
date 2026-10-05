<?php

return [
    'rate_limit' => [
        'submit_per_minute'   => env('SUBMIT_RATE_PER_MINUTE', 5),
        'takedown_per_minute' => env('TAKEDOWN_RATE_PER_MINUTE', 3),
    ],
];
