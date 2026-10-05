<?php

namespace App\Support;

enum TakedownStatus: string
{
    case Pending   = 'pending';
    case Reviewing = 'reviewing';
    case Approved  = 'approved';
    case Rejected  = 'rejected';
    case Resolved  = 'resolved';
}
