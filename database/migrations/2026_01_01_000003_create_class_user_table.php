<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('class_user', function (Blueprint $table) {
            $table->uuid('class_id');
            $table->uuid('user_id');
            $table->string('role'); // owner|admin
            $table->timestamp('created_at')->nullable();

            $table->primary(['class_id', 'user_id']);
            $table->foreign('class_id')->references('id')->on('classes')->cascadeOnDelete();
            $table->foreign('user_id')->references('id')->on('users')->cascadeOnDelete();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('class_user');
    }
};
