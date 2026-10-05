<?php

namespace App\Http\Controllers\Public;

use App\Http\Controllers\Controller;
use App\Models\ClassWorkspace;
use Illuminate\Http\Request;

class BaseCodeController extends Controller
{
    /**
     * Resolve a base code to its canonical public URL.
     *
     * Accepts a short base code (e.g. `RPLA`) and redirects to the base's
     * canonical route (`/b/{slug}`). Returns a validation error if the code
     * does not match an active base. Does not reveal whether other base codes
     * exist.
     *
     * @summary Resolve Base Code
     * @tags Bases
     * @unauthenticated
     */
    public function resolve(Request $request)
    {
        $request->validate([
            'code' => 'required|string|max:50',
        ]);

        $code  = trim($request->input('code'));
        $class = ClassWorkspace::where('short_code', $code)
            ->where('is_active', true)
            ->first();

        if (!$class) {
            return back()->withErrors([
                'code' => 'Base tidak ditemukan atau sedang tidak tersedia.',
            ])->withInput();
        }

        return redirect()->route('public.base.show', ['slug' => $class->slug]);
    }
}
