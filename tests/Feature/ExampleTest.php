<?php

declare(strict_types=1);

namespace Tests\Feature;

use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class ExampleTest extends TestCase
{
    use RefreshDatabase;

    public function test_dashboard_spa_entry_returns_successful_response(): void
    {
        $response = $this->get('/');

        $response->assertStatus(200);
    }

    public function test_admin_spa_entry_returns_successful_response(): void
    {
        $response = $this->get('/admin');

        $response->assertStatus(200);
    }
}
