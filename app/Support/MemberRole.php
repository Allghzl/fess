<?php

namespace App\Support;

enum MemberRole: string
{
    case Owner = 'owner';
    case Admin = 'admin';
}
