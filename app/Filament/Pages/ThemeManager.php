<?php

namespace App\Filament\Pages;

use Filament\Pages\Page;
use Filament\Forms\Concerns\InteractsWithForms;
use Filament\Forms\Contracts\HasForms;
use Filament\Forms\Form;
use Filament\Forms\Components\TextInput;
use Filament\Forms\Components\ColorPicker;
use Filament\Forms\Components\Section;
use App\Models\Theme;
use Illuminate\Support\Facades\Cache;
use Filament\Notifications\Notification;

class ThemeManager extends Page implements HasForms
{
    use InteractsWithForms;

    protected static ?string $navigationIcon = 'heroicon-o-paint-brush';
    protected static ?string $navigationGroup = 'System Settings';
    protected static ?string $title = 'Theme Engine';
    protected static string $view = 'filament.pages.theme-manager';

    public ?array $themeData = [];
    public ?Theme $activeTheme = null;

    public static function canAccess(): bool
    {
        return auth()->check() && (auth()->user()->hasRole('super_admin') || auth()->user()->hasPermissionTo('manage_themes'));
    }

    public function mount(): void
    {
        $this->activeTheme = Theme::where('is_active', true)->first();
        
        if (!$this->activeTheme) {
            // Scaffold default theme if missing
            $this->activeTheme = Theme::create([
                'name' => 'Aurex Core Theme',
                'identifier' => 'default',
                'version' => '1.0.0',
                'is_active' => true,
                'options' => [
                    'brand_name' => 'Aurex ERP',
                    'color_primary' => '#8b5cf6',
                ]
            ]);
        }

        $this->form->fill($this->activeTheme->options ?? []);
    }

    public function form(Form $form): Form
    {
        // Dynamically build the form based on active theme options.json schema
        // For this implementation, we read options.json or fallback to defaults
        
        $schema = [];
        $optionsPath = base_path('themes/' . ($this->activeTheme->identifier ?? 'default') . '/options.json');
        
        if (file_exists($optionsPath)) {
            $optionsConfig = json_decode(file_get_contents($optionsPath), true);
            foreach ($optionsConfig as $key => $config) {
                if ($config['type'] === 'color') {
                    $schema[] = ColorPicker::make($key)->label($config['label'])->live(debounce: 500);
                } else {
                    $schema[] = TextInput::make($key)->label($config['label'])->live(debounce: 500);
                }
            }
        } else {
            // Fallback default schema
            $schema = [
                TextInput::make('brand_name')->label('Brand Name')->live(debounce: 500),
                ColorPicker::make('color_primary')->label('Primary Color')->live(debounce: 500),
            ];
        }

        return $form
            ->schema([
                Section::make('Theme Customization')
                    ->description('Changes preview instantly. Click save to apply.')
                    ->schema($schema)
            ])
            ->statePath('themeData');
    }

    public function saveTheme(): void
    {
        if ($this->activeTheme) {
            $this->activeTheme->update([
                'options' => $this->form->getState(),
            ]);
            
            Cache::forget('active_theme');
            
            Notification::make()
                ->title('Theme Saved Successfully')
                ->success()
                ->send();
                
            $this->js('setTimeout(() => window.location.reload(), 1000);');
        }
    }
}
