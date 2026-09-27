<?php

declare(strict_types=1);

namespace App\Core\Contracts;

/**
 * Interface that all ARX-ERP themes must implement.
 */
interface ThemeInterface
{
    /**
     * Get the human-readable name of the theme.
     */
    public function getName(): string;

    /**
     * Get the unique slug of the theme.
     */
    public function getSlug(): string;

    /**
     * Get the area this theme targets: 'dashboard' | 'admin'.
     */
    public function getArea(): string;

    /**
     * Get the theme engine: 'react' | 'vue' | 'blade'.
     */
    public function getEngine(): string;

    /**
     * Get the semantic version string.
     */
    public function getVersion(): string;

    /**
     * Get the entry file path relative to the theme root (e.g. 'dist/index.html').
     */
    public function getEntryFile(): string;

    /**
     * Get the theme visual configuration (colors, styles, logos).
     *
     * @return array<string, mixed>
     */
    public function getConfig(): array;
}
