<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('class_invitations', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('class_id');
            $table->uuid('created_by');
            $table->string('code_hash');           // HMAC/hash of the raw code
            $table->string('code_hint', 8);        // last 4 chars for display e.g. "P4QA"
            $table->timestamp('expires_at')->nullable();
            $table->unsignedInteger('max_uses')->nullable();
            $table->unsignedInteger('claimed_count')->default(0);
            $table->boolean('requires_approval')->default(true);
            $table->timestamp('revoked_at')->nullable();
            $table->timestamps();

            $table->foreign('class_id')->references('id')->on('classes')->cascadeOnDelete();
            $table->foreign('created_by')->references('id')->on('users')->cascadeOnDelete();
            $table->index(['class_id', 'revoked_at']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('class_invitations');
    }
};
