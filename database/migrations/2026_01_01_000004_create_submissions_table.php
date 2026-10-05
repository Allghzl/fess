<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('submissions', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('class_id');
            $table->string('public_id')->nullable()->unique();
            $table->text('original_message');
            $table->text('moderated_message')->nullable();
            $table->string('target_text')->nullable();
            $table->string('alias_text')->nullable();
            $table->string('category')->nullable();
            $table->string('status')->default('submitted');
            $table->text('rejection_reason')->nullable();
            $table->text('internal_note')->nullable();
            $table->timestamp('approved_at')->nullable();
            $table->uuid('approved_by')->nullable();
            $table->timestamp('rejected_at')->nullable();
            $table->uuid('rejected_by')->nullable();
            $table->timestamp('posted_at')->nullable();
            $table->timestamps();

            $table->foreign('class_id')->references('id')->on('classes')->cascadeOnDelete();
            $table->foreign('approved_by')->references('id')->on('users')->nullOnDelete();
            $table->foreign('rejected_by')->references('id')->on('users')->nullOnDelete();

            $table->index(['class_id', 'status', 'created_at']);
            $table->index('approved_at');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('submissions');
    }
};
