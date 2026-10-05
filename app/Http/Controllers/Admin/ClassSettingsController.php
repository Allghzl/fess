<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\ClassWorkspace;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Inertia\Inertia;

class ClassSettingsController extends Controller
{
    /**
     * Get base settings.
     *
     * @summary Get Base Settings
     * @tags Base Settings
     */
    public function index(ClassWorkspace $class)
    {
        $this->authorize('update', $class);

        return Inertia::render('Admin/Settings/Index', [
            'class' => $class,
            'tags'  => $class->tags()->orderBy('name')->get(['id', 'name', 'slug']),
        ]);
    }

    /**
     * Update base settings.
     *
     * @summary Update Base Settings
     * @tags Base Settings
     */
    public function update(Request $request, ClassWorkspace $class)
    {
        $this->authorize('update', $class);

        $data = $request->validate([
            'name'                     => 'required|string|max:255',
            'short_code'               => 'required|string|max:20',
            'instagram_handle'         => 'nullable|string|max:100',
            'website_label'            => 'nullable|string|max:255',
            'logo'                     => 'nullable|image|max:4096',
            'default_show_logo'        => 'boolean',
            'default_show_website_url' => 'boolean',
            'default_preset'           => 'nullable|in:editorial_geometry,typographic_poster,quiet_editorial,grid_technical,bold_block',
            'default_background_color' => 'nullable|string|regex:/^#[0-9A-Fa-f]{3,6}$/',
            'default_pattern_key'      => 'nullable|string|in:dots,grid,diagonal_lines,plus,circles,triangles,checker,waves,',
            'default_pattern_color'    => 'nullable|string|regex:/^#[0-9A-Fa-f]{3,6}$/',
            'default_pattern_opacity'  => 'nullable|numeric|min:0|max:1',
        ]);

        if ($request->hasFile('logo')) {
            $path = $request->file('logo')->store('logos', 'public');
            $class->logo_asset_key = $path;
        }

        $class->name             = $data['name'];
        $class->short_code       = $data['short_code'];
        $class->instagram_handle = $data['instagram_handle'] ?? null;
        $class->website_label    = $data['website_label'] ?? null;

        $settings = $class->settings ?? [];
        $settings['default_render'] = [
            'show_logo'        => $data['default_show_logo'] ?? true,
            'show_website_url' => $data['default_show_website_url'] ?? true,
            'preset'           => $data['default_preset'] ?? 'editorial_geometry',
            'background_color' => $data['default_background_color'] ?? null,
            'pattern_key'      => $data['default_pattern_key'] ?: null,
            'pattern_color'    => $data['default_pattern_color'] ?? null,
            'pattern_opacity'  => isset($data['default_pattern_opacity']) ? (float) $data['default_pattern_opacity'] : null,
        ];
        $class->settings = $settings;
        $class->save();

        return back()->with('success', 'Settings saved.');
    }
}
