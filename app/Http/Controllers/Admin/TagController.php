<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\ClassWorkspace;
use App\Models\Tag;
use Illuminate\Http\Request;
use Illuminate\Support\Str;

class TagController extends Controller
{
    /**
     * Create a tag for this base.
     * Owner/admin only. Max 20 tags per base.
     */
    public function store(Request $request, ClassWorkspace $class)
    {
        $this->authorize('update', $class);

        $data = $request->validate([
            'name' => 'required|string|max:60|min:1',
        ]);

        // Sanitize — alphanumeric + space + dash only, no control chars
        $name = trim(preg_replace('/[^\p{L}\p{N}\s\-]/u', '', $data['name']));
        if (mb_strlen($name) < 1) {
            return back()->withErrors(['name' => 'Nama kategori tidak valid.']);
        }

        if ($class->tags()->count() >= 20) {
            return back()->withErrors(['name' => 'Maksimal 20 kategori per base.']);
        }

        $slug = Str::slug($name);

        // Unique within this base
        if ($class->tags()->where('slug', $slug)->exists()) {
            return back()->withErrors(['name' => 'Kategori sudah ada.']);
        }

        $class->tags()->create(['name' => $name, 'slug' => $slug]);

        return back()->with('success', 'Kategori ditambahkan.');
    }

    /**
     * Delete a tag from this base.
     * Automatically detaches from all submissions via cascade.
     */
    public function destroy(ClassWorkspace $class, Tag $tag)
    {
        $this->authorize('update', $class);

        // Cross-base guard
        abort_if($tag->class_id !== $class->id, 404);

        $tag->delete();

        return back()->with('success', 'Kategori dihapus.');
    }
}
