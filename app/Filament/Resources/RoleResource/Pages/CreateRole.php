<?php

namespace App\Filament\Resources\RoleResource\Pages;

use App\Filament\Resources\RoleResource;
use BezhanSalleh\FilamentShield\Support\Utils;
use Filament\Resources\Pages\CreateRecord;
use Illuminate\Support\Arr;
use Illuminate\Support\Collection;

class CreateRole extends CreateRecord
{
    protected static string $resource = RoleResource::class;

    public Collection $permissions;

    protected function mutateFormDataBeforeCreate(array $data): array
    {
        $hasAdminAccess = $data['custom_admin_access'] ?? false;

        $this->permissions = collect($data)
            ->filter(function ($permission, $key) {
                return ! in_array($key, ['name', 'guard_name', 'color', 'select_all', 'custom_admin_access', Utils::getTenantModelForeignKey()]);
            })
            ->values()
            ->flatten()
            ->unique();

        if ($hasAdminAccess) {
            $this->permissions->push('access_admin_panel');
        }

        if (Arr::has($data, Utils::getTenantModelForeignKey())) {
            return Arr::only($data, ['name', 'guard_name', 'color', Utils::getTenantModelForeignKey()]);
        }

        return Arr::only($data, ['name', 'guard_name', 'color']);
    }

    protected function afterCreate(): void
    {
        $permissionModels = collect();
        $this->permissions->each(function ($permission) use ($permissionModels) {
            $permissionModels->push(Utils::getPermissionModel()::firstOrCreate([
                /** @phpstan-ignore-next-line */
                'name' => $permission,
                'guard_name' => $this->data['guard_name'],
            ]));
        });

        $this->record->syncPermissions($permissionModels);

        $newPermissions = $this->record->permissions()->pluck('name')->toArray();
        if (count($newPermissions) > 0) {
            activity()
                ->causedBy(auth()->user())
                ->performedOn($this->record)
                ->withProperties([
                    'attributes' => ['permissions' => $newPermissions],
                    'added_permissions' => $newPermissions,
                ])
                ->log("Role '{$this->record->name}' permissions assigned");
        }
    }
}
