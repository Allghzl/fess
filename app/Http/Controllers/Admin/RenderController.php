<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\ClassWorkspace;
use App\Models\Submission;
use App\Services\ImageRenderer;
use App\Services\RenderConfigResolver;
use App\Support\SubmissionStatus;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use ZipArchive;

class RenderController extends Controller
{
    public function __construct(
        private ImageRenderer $renderer,
        private RenderConfigResolver $resolver,
    ) {}

    // -------------------------------------------------------------------------
    // Settings preview — renders a dummy message with current default settings
    // -------------------------------------------------------------------------
    /**
     * Preview the base's default render settings.
     *
     * Renders a preview PNG using the base's default_render settings with
     * Lorem Ipsum text at the requested length. Useful for checking how
     * the default design looks before publishing. Returns inline PNG.
     *
     * @summary Preview Default Settings
     * @tags Image Generation
     */
    public function settingsPreview(Request $request, ClassWorkspace $class)
    {
        $this->authorizeClassMember($request, $class);

        $request->validate([
            'format'      => 'nullable|in:story,feed_portrait',
            'lorem_chars' => 'nullable|integer|min:50|max:2000',
        ]);

        $format    = $request->input('format', 'story');
        $loremChars = (int) $request->input('lorem_chars', 300);
        $message   = $this->loremIpsum($loremChars);

        // Build config from base defaults
        $dr     = $class->settings['default_render'] ?? [];
        $design = [
            'source'           => 'builtin',
            'preset'           => $dr['preset']           ?? 'editorial_geometry',
            'background_color' => $dr['background_color'] ?? '#1A1F2E',
            'pattern_key'      => $dr['pattern_key']      ?? null,
            'pattern_color'    => $dr['pattern_color']    ?? '#FFFFFF',
            'pattern_opacity'  => $dr['pattern_opacity']  ?? 0.06,
            'format'           => $format,
        ];

        $config = [
            'format'           => $format,
            'show_logo'        => $dr['show_logo']        ?? true,
            'show_website_url' => $dr['show_website_url'] ?? true,
            'show_public_id'   => true,
            'design'           => $design,
            'message'          => $message,
            'target'           => 'Kepada Seseorang',
            'alias'            => null,
            'category'         => 'lorem',
            'public_id'        => 'MF-PRVW01',
            'class'            => [
                'name'             => $class->name,
                'logo_asset_key'   => $class->logo_asset_key,
                'website_label'    => $class->website_label,
                'instagram_handle' => $class->instagram_handle,
            ],
        ];

        $png = $this->renderer->renderPreview($config);

        return response($png, 200, ['Content-Type' => 'image/png']);
    }

    // -------------------------------------------------------------------------
    // Single render — returns downloadable PNG(s)
    // -------------------------------------------------------------------------
    /**
     * Generate a single Instagram image.
     *
     * Renders a Story (1080×1920) or Feed 4:5 (1080×1350) PNG for a single
     * approved submission using PHP GD. Accepts optional overrides for
     * design, logo visibility, and website URL visibility. The public ID
     * watermark is always rendered and cannot be disabled.
     * Returns a PNG file download. The file is temporary and cleaned up after.
     *
     * @summary Generate Post Image
     * @tags Image Generation
     */
    public function render(Request $request, ClassWorkspace $class, Submission $submission)
    {
        $this->authorizeClassMember($request, $class);
        $this->assertApproved($submission, $class);

        $config = $this->buildConfig($request, $class, $submission);

        $png = $this->renderer->renderToPng($config);

        $filename = ($submission->public_id ?? $submission->id) . '_' . $config['format'] . '.png';

        return response($png, 200, [
            'Content-Type'        => 'image/png',
            'Content-Disposition' => "attachment; filename=\"{$filename}\"",
            'Content-Length'      => strlen($png),
        ]);
    }

    // -------------------------------------------------------------------------
    // Preview — returns smaller PNG for live browser preview
    // -------------------------------------------------------------------------
    /**
     * Preview a render (returns inline PNG).
     *
     * Same as render but returns the image inline for preview purposes.
     *
     * @summary Preview Post Image
     * @tags Image Generation
     */
    public function preview(Request $request, ClassWorkspace $class, Submission $submission)
    {
        $this->authorizeClassMember($request, $class);
        $this->assertApproved($submission, $class);

        $config = $this->buildConfig($request, $class, $submission);

        $png = $this->renderer->renderPreview($config);

        return response($png, 200, ['Content-Type' => 'image/png']);
    }

