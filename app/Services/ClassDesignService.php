<?php

namespace App\Services;

use App\Models\ClassDesign;
use App\Models\ClassWorkspace;
use App\Support\DesignFormat;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;

class ClassDesignService
{
    private const MAX_ACTIVE_PER_FORMAT = 3;
    private const MAX_FILE_SIZE_BYTES   = 20 * 1024 * 1024; // 20MB
    private const MAX_DIMENSION         = 6000;

    public function __construct(private DesignCropService $cropService) {}

    /**
     * Upload a new design for a class.
     * Enforces slot limit, strips EXIF, stores original in MinIO/local, calculates cover crop.
     */
    public function upload(ClassWorkspace $class, array $data, UploadedFile $file, string $createdBy): ClassDesign
    {
        $format    = DesignFormat::from($data['format']);
        $slotIndex = (int) $data['slot_index'];

        $this->enforceSlotLimit($class, $format, $slotIndex);

        // Validate MIME and dimensions
        $this->validateFile($file);
        [$srcW, $srcH] = $this->imageDimensions($file);

        // Strip EXIF by re-encoding through GD
        $ext    = $this->safeExtension($file);
        $clean  = $this->stripExifAndReencode($file, $ext);

        // Store in S3/local: classes/{class_id}/designs/{design_id}/source.{ext}
        $designId = Str::uuid()->toString();
        $key      = "classes/{$class->id}/designs/{$designId}/source.{$ext}";
        Storage::disk($this->disk())->put($key, $clean);

        // Calculate default cover crop
        $crop = $this->cropService->coverCrop($srcW, $srcH, $format);

        $design = ClassDesign::create([
            'id'               => $designId,
            'class_id'         => $class->id,
            'name'             => $data['name'] ?? 'Design ' . $slotIndex,
            'format'           => $format->value,
            'slot_index'       => $slotIndex,
            'source_asset_key' => $key,
            'source_width'     => $srcW,
            'source_height'    => $srcH,
            'crop_x'           => $crop['x'],
            'crop_y'           => $crop['y'],
            'crop_width'       => $crop['width'],
            'crop_height'      => $crop['height'],
            'focal_x'          => $crop['focal_x'],
            'focal_y'          => $crop['focal_y'],
            'feed_fallback_crop' => null,
            'active'           => true,
            'created_by'       => $createdBy,
        ]);

        // Auto-generate feed_fallback_crop if uploading a Story design
        if ($format === DesignFormat::Story) {
            $fallback = $this->cropService->storyToFeedFallbackCrop($srcW, $srcH);
            $design->update(['feed_fallback_crop' => $fallback]);
        }

        return $design->fresh();
    }

    /**
     * Update name and/or crop parameters for a design.
     */
    public function update(ClassDesign $design, array $data): ClassDesign
    {
        $updates = [];

        if (isset($data['name'])) {
            $updates['name'] = $data['name'];
        }

        if (isset($data['focal_x']) || isset($data['focal_y'])) {
            $focalX = (float) ($data['focal_x'] ?? $design->focal_x ?? 0.5);
            $focalY = (float) ($data['focal_y'] ?? $design->focal_y ?? 0.5);
            $crop   = $this->cropService->coverCrop(
                $design->source_width,
                $design->source_height,
                $design->format,
                $focalX,
                $focalY
            );
            $updates = array_merge($updates, [
                'crop_x'      => $crop['x'],
                'crop_y'      => $crop['y'],
                'crop_width'  => $crop['width'],
                'crop_height' => $crop['height'],
                'focal_x'     => $crop['focal_x'],
                'focal_y'     => $crop['focal_y'],
            ]);

            // Recalculate feed_fallback_crop if this is a story design
            if ($design->format === DesignFormat::Story) {
                $fallback = $this->cropService->storyToFeedFallbackCrop(
                    $design->source_width,
                    $design->source_height,
                    $focalX,
                    $focalY
                );
                $updates['feed_fallback_crop'] = $fallback;
            }
        }

        if (!empty($updates)) {
            $design->update($updates);
        }

        return $design->fresh();
    }

