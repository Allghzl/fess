<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('submissions', function (Blueprint $table) {
            $table->string('music_provider', 32)->nullable()->after('song_start_seconds');
            $table->string('music_track_id', 255)->nullable()->after('music_provider');
            $table->string('music_artwork_url', 512)->nullable()->after('music_track_id');
            $table->string('music_artwork_path', 512)->nullable()->after('music_artwork_url');
            $table->string('music_track_url', 512)->nullable()->after('music_artwork_path');
            $table->unsignedInteger('music_track_duration_ms')->nullable()->after('music_track_url');
            $table->unsignedInteger('music_start_ms')->nullable()->after('music_track_duration_ms');
            $table->unsignedInteger('music_duration_ms')->nullable()->after('music_start_ms');
            $table->string('music_license', 64)->nullable()->after('music_duration_ms');
            $table->string('music_license_url', 512)->nullable()->after('music_license');
            $table->string('music_attribution_text', 512)->nullable()->after('music_license_url');
            $table->boolean('music_attribution_required')->default(false)->after('music_attribution_text');
        });
    }

    public function down(): void
    {
        Schema::table('submissions', function (Blueprint $table) {
            $table->dropColumn([
                'music_provider', 'music_track_id', 'music_artwork_url', 'music_artwork_path',
                'music_track_url', 'music_track_duration_ms', 'music_start_ms', 'music_duration_ms',
                'music_license', 'music_license_url', 'music_attribution_text', 'music_attribution_required',
            ]);
        });
    }
};
