<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('class_designs', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('class_id');
            $table->string('name');
            $table->string('format'); // story|feed_portrait
            $table->unsignedTinyInteger('slot_index'); // 1|2|3
            $table->string('source_asset_key');
            $table->integer('source_width');
            $table->integer('source_height');
            $table->float('crop_x')->nullable();
            $table->float('crop_y')->nullable();
            $table->float('crop_width')->nullable();
            $table->float('crop_height')->nullable();
            $table->float('focal_x')->nullable();
            $table->float('focal_y')->nullable();
            $table->jsonb('feed_fallback_crop')->nullable();
            $table->boolean('active')->default(true);
            $table->uuid('created_by');
            $table->timestamps();

            $table->foreign('class_id')->references('id')->on('classes')->cascadeOnDelete();
            $table->foreign('created_by')->references('id')->on('users');

            $table->unique(['class_id', 'format', 'slot_index']);
            $table->index(['class_id', 'format', 'active']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('class_designs');
    }
};
