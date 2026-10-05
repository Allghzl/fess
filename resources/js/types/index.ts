// Shared TypeScript types — consumed by all agents

export type SubmissionStatus =
    | 'submitted'
    | 'under_review'
    | 'approved'
    | 'rejected'
    | 'takedown_requested'
    | 'taken_down'
    | 'archived';

export type TakedownStatus =
    | 'pending'
    | 'reviewing'
    | 'approved'
    | 'rejected'
    | 'resolved';

export type RenderFormat = 'story' | 'feed_portrait';

export interface ClassWorkspace {
    id: string;
    name: string;
    slug: string;
    short_code: string;
    instagram_handle: string | null;
    logo_asset_key: string | null;
    website_label: string | null;
    is_active: boolean;
    settings: ClassSettings | null;
    created_at: string;
    updated_at: string;
}

export type DesignPreset = 'editorial_geometry' | 'typographic_poster' | 'quiet_editorial' | 'grid_technical' | 'bold_block';

export interface ClassSettings {
    default_render?: {
        show_logo?: boolean;
        show_website_url?: boolean;
        preset?: DesignPreset;
        background_color?: string;
        pattern_key?: string;
        pattern_color?: string;
        pattern_opacity?: number;
    };
}

export interface Tag {
    id: string;
    class_id: string;
    name: string;
    slug: string;
    created_at: string;
    updated_at: string;
}

export interface Submission {
    id: string;
    class_id: string;
    public_id: string | null;
    original_message: string;
    moderated_message: string | null;
    target_text: string | null;
    alias_text: string | null;
    category: string | null;
    song_text: string | null;
    artist_text: string | null;
    song_start_seconds: number | null;
    music_provider: string | null;
    music_track_id: string | null;
    music_artwork_url: string | null;
    music_artwork_path: string | null;
    music_track_url: string | null;
    music_track_duration_ms: number | null;
    music_start_ms: number | null;
    music_duration_ms: number | null;
    music_license: string | null;
    music_license_url: string | null;
    music_attribution_text: string | null;
    music_attribution_required: boolean;
    tags?: Tag[];
    status: SubmissionStatus;
    rejection_reason: string | null;
    internal_note: string | null;
    approved_at: string | null;
    approved_by: string | null;
    rejected_at: string | null;
    rejected_by: string | null;
    posted_at: string | null;
    created_at: string;
    updated_at: string;
}

export interface ClassDesign {
    id: string;
    class_id: string;
    name: string;
    format: RenderFormat;
    slot_index: 1 | 2 | 3;
    source_asset_key: string;
    source_width: number;
    source_height: number;
    crop_x: number | null;
    crop_y: number | null;
    crop_width: number | null;
    crop_height: number | null;
    focal_x: number | null;
    focal_y: number | null;
    feed_fallback_crop: Record<string, unknown> | null;
    active: boolean;
    created_by: string;
    created_at: string;
    updated_at: string;
}

export interface TakedownRequest {
    id: string;
    submission_id: string;
    class_id: string;
    public_id_snapshot: string;
    reason_code: string;
    reason_text: string;
    contact: string | null;
    evidence_asset_key: string | null;
    status: TakedownStatus;
    handled_by: string | null;
    handled_at: string | null;
    admin_note: string | null;
    created_at: string;
    updated_at: string;
}

export interface BuiltInTemplate {
    key: string;
    label: string;
    preview_url: string;
    formats: RenderFormat[];
}
