<?php

namespace App\Services;

use App\Models\ClassWorkspace;

class RenderConfigResolver
{
    /**
     * Resolve final render config.
     * Precedence: item > bulk > class default.
     * show_public_id is ALWAYS true.
     */
    public function resolve(
        ClassWorkspace $class,
        ?array $bulkOverride,
        ?array $itemOverride
    ): array {
        $classDefault = $this->classDefault($class);
        // Do NOT use array_filter — it drops intentional false/0/null values
        $bulk = is_array($bulkOverride) ? $bulkOverride : [];
        $item = is_array($itemOverride) ? $itemOverride : [];

        $resolved = array_merge($classDefault, $bulk, $item);

        // enforce — never trust caller
        $resolved['show_public_id'] = true;

        return $resolved;
    }

    private function classDefault(ClassWorkspace $class): array
    {
        $settings = $class->settings ?? [];
        $dr       = $settings['default_render'] ?? [];

        return [
            'format'           => $dr['format']           ?? 'story',
            'show_logo'        => $dr['show_logo']         ?? true,
            'show_website_url' => $dr['show_website_url']  ?? true,
            'show_public_id'   => true,
            'design'           => [
                'source'           => $dr['source']           ?? 'builtin',
                'preset'           => $dr['preset']           ?? 'editorial_geometry',
                'background_color' => $dr['background_color'] ?? '#1A1F2E',
                'pattern_key'      => $dr['pattern_key']      ?? null,
                'pattern_color'    => $dr['pattern_color']    ?? '#FFFFFF',
                'pattern_opacity'  => $dr['pattern_opacity']  ?? 0.06,
            ],
        ];
    }
}
