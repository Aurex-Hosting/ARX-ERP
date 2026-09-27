<?php

declare(strict_types=1);

namespace App\Core\Contracts;

use App\Models\User;

/**
 * Interface for dashboard and admin widgets injected dynamically by modules.
 */
interface WidgetInterface
{
    /**
     * Get unique widget identifier.
     */
    public function getId(): string;

    /**
     * Get widget display title.
     */
    public function getTitle(): string;

    /**
     * Get target area: 'dashboard' | 'admin'.
     */
    public function getArea(): string;

    /**
     * Get component identifier or template name to render on the frontend.
     */
    public function getComponent(): string;

    /**
     * Get widget grid width (e.g. 1 to 12 columns).
     */
    public function getWidth(): int;

    /**
     * Required permission to view this widget (or null if public to all authenticated users).
     */
    public function getRequiredPermission(): ?string;

    /**
     * Determine if given user is authorized to view this widget.
     */
    public function authorize(User $user): bool;

    /**
     * Resolve dynamic data payload for the widget.
     *
     * @return array<string, mixed>
     */
    public function getData(User $user): array;
}