    /**
     * Create a feed fallback crop from a story design.
     * Stores result in feed_fallback_crop on the story design — does NOT create a new record.
     */
    public function deriveFeedCrop(ClassDesign $design, float $focalX = 0.5, float $focalY = 0.5): ClassDesign
    {
        if ($design->format !== DesignFormat::Story) {
            throw new \InvalidArgumentException('derive-feed only applies to Story designs');
        }

        $fallback = $this->cropService->storyToFeedFallbackCrop(
            $design->source_width,
            $design->source_height,
            $focalX,
            $focalY
        );

        $design->update(['feed_fallback_crop' => $fallback]);
        return $design->fresh();
    }

    /**
     * Delete a design and its MinIO object.
     * Never deletes a Feed native slot just because a Story had a fallback to the same image.
     */
    public function delete(ClassDesign $design): void
    {
        $key = $design->source_asset_key;

        $design->delete();

        // Only delete storage if no other record references the same key
        $stillReferenced = ClassDesign::where('source_asset_key', $key)->exists();
        if (!$stillReferenced) {
            Storage::disk($this->disk())->delete($key);
        }
    }

    // -------------------------------------------------------------------------
    // Helpers
    // -------------------------------------------------------------------------

    private function enforceSlotLimit(ClassWorkspace $class, DesignFormat $format, int $slotIndex): void
    {
        $active = ClassDesign::where('class_id', $class->id)
            ->where('format', $format->value)
            ->where('active', true)
            ->count();

        if ($active >= self::MAX_ACTIVE_PER_FORMAT) {
            throw ValidationException::withMessages([
                'slot_index' => "Maximum " . self::MAX_ACTIVE_PER_FORMAT . " active {$format->value} designs per class. Delete or deactivate one first.",
            ]);
        }

        $slotTaken = ClassDesign::where('class_id', $class->id)
            ->where('format', $format->value)
            ->where('slot_index', $slotIndex)
            ->exists();

        if ($slotTaken) {
            throw ValidationException::withMessages([
                'slot_index' => "Slot {$slotIndex} for {$format->value} is already taken.",
            ]);
        }
    }

    private function validateFile(UploadedFile $file): void
    {
        $mime = $file->getMimeType();
        if (!in_array($mime, ['image/jpeg', 'image/png', 'image/webp'])) {
            throw ValidationException::withMessages(['image' => 'Only JPEG, PNG, or WebP allowed.']);
        }

        if ($file->getSize() > self::MAX_FILE_SIZE_BYTES) {
            throw ValidationException::withMessages(['image' => 'Max file size is 20MB.']);
        }

        [$w, $h] = $this->imageDimensions($file);
        if ($w > self::MAX_DIMENSION || $h > self::MAX_DIMENSION) {
            throw ValidationException::withMessages(['image' => 'Max dimension is 6000px per side.']);
        }
    }

    private function imageDimensions(UploadedFile $file): array
    {
        $info = getimagesize($file->getRealPath());
        if (!$info) {
            throw ValidationException::withMessages(['image' => 'Cannot read image dimensions.']);
        }
        return [(int) $info[0], (int) $info[1]];
    }

    private function safeExtension(UploadedFile $file): string
    {
        return match($file->getMimeType()) {
            'image/jpeg' => 'jpg',
            'image/png'  => 'png',
            'image/webp' => 'webp',
            default      => 'jpg',
        };
    }

    /**
     * Strip EXIF by decoding and re-encoding through GD.
     * Returns raw PNG bytes (always PNG internally for lossless storage).
     */
    private function stripExifAndReencode(UploadedFile $file, string $ext): string
    {
        $src = imagecreatefromstring(file_get_contents($file->getRealPath()));
        if ($src === false) {
            throw ValidationException::withMessages(['image' => 'Cannot decode image.']);
        }
        ob_start();
        imagepng($src);
        $bytes = ob_get_clean();
        imagedestroy($src);
        return $bytes;
    }

    private function disk(): string
    {
        return config('filesystems.default') === 'local' ? 'local' : 's3';
    }
}
