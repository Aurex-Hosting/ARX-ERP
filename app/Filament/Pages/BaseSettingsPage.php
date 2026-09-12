<?php

namespace App\Filament\Pages;

use Filament\Pages\SettingsPage;

abstract class BaseSettingsPage extends SettingsPage
{
    protected static string $view = 'filament.pages.settings-page';
    
    public bool $hasChanges = false;
    public ?array $originalData = [];

    public function mount(): void
    {
        parent::mount();
        $this->originalData = $this->form->getState();
    }
    
    protected array $ignoreChanges = [];

    public function updated($propertyName, $value = null): void
    {
        if (str_starts_with($propertyName, 'data.')) {
            $currentState = $this->form->getState();
            $originalState = $this->originalData;
            
            foreach ($this->ignoreChanges as $key) {
                unset($currentState[$key]);
                unset($originalState[$key]);
            }
            
            $normalize = function ($data) use (&$normalize) {
                if (is_array($data)) {
                    foreach ($data as $k => $v) {
                        $data[$k] = $normalize($v);
                    }
                    return $data;
                }
                if (is_string($data)) {
                    // Standardize line endings and trim whitespace
                    return trim(preg_replace('/\r\n|\r/', "\n", $data));
                }
                return $data;
            };

            $this->hasChanges = ($normalize($currentState) != $normalize($originalState));

            if ($this->hasChanges) {
                \Illuminate\Support\Facades\Log::info('Changes detected:', [
                    'diff' => array_diff_assoc(
                        array_map('json_encode', $currentState),
                        array_map('json_encode', $originalState)
                    )
                ]);
            }
        }
    }

    public function hasUnsavedDataChangesAlert(): bool
    {
        return false;
    }

    public function saveAndReload()
    {
        $this->save();
        $this->js('window.location.reload()');
    }

    public function save(): void
    {
        $oldState = $this->originalData;
        
        parent::save();
        
        $newState = $this->form->getState();
        $changes = [];
        $oldValues = [];
        
        foreach ($newState as $key => $value) {
            if (isset($oldState[$key]) && $oldState[$key] !== $value && !in_array($key, $this->ignoreChanges)) {
                $changes[$key] = $value;
                $oldValues[$key] = $oldState[$key];
            }
        }
        
        if (!empty($changes)) {
            $title = class_basename(static::$settings) . ' updated';
            activity()
                ->causedBy(auth()->user())
                ->withProperties(['attributes' => $changes, 'old' => $oldValues])
                ->log($title);
        }
        
        $this->originalData = $newState;
        $this->hasChanges = false;
    }

    public function discardChanges()
    {
        $this->js('window.location.reload()');
    }

    public function getFormActions(): array
    {
        return [];
    }
}
