<?php

use App\Models\User;
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Str;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->string('identifier', 20)->nullable()->unique()->after('id')->index();
        });

        // Backfill existing users with unique alphanumeric identifiers (e.g. A2C921)
        $users = User::withTrashed()->get();
        $generated = [];

        foreach ($users as $user) {
            do {
                $code = strtoupper(Str::random(6));
            } while (in_array($code, $generated, true) || User::withTrashed()->where('identifier', $code)->exists());

            $generated[] = $code;
            $user->identifier = $code;
            $user->saveQuietly();
        }

        // Set not null if desired, or keep unique nullable
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->dropColumn('identifier');
        });
    }
};
