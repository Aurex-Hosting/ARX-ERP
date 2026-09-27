<?php

use App\Models\User;
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
            $table->string('first_name')->nullable()->after('name');
            $table->string('last_name')->nullable()->after('first_name');
            $table->string('banner_url')->nullable()->after('avatar_url');
            $table->string('phone_country_code_1', 10)->nullable()->after('banner_url');
            $table->string('phone_1', 30)->nullable()->after('phone_country_code_1');
            $table->string('phone_country_code_2', 10)->nullable()->after('phone_1');
            $table->string('phone_2', 30)->nullable()->after('phone_country_code_2');
            $table->string('country', 100)->nullable()->after('phone_2');
            $table->string('province_state', 100)->nullable()->after('country');
            $table->string('city', 100)->nullable()->after('province_state');
            $table->string('postal_code', 30)->nullable()->after('city');
            $table->string('address_line_1')->nullable()->after('postal_code');
            $table->string('address_line_2')->nullable()->after('address_line_1');
        });

        // Initialize first_name & last_name from existing name
        $users = User::withTrashed()->get();
        foreach ($users as $user) {
            if ($user->name && empty($user->first_name)) {
                $parts = explode(' ', trim($user->name), 2);
                $user->first_name = $parts[0] ?? '';
                $user->last_name = $parts[1] ?? '';
                $user->saveQuietly();
            }
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->dropColumn([
                'first_name',
                'last_name',
                'banner_url',
                'phone_country_code_1',
                'phone_1',
                'phone_country_code_2',
                'phone_2',
                'country',
                'province_state',
                'city',
                'postal_code',
                'address_line_1',
                'address_line_2',
            ]);
        });
    }
};
