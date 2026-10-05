<?php

namespace App\Providers;

use App\Models\ClassDesign;
use App\Models\ClassWorkspace;
use App\Models\Submission;
use App\Models\TakedownRequest;
use App\Policies\ClassDesignPolicy;
use App\Policies\ClassWorkspacePolicy;
use App\Policies\SubmissionPolicy;
use App\Policies\TakedownRequestPolicy;
use Dedoc\Scramble\Scramble;
use Dedoc\Scramble\Support\RouteInfo;
use Illuminate\Support\Facades\Gate;
use Illuminate\Support\ServiceProvider;

class AppServiceProvider extends ServiceProvider
{
    public function register(): void
    {
        $this->app->singleton(\App\Services\PublicIdGenerator::class);
        $this->app->singleton(\App\Services\PinatAuthService::class);
    }

    public function boot(): void
    {
        Gate::policy(ClassWorkspace::class, ClassWorkspacePolicy::class);
        Gate::policy(Submission::class, SubmissionPolicy::class);
        Gate::policy(ClassDesign::class, ClassDesignPolicy::class);
        Gate::policy(TakedownRequest::class, TakedownRequestPolicy::class);

        Scramble::routes(function (RouteInfo $route) {
            return ! str_starts_with($route->route->uri(), 'docs');
        });
    }
}
