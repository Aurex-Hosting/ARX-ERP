<?php

namespace App\Filament\Resources\RoleResource\Pages;

use App\Filament\Resources\RoleResource;
use BezhanSalleh\FilamentShield\Support\Utils;
use Filament\Actions;
use Filament\Resources\Pages\EditRecord;
use Illuminate\Support\Arr;
use Illuminate\Support\Collection;

class EditRole extends EditRecord
{
    protected static string $resource = RoleResource::class;
    
    protected static string $view = 'filament.resources.role-resource.pages.edit-role';

    public Collection $permissions;

    public bool $hasChanges = false;
    public ?array $originalData = [];

    public function mount(int | string $record): void
    {
        parent::mount($record);
        $this->originalData = $this->form->getState();
    }

    public function updated($propertyName, $value = null): void
    {
        if (str_starts_with($propertyName, 'data.')) {
            $this->hasChanges = true;
        }
    }

    public function discardChanges()
    {
        $this->js('window.location.reload()');
    }

    public function saveAndReload()
    {
        $this->save();
        $this->hasChanges = false;
        $this->js('setTimeout(() => window.location.reload(), 500)');
    }

    protected function getActions(): array
    {
        return [
            Actions\DeleteAction::make(),
        ];
    }

    protected function mutateFormDataBeforeSave(array $data): array
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

    protected function afterSave(): void
    {
        $oldPermissions = $this->record->permissions->pluck('name')->toArray();

        $permissionModels = collect();
        $this->permissions->each(function ($permission) use ($permissionModels) {
            $permissionModels->push(Utils::getPermissionModel()::firstOrCreate([
                'name' => $permission,
                'guard_name' => $this->data['guard_name'],
            ]));
        });

        $this->record->syncPermissions($permissionModels);

        $newPermissions = $this->record->permissions()->pluck('name')->toArray();

        $added = array_diff($newPermissions, $oldPermissions);
        $removed = array_diff($oldPermissions, $newPermissions);

        if (count($added) > 0 || count($removed) > 0) {
            activity()
                ->causedBy(auth()->user())
                ->performedOn($this->record)
                ->withProperties([
                    'attributes' => ['permissions' => $newPermissions],
                    'old' => ['permissions' => $oldPermissions],
                    'added_permissions' => array_values($added),
                    'removed_permissions' => array_values($removed),
                ])
                ->log("Role '{$this->record->name}' permissions updated");
        }
    }

    protected function getFormActions(): array
    {
        return [];
    }

}