<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->dropColumn('name');
            $table->string('profile_id', 6)->unique()->after('id')->nullable(); // nullable temporarily if there are existing users, but wait, the prompt says new users. Let's make it nullable and generate it for existing. Actually, we should just make it nullable or give a default. We will populate it in a script if needed.
        });
        
        // Populate existing users
        $users = \App\Models\User::all();
        foreach ($users as $user) {
            do {
                $pid = strtoupper(\Illuminate\Support\Str::random(6));
            } while (\App\Models\User::where('profile_id', $pid)->exists());
            
            \Illuminate\Support\Facades\DB::table('users')
                ->where('id', $user->id)
                ->update(['profile_id' => $pid]);
        }
        
        // Now make it not nullable
        Schema::table('users', function (Blueprint $table) {
            $table->string('profile_id', 6)->nullable(false)->change();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->string('name')->nullable();
            $table->dropColumn('profile_id');
        });
    }
};