    // -------------------------------------------------------------------------
    // Bulk render — returns ZIP download
    // -------------------------------------------------------------------------
    /**
     * Bulk generate and download a ZIP of images.
     *
     * Renders multiple approved submissions into a ZIP archive. Accepts
     * bulk-level design/format overrides and per-item overrides. Precedence:
     * per-item override > bulk override > base default design.
     * All submissions must belong to the base and have `approved` status.
     * The ZIP and individual renders are temporary.
     *
     * @summary Bulk Generate Images (ZIP)
     * @tags Image Generation
     */
    public function bulkRender(Request $request, ClassWorkspace $class)
    {
        $this->authorizeClassMember($request, $class);

        $request->validate([
            'submission_ids'                    => 'required|array|min:1|max:100',
            'submission_ids.*'                  => 'required|string',
            'format'                            => 'required|in:story,feed_portrait',
            'bulk_config'                       => 'nullable|array',
            'bulk_config.design'                => 'nullable|array',
            'bulk_config.design.preset'         => 'nullable|in:editorial_geometry,typographic_poster,quiet_editorial,grid_technical,bold_block',
            'bulk_config.design.background_color' => 'nullable|string|regex:/^#[0-9A-Fa-f]{3,6}$/',
            'bulk_config.design.pattern_key'    => 'nullable|string|in:dots,grid,diagonal_lines,plus,circles,triangles,checker,waves',
            'bulk_config.design.pattern_color'  => 'nullable|string|regex:/^#[0-9A-Fa-f]{3,6}$/',
            'bulk_config.design.pattern_opacity'=> 'nullable|numeric|min:0|max:1',
            'bulk_config.design.class_design_id'=> 'nullable|string|uuid',
            'item_overrides'                    => 'nullable|array',
        ]);

        $ids            = $request->input('submission_ids');
        $format         = $request->input('format');
        $bulkConfig     = $request->input('bulk_config', []);
        $itemOverrides  = $request->input('item_overrides', []);
        $bulkConfig['format'] = $format;

        // Load and validate submissions
        $submissions = Submission::whereIn('id', $ids)
            ->where('class_id', $class->id)
            ->get()
            ->keyBy('id');

        // Reject foreign-class IDs
        $foreign = array_diff($ids, $submissions->keys()->toArray());
        if (count($foreign) > 0) {
            return response()->json([
                'error'   => 'Foreign class submission IDs rejected.',
                'foreign' => array_values($foreign),
            ], 422);
        }

        $requestId = Str::uuid()->toString();
        $tmpDir    = storage_path("app/tmp/renders/{$requestId}");
        @mkdir($tmpDir, 0755, true);

        $included = [];
        $skipped  = [];

        foreach ($submissions as $submission) {
            // Skip taken_down
            if ($submission->status === SubmissionStatus::TakenDown) {
                $skipped[] = $submission->public_id ?? $submission->id;
                continue;
            }

            if ($submission->status !== SubmissionStatus::Approved) {
                $skipped[] = $submission->public_id ?? $submission->id;
                continue;
            }

            $itemOverride = $itemOverrides[$submission->id] ?? null;
            $config = $this->buildConfigDirect($class, $submission, $bulkConfig, $itemOverride);
            $config['show_public_id'] = true; // always

            $png      = $this->renderer->renderToPng($config);
            $filename = ($submission->public_id ?? $submission->id) . '_' . $format . '.png';
            file_put_contents($tmpDir . '/' . $filename, $png);
            $included[] = $filename;
        }

        if (empty($included)) {
            $this->cleanupTmpDir($tmpDir);
            return response()->json(['error' => 'No eligible submissions to render.'], 422);
        }

        // Build ZIP
        $n           = count($included);
        $date        = now()->format('Ymd');
        $zipFilename = "{$class->slug}_{$date}_{$format}_{$n}-items.zip";
        $zipPath     = $tmpDir . '/' . $zipFilename;

        $zip = new ZipArchive();
        if ($zip->open($zipPath, ZipArchive::CREATE) !== true) {
            $this->cleanupTmpDir($tmpDir);
            return response()->json(['error' => 'Failed to create ZIP.'], 500);
        }

        foreach ($included as $fname) {
            $zip->addFile($tmpDir . '/' . $fname, $fname);
        }
        $zip->close();

        $zipData = file_get_contents($zipPath);
        $this->cleanupTmpDir($tmpDir);

        return response($zipData, 200, [
            'Content-Type'        => 'application/zip',
            'Content-Disposition' => "attachment; filename=\"{$zipFilename}\"",
            'Content-Length'      => strlen($zipData),
        ]);
    }

