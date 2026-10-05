<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\ClassDesign;
use App\Models\ClassWorkspace;
use App\Services\ClassDesignService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Inertia\Inertia;

class DesignController extends Controller
{
    public function __construct(private ClassDesignService $service) {}

    /**
     * List custom designs for a base.
     *
     * Returns all Story and Feed custom background designs. Each base may
     * have at most 3 Story and 3 Feed designs.
     *
     * @summary List Custom Designs
     * @tags Custom Designs
     */
    public function index(ClassWorkspace $class)
    {
        $this->authorize('view', $class);

        $designs = ClassDesign::where('class_id', $class->id)
            ->orderBy('format')
            ->orderBy('slot_index')
            ->get();

        return Inertia::render('Admin/Designs/Index', [
            'class'   => $class,
            'designs' => $designs,
        ]);
    }

    /**
     * Upload a custom background design.
     *
     * Uploads a background image (JPEG, PNG, WebP) and stores it in
     * MinIO/S3. Accepts initial crop metadata and render layer settings.
     * Enforces the 3-slot limit per format.
     *
     * @summary Upload Custom Design
     * @tags Custom Designs
     */
    public function store(Request $request, ClassWorkspace $class)
    {
        $this->authorize('view', $class);
        $request->validate([
            'format'     => 'required|in:story,feed_portrait',
            'slot_index' => 'required|in:1,2,3',
            'name'       => 'nullable|string|max:100',
            'image'      => 'required|file|mimes:jpg,jpeg,png,webp|max:20480',
        ]);

        $design = $this->service->upload(
            $class,
            $request->only('format', 'slot_index', 'name'),
            $request->file('image'),
            $request->user()->id
        );

        return redirect()
            ->route('admin.classes.designs.show', [$class, $design])
            ->with('success', 'Design uploaded.');
    }

    /**
     * Get a custom design.
     *
     * @summary Get Custom Design
     * @tags Custom Designs
     */
    public function show(ClassWorkspace $class, ClassDesign $design)
    {
        $this->authorize('view', $class);
        abort_if($design->class_id !== $class->id, 404);

        $previewUrl = $this->signedUrl($design->source_asset_key);

        return Inertia::render('Admin/Designs/Show', [
            'class'      => $class,
            'design'     => $design,
            'previewUrl' => $previewUrl,
        ]);
    }

    /**
     * Update design settings or crop metadata.
     *
     * @summary Update Custom Design
     * @tags Custom Designs
     */
    public function update(Request $request, ClassWorkspace $class, ClassDesign $design)
    {
        $this->authorize('view', $class);
        abort_if($design->class_id !== $class->id, 404);

        $request->validate([
            'name'    => 'nullable|string|max:100',
            'focal_x' => 'nullable|numeric|min:0|max:1',
            'focal_y' => 'nullable|numeric|min:0|max:1',
        ]);

        $design = $this->service->update($design, $request->only('name', 'focal_x', 'focal_y'));

        return back()->with('success', 'Design updated.');
    }

    /**
     * Delete a custom design.
     *
     * Removes the design and its source image from storage.
     *
     * @summary Delete Custom Design
     * @tags Custom Designs
     */
    public function destroy(ClassWorkspace $class, ClassDesign $design)
    {
        $this->authorize('view', $class);
        abort_if($design->class_id !== $class->id, 404);

        $this->service->delete($design);

        return redirect()
            ->route('admin.classes.designs.index', $class)
            ->with('success', 'Design deleted.');
    }

    /**
     * Derive a Feed design from a Story design.
     *
     * Creates a Feed 4:5 version of a Story design using cover-crop math.
     * Never stretches or squashes the image. Uses `feed_fallback_crop`
     * metadata if available.
     *
     * @summary Derive Feed from Story
     * @tags Custom Designs
     */
    public function deriveFeed(Request $request, ClassWorkspace $class, ClassDesign $design)
    {
        $this->authorize('view', $class);
        abort_if($design->class_id !== $class->id, 404);

        $request->validate([
            'focal_x' => 'nullable|numeric|min:0|max:1',
            'focal_y' => 'nullable|numeric|min:0|max:1',
        ]);

        $design = $this->service->deriveFeedCrop(
            $design,
            (float) $request->input('focal_x', 0.5),
            (float) $request->input('focal_y', 0.5)
        );

        return response()->json(['feed_fallback_crop' => $design->feed_fallback_crop]);
    }

    private function signedUrl(?string $key): ?string
    {
        if (!$key) return null;
        try {
            $disk = config('filesystems.default') === 'local' ? 'local' : 's3';
            return Storage::disk($disk)->url($key);
        } catch (\Throwable) {
            return null;
        }
    }
}
