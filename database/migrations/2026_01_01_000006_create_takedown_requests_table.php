<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('takedown_requests', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('submission_id');
            $table->uuid('class_id');
            $table->string('public_id_snapshot');
            $table->string('reason_code');
            $table->text('reason_text');
            $table->string('contact')->nullable();
            $table->string('evidence_asset_key')->nullable();
            $table->string('status')->default('pending');
            $table->uuid('handled_by')->nullable();
            $table->timestamp('handled_at')->nullable();
            $table->text('admin_note')->nullable();
            $table->timestamps();

            $table->foreign('submission_id')->references('id')->on('submissions')->cascadeOnDelete();
            $table->foreign('class_id')->references('id')->on('classes')->cascadeOnDelete();
            $table->foreign('handled_by')->references('id')->on('users')->nullOnDelete();

            $table->index(['class_id', 'status', 'created_at']);
            $table->index('submission_id');
            $table->index('public_id_snapshot');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('takedown_requests');
    }
};