    // -------------------------------------------------------------------------
    // Helpers
    // -------------------------------------------------------------------------

    private function buildConfig(Request $request, ClassWorkspace $class, Submission $submission): array
    {
        $request->validate([
            'format'                    => 'nullable|in:story,feed_portrait',
            'show_logo'                 => 'nullable|boolean',
            'show_website_url'          => 'nullable|boolean',
            'design'                    => 'nullable|array',
            'design.source'             => 'nullable|in:builtin,custom',
            'design.preset'             => 'nullable|in:editorial_geometry,typographic_poster,quiet_editorial,grid_technical,bold_block',
            'design.background_color'   => 'nullable|string|regex:/^#[0-9A-Fa-f]{3,6}$/',
            'design.pattern_key'        => 'nullable|string|in:dots,grid,diagonal_lines,plus,circles,triangles,checker,waves',
            'design.pattern_color'      => 'nullable|string|regex:/^#[0-9A-Fa-f]{3,6}$/',
            'design.pattern_opacity'    => 'nullable|numeric|min:0|max:1',
            'design.class_design_id'    => 'nullable|string|uuid',
        ]);

        $bulkConfig = [
            'format'           => $request->input('format', 'story'),
            'show_logo'        => $request->boolean('show_logo', true),
            'show_website_url' => $request->boolean('show_website_url', true),
            'design'           => $request->input('design', []),
        ];

        return $this->buildConfigDirect($class, $submission, $bulkConfig, null);
    }

    private function buildConfigDirect(
        ClassWorkspace $class,
        Submission $submission,
        array $bulkConfig,
        ?array $itemOverride
    ): array {
        $config = $this->resolver->resolve($class, $bulkConfig, $itemOverride);

        // Always reload content from DB — never trust caller for content data
        $config['submission_id'] = $submission->id;
        $config['public_id']     = $submission->public_id ?? 'MF-??????';
        $config['message']       = $submission->moderated_message ?? $submission->original_message;
        $config['target_text']   = $submission->target_text;
        $config['alias_text']    = $submission->alias_text;
        $config['category']      = $submission->category;
        $config['song_text']     = $submission->song_text;
        $config['artist_text']        = $submission->artist_text;
        $config['song_start_seconds'] = $submission->song_start_seconds;
        // Load tag names (not IDs) for the renderer
        $config['tags']          = $submission->relationLoaded('tags')
            ? $submission->tags->pluck('name')->toArray()
            : $submission->tags()->pluck('name')->toArray();
        $config['class']         = [
            'name'             => $class->name,
            'logo_asset_key'   => $class->logo_asset_key,
            'website_label'    => $class->website_label,
            'instagram_handle' => $class->instagram_handle,
        ];
        $config['show_public_id'] = true;

        return $config;
    }

    private function assertApproved(Submission $submission, ClassWorkspace $class): void
    {
        abort_if($submission->class_id !== $class->id, 404);
        abort_if($submission->status === SubmissionStatus::TakenDown, 403, 'Submission taken down.');
        abort_if($submission->status !== SubmissionStatus::Approved, 422, 'Submission not approved.');
    }

    private function authorizeClassMember(Request $request, ClassWorkspace $class): void
    {
        $isMember = $class->members()->where('user_id', $request->user()->id)->exists();
        abort_if(!$isMember, 403, 'Not a class member.');
    }

    private function loremIpsum(int $chars): string
    {
        $base = 'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum. Sed ut perspiciatis unde omnis iste natus error sit voluptatem accusantium doloremque laudantium totam rem aperiam eaque ipsa quae ab illo inventore veritatis et quasi architecto beatae vitae dicta sunt explicabo.';
        $result = '';
        while (mb_strlen($result) < $chars) {
            $result .= ' ' . $base;
        }
        return mb_substr(trim($result), 0, $chars);
    }

    private function cleanupTmpDir(string $dir): void
    {
        if (!is_dir($dir)) return;
        foreach (glob($dir . '/*') as $file) {
            if (is_file($file)) @unlink($file);
        }
        @rmdir($dir);
    }
}
