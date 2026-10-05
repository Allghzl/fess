<?php

namespace Tests\Feature;

use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class AuthReturnToTest extends TestCase
{
    use RefreshDatabase;

    public function test_safe_redirect_allows_local_paths(): void
    {
        $response = $this->get('/auth/login?redirect=/b/test-base/submit');
        $response->assertRedirect();
        $this->assertEquals('/b/test-base/submit', session('auth_return_to'));
    }

    public function test_safe_redirect_blocks_external_urls(): void
    {
        $response = $this->get('/auth/login?redirect=https://evil.com');
        $response->assertRedirect();
        $this->assertNull(session('auth_return_to'));
    }

    public function test_safe_redirect_blocks_protocol_relative(): void
    {
        $response = $this->get('/auth/login?redirect=//evil.com/steal');
        $response->assertRedirect();
        $this->assertNull(session('auth_return_to'));
    }

    public function test_safe_redirect_blocks_auth_callback(): void
    {
        $response = $this->get('/auth/login?redirect=/auth/pinat/session');
        $response->assertRedirect();
        $this->assertNull(session('auth_return_to'));
    }
}
