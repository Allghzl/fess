<?php

namespace App\Support;

enum SubmissionStatus: string
{
    case Submitted       = 'submitted';
    case UnderReview     = 'under_review';
    case Approved        = 'approved';
    case Rejected        = 'rejected';
    case TakedownRequested = 'takedown_requested';
    case TakenDown       = 'taken_down';
    case Archived        = 'archived';
}
