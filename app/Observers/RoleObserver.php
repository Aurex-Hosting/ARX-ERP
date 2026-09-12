<?php

namespace App\Observers;

use Spatie\Permission\Models\Role;

class RoleObserver
{
    public function created(Role $role): void
    {
        activity()->causedBy(auth()->user())->performedOn($role)->withProperties(['attributes' => $role->toArray()])->log("Role '{$role->name}' was created");
    }

    public function updated(Role $role): void
    {
        if ($role->isDirty()) {
            activity()->causedBy(auth()->user())->performedOn($role)->withProperties(['attributes' => $role->getDirty(), 'old' => $role->getOriginal()])->log("Role '{$role->name}' was updated");
        }
    }

    public function deleted(Role $role): void
    {
        activity()->causedBy(auth()->user())->performedOn($role)->withProperties(['old' => $role->toArray()])->log("Role '{$role->name}' was deleted");
    }
}
