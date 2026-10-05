<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // Base-scoped tag definitions
        Schema::create('tags', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('class_id');
            $table->string('name', 60);
            $table->string('slug', 60);
            $table->timestamps();

            $table->foreign('class_id')->references('id')->on('classes')->cascadeOnDelete();
            $table->unique(['class_id', 'slug']);
            $table->index(['class_id', 'name']);
        });

        // Submission → tag pivot (max 3 enforced at app layer)
        Schema::create('submission_tag', function (Blueprint $table) {
            $table->uuid('submission_id');
            $table->uuid('tag_id');
            $table->primary(['submission_id', 'tag_id']);

            $table->foreign('submission_id')->references('id')->on('submissions')->cascadeOnDelete();
            $table->foreign('tag_id')->references('id')->on('tags')->cascadeOnDelete();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('submission_tag');
        Schema::dropIfExists('tags');
    }
};
