<?php
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void {
        Schema::table('submissions', function (Blueprint $table) {
            $table->unsignedSmallInteger('song_start_seconds')->nullable()->after('artist_text');
        });
    }
    public function down(): void {
        Schema::table('submissions', function (Blueprint $table) {
            $table->dropColumn('song_start_seconds');
        });
    }
};
