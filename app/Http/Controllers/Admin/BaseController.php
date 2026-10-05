<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\ClassWorkspace;
use App\Support\MemberRole;
use Illuminate\Http\Request;
use Inertia\Inertia;

class BaseController extends Controller
{
    /**
     * Show the create-base form.
     *
     * @summary Show Create Base Form
     * @tags Admin
     */
    public function create()
    {
        return Inertia::render('Admin/CreateBase');
    }

    /**
     * Create a new base.
     *
     * Creates a base and automatically assigns the authenticated user as
     * `owner`. The owner is the primary administrator with exclusive rights
     * to manage invitations and admin membership.
     *
     * @summary Create Base
     * @tags Admin
     */
    public function store(Request $request)
    {
        $data = $request->validate([
            'name'             => 'required|string|max:100',
            'slug'             => 'required|string|max:80|regex:/^[a-z0-9]+(?:-[a-z0-9]+)*$/|unique:classes,slug',
            'short_code'       => 'required|string|max:20',
            'instagram_handle' => 'nullable|string|max:100',
            'website_label'    => 'nullable|string|max:100',
        ]);

        $class = ClassWorkspace::create([
            'name'             => $data['name'],
            'slug'             => $data['slug'],
            'short_code'       => $data['short_code'],
            'instagram_handle' => $data['instagram_handle'] ?? null,
            'website_label'    => $data['website_label'] ?? null,
            'is_active'        => true,
        ]);

        // Creator becomes owner
        $class->members()->attach($request->user()->id, [
            'role'       => MemberRole::Owner->value,
            'created_at' => now(),
        ]);

        // Seed default categories
        $defaults = ['Curhat', 'Crush', 'Pertanyaan', 'Info', 'Random', 'Lainnya'];
        foreach ($defaults as $name) {
            $class->tags()->create([
                'name' => $name,
                'slug' => \Illuminate\Support\Str::slug($name),
            ]);
        }

        return redirect()->route('admin.classes.overview', ['class' => $class->id])
            ->with('success', 'Base berhasil dibuat!');
    }
}
