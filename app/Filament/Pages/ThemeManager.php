<?php

namespace App\Filament\Pages;

use Filament\Pages\Page;
use Filament\Forms\Concerns\InteractsWithForms;
use Filament\Forms\Contracts\HasForms;
use Filament\Forms\Form;
use Filament\Forms\Components\TextInput;
use Filament\Forms\Components\ColorPicker;
use Filament\Forms\Components\Section;
use Filament\Forms\Components\FileUpload;
use Filament\Forms\Components\Select;
use Filament\Forms\Components\Repeater;
use Filament\Forms\Components\Toggle;
use Filament\Forms\Components\Grid;
use Filament\Forms\Components\Placeholder;
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

    // Use the bare layout — no sidebar/topbar
    protected static string $layout = 'components.layouts.theme-editor';

    public ?array $themeData = [];
    public ?Theme $activeTheme = null;
    public string $activeSection = 'general';

    public static function canAccess(): bool
    {
        return auth()->check() && (auth()->user()->hasRole('super_admin') || auth()->user()->hasPermissionTo('manage_themes'));
    }

    public function mount(): void
    {
        $this->activeTheme = Theme::where('is_active', true)->first();

        if (!$this->activeTheme) {
            // Read defaults from options.json
            $defaultOptions = [];
            $optionsPath = base_path('themes/default/options.json');
            if (file_exists($optionsPath)) {
                $defaultOptions = json_decode(file_get_contents($optionsPath), true) ?? [];
            }

            $this->activeTheme = Theme::create([
                'name' => 'Aurex Core Theme',
                'identifier' => 'default',
                'version' => '1.0.0',
                'is_active' => true,
                'options' => $defaultOptions,
            ]);
        }

        $this->themeData = $this->activeTheme->options ?? [];
        $this->form->fill($this->themeData);
    }

    public function switchSection(string $section): void
    {
        $this->activeSection = $section;
    }

    public function form(Form $form): Form
    {
        return $form
            ->schema($this->getActiveSchema())
            ->statePath('themeData');
    }

    protected function getActiveSchema(): array
    {
        return match ($this->activeSection) {
            'general' => $this->getGeneralSchema(),
            'theme' => $this->getThemeSchema(),
            'layout' => $this->getLayoutSchema(),
            'pages' => $this->getPagesSchema(),
            default => $this->getGeneralSchema(),
        };
    }

    // ─── SECTION 1: GENERAL ───────────────────────────────────────────

    protected function getGeneralSchema(): array
    {
        return [
            Section::make('Branding')
                ->description('Company identity and brand assets')
                ->schema([
                    TextInput::make('company_name')
                        ->label('Company Name')
                        ->placeholder('ARX ERP')
                        ->helperText('Displayed everywhere the brand name appears.')
                        ->live(debounce: 500),

                    Grid::make(2)->schema([
                        FileUpload::make('company_logo_dark')
                            ->label('Company Logo (Dark Mode)')
                            ->image()
                            ->directory('theme-assets')
                            ->helperText('Used on dark backgrounds. PNG or SVG, ~200×50px.'),
                        FileUpload::make('company_logo_light')
                            ->label('Company Logo (Light Mode)')
                            ->image()
                            ->directory('theme-assets')
                            ->helperText('Used on light backgrounds. PNG or SVG, ~200×50px.'),
                    ]),

                    Grid::make(2)->schema([
                        FileUpload::make('topbar_logo_dark')
                            ->label('Top Bar Logo (Dark Mode)')
                            ->image()
                            ->directory('theme-assets')
                            ->helperText('Small logo for the panel top-bar. ~40×40px.'),
                        FileUpload::make('topbar_logo_light')
                            ->label('Top Bar Logo (Light Mode)')
                            ->image()
                            ->directory('theme-assets')
                            ->helperText('Small logo for the panel top-bar. ~40×40px.'),
                    ]),

                    TextInput::make('copyright_text')
                        ->label('Copyright Text')
                        ->placeholder('Aurex Technologies © 2023 – 2026')
                        ->helperText('Shown on the login page, footer areas, etc.')
                        ->live(debounce: 500),
                ]),

            Section::make('Top Bar Quick Links')
                ->description('Buttons that appear on the top bar navigation. E.g. Discord, Billing, Website.')
                ->schema([
                    Repeater::make('topbar_quick_links')
                        ->label('')
                        ->schema([
                            Grid::make(3)->schema([
                                FileUpload::make('icon')
                                    ->label('Icon (SVG)')
                                    ->acceptedFileTypes(['image/svg+xml', 'image/png'])
                                    ->directory('theme-assets/icons'),
                                TextInput::make('text')
                                    ->label('Button Text')
                                    ->required(),
                                TextInput::make('url')
                                    ->label('URL')
                                    ->url()
                                    ->placeholder('https://...')
                                    ->required(),
                            ]),
                        ])
                        ->addActionLabel('+ Add Quick Link')
                        ->reorderable()
                        ->collapsible()
                        ->defaultItems(0),
                ]),
        ];
    }

    // ─── SECTION 2: THEME ─────────────────────────────────────────────

    protected function getThemeSchema(): array
    {
        return [
            Section::make('Surfaces & Fills')
                ->description('Background colours for major surface areas.')
                ->schema([
                    ColorPicker::make('color_page_bg')
                        ->label('Page Background')
                        ->helperText('The floor everything sits on.')
                        ->live(debounce: 300),
                    ColorPicker::make('color_card_bg')
                        ->label('Card & Panel Background')
                        ->helperText('Every card, panel and embed.')
                        ->live(debounce: 300),
                    ColorPicker::make('color_component_surface')
                        ->label('Component Surface')
                        ->helperText('Sub-components INSIDE a card: chips, tags, stat rows, dropdowns.')
                        ->live(debounce: 300),
                    ColorPicker::make('color_neutral_fill')
                        ->label('Neutral Fill')
                        ->helperText('Quiet fills: chips, tags, inactive controls.')
                        ->live(debounce: 300),
                ]),

            Section::make('Text')
                ->description('Typography colours for different hierarchy levels.')
                ->schema([
                    ColorPicker::make('color_text')
                        ->label('Text')
                        ->helperText('Headings and body text.')
                        ->live(debounce: 300),
                    ColorPicker::make('color_text_muted')
                        ->label('Muted Text')
                        ->helperText('Labels, hints and secondary lines.')
                        ->live(debounce: 300),
                    ColorPicker::make('color_text_dim')
                        ->label('Dim Text')
                        ->helperText('Captions, timestamps and log lines — dimmer than Muted Text.')
                        ->live(debounce: 300),
                ]),

            Section::make('Accents')
                ->description('Primary and secondary accent colours.')
                ->schema([
                    ColorPicker::make('color_accent_primary')
                        ->label('Primary Accent')
                        ->helperText('Buttons, links, active states, progress bars.')
                        ->live(debounce: 300),
                    ColorPicker::make('color_accent_secondary')
                        ->label('Secondary Accent')
                        ->helperText('Secondary buttons, plus accent gradient ends.')
                        ->live(debounce: 300),
                ]),

            Section::make('Appearance')
                ->description('Visual styling options.')
                ->schema([
                    TextInput::make('corner_rounding')
                        ->label('Corner Rounding')
                        ->numeric()
                        ->suffix('px')
                        ->minValue(0)
                        ->maxValue(32)
                        ->helperText('Border-radius of all UI elements.')
                        ->live(debounce: 300),
                    Select::make('font_family')
                        ->label('Font Family')
                        ->options([
                            'Onest' => 'Onest',
                            'Inter' => 'Inter',
                            'Roboto' => 'Roboto',
                            'Open Sans' => 'Open Sans',
                            'Lato' => 'Lato',
                            'Montserrat' => 'Montserrat',
                            'Poppins' => 'Poppins',
                            'Source Sans Pro' => 'Source Sans Pro',
                            'Nunito' => 'Nunito',
                            'Raleway' => 'Raleway',
                            'Ubuntu' => 'Ubuntu',
                            'DM Sans' => 'DM Sans',
                            'Plus Jakarta Sans' => 'Plus Jakarta Sans',
                            'Geist' => 'Geist',
                            'Satoshi' => 'Satoshi',
                        ])
                        ->default('Onest')
                        ->helperText('Choose the typeface for the entire panel.')
                        ->live(debounce: 300),
                ]),
        ];
    }

    // ─── SECTION 3: LAYOUT ────────────────────────────────────────────

    protected function getLayoutSchema(): array
    {
        return [
            Section::make('Layout Style')
                ->description('Choose how the panel navigation is rendered.')
                ->schema([
                    Select::make('layout_style')
                        ->label('Navigation Layout')
                        ->options([
                            'default' => '📋 Default — Standard sidebar on the left',
                            'navbar' => '📌 Navbar — Horizontal navigation at the top',
                            'floating' => '🔲 Floating Sidebar — Rounded edges, floating',
                            'bottom_bar' => '⬇️ Bottom Bar — Navigation pinned at the bottom',
                        ])
                        ->default('default')
                        ->live(debounce: 300),
                ]),

            Section::make('Content Width')
                ->description('Maximum width for content containers across the panel.')
                ->schema([
                    TextInput::make('content_width')
                        ->label('Max Width')
                        ->numeric()
                        ->suffix('px')
                        ->minValue(800)
                        ->maxValue(1920)
                        ->default(1280)
                        ->helperText('Controls the maximum width of all content areas. (800–1920px)')
                        ->live(debounce: 300),
                ]),

            Section::make('UI Scale')
                ->description('How large the client panel renders — text, spacing, sidebar and icons together.')
                ->schema([
                    TextInput::make('ui_scale')
                        ->label('Panel Scale')
                        ->numeric()
                        ->suffix('%')
                        ->minValue(50)
                        ->maxValue(100)
                        ->default(65)
                        ->helperText('65% is the default; 100% is the browser\'s own size. Does not affect this admin area.')
                        ->live(debounce: 300),
                ]),

            Section::make('Dashboard Overview')
                ->description('How the overview page widgets should be aligned.')
                ->schema([
                    Select::make('dashboard_card_style')
                        ->label('Card Style')
                        ->options([
                            'stacked' => '📊 Stacked — Full width cards on rows',
                            'two_column' => '📊 2 Column Grid — Two cards per row',
                            'three_column' => '📊 3 Column Grid — Three cards per row',
                            'random' => '🎲 Random — Automatically adjusted widths (Default)',
                        ])
                        ->default('random')
                        ->live(debounce: 300),
                ]),
        ];
    }

    // ─── SECTION 4: PAGES ─────────────────────────────────────────────

    protected function getPagesSchema(): array
    {
        return [
            Section::make('Auth Page')
                ->description('Customise the login / registration page appearance.')
                ->schema([
                    FileUpload::make('auth_background_image')
                        ->label('Background Image')
                        ->image()
                        ->directory('theme-assets')
                        ->helperText('Background image for authentication pages.'),

                    TextInput::make('auth_overlay_darkness')
                        ->label('Overlay Darkness')
                        ->numeric()
                        ->suffix('%')
                        ->minValue(0)
                        ->maxValue(100)
                        ->default(50)
                        ->helperText('Dark overlay opacity over the background image.')
                        ->live(debounce: 300),

                    TextInput::make('auth_background_blur')
                        ->label('Background Blur')
                        ->numeric()
                        ->suffix('px')
                        ->minValue(0)
                        ->maxValue(50)
                        ->default(0)
                        ->helperText('Blur applied to the background image.')
                        ->live(debounce: 300),

                    TextInput::make('auth_card_opacity')
                        ->label('Login Card Opacity')
                        ->numeric()
                        ->suffix('%')
                        ->minValue(0)
                        ->maxValue(100)
                        ->default(80)
                        ->helperText('Transparency of the login card panel.')
                        ->live(debounce: 300),

                    TextInput::make('auth_card_blur')
                        ->label('Login Card Blur')
                        ->numeric()
                        ->suffix('px')
                        ->minValue(0)
                        ->maxValue(50)
                        ->default(16)
                        ->helperText('Backdrop blur applied to the login card.')
                        ->live(debounce: 300),
                ]),

            Section::make('Login Card Slides')
                ->description('Slideshow images that rotate on the login card. Keep at least 1 default slide.')
                ->schema([
                    Repeater::make('auth_slides')
                        ->label('')
                        ->schema([
                            FileUpload::make('image')
                                ->label('Slide Image')
                                ->image()
                                ->directory('theme-assets/slides'),
                            TextInput::make('title')
                                ->label('Title')
                                ->required(),
                            TextInput::make('description')
                                ->label('Description'),
                        ])
                        ->addActionLabel('+ Add Slide')
                        ->reorderable()
                        ->collapsible()
                        ->minItems(1)
                        ->defaultItems(1),

                    TextInput::make('auth_slideshow_delay')
                        ->label('Slideshow Delay')
                        ->numeric()
                        ->suffix('seconds')
                        ->minValue(1)
                        ->maxValue(30)
                        ->default(5)
                        ->helperText('Time between slide transitions.'),
                ]),

            Section::make('Login Page Quick Links')
                ->description('Quick link buttons shown on the login page.')
                ->schema([
                    Repeater::make('auth_quick_links')
                        ->label('')
                        ->schema([
                            Grid::make(4)->schema([
                                FileUpload::make('icon')
                                    ->label('Icon (SVG)')
                                    ->acceptedFileTypes(['image/svg+xml', 'image/png'])
                                    ->directory('theme-assets/icons'),
                                TextInput::make('text')
                                    ->label('Button Text')
                                    ->required(),
                                TextInput::make('url')
                                    ->label('URL')
                                    ->url()
                                    ->placeholder('https://...'),
                                Toggle::make('enabled')
                                    ->label('Enabled')
                                    ->default(true),
                            ]),
                        ])
                        ->addActionLabel('+ Add Quick Link')
                        ->reorderable()
                        ->collapsible()
                        ->defaultItems(0),
                ]),

            Section::make('404 Page')
                ->description('Customise the 404 error page appearance.')
                ->schema([
                    FileUpload::make('error_404_background_image')
                        ->label('Background Image')
                        ->image()
                        ->directory('theme-assets')
                        ->helperText('Background image for the 404 page.'),

                    TextInput::make('error_404_overlay_darkness')
                        ->label('Overlay Darkness')
                        ->numeric()
                        ->suffix('%')
                        ->minValue(0)
                        ->maxValue(100)
                        ->default(50)
                        ->helperText('Dark overlay opacity.')
                        ->live(debounce: 300),

                    TextInput::make('error_404_background_blur')
                        ->label('Background Blur')
                        ->numeric()
                        ->suffix('px')
                        ->minValue(0)
                        ->maxValue(50)
                        ->default(0)
                        ->helperText('Blur applied to the background.')
                        ->live(debounce: 300),

                    FileUpload::make('error_404_floating_element')
                        ->label('Floating Element')
                        ->image()
                        ->directory('theme-assets')
                        ->helperText('The visual element floating next to the "404" text.'),
                ]),

            Section::make('404 Page Quick Links')
                ->description('Quick link buttons shown on the 404 page.')
                ->schema([
                    Repeater::make('error_404_quick_links')
                        ->label('')
                        ->schema([
                            Grid::make(4)->schema([
                                FileUpload::make('icon')
                                    ->label('Icon (SVG)')
                                    ->acceptedFileTypes(['image/svg+xml', 'image/png'])
                                    ->directory('theme-assets/icons'),
                                TextInput::make('text')
                                    ->label('Button Text')
                                    ->required(),
                                TextInput::make('url')
                                    ->label('URL')
                                    ->url()
                                    ->placeholder('https://...'),
                                Toggle::make('enabled')
                                    ->label('Enabled')
                                    ->default(true),
                            ]),
                        ])
                        ->addActionLabel('+ Add Quick Link')
                        ->reorderable()
                        ->collapsible()
                        ->defaultItems(0),
                ]),
        ];
    }

    // ─── SAVE & DISCARD ───────────────────────────────────────────────

    public function saveTheme(): void
    {
        if ($this->activeTheme) {
            $data = $this->form->getState();

            $this->activeTheme->update([
                'options' => $data,
            ]);

            Cache::forget('active_theme');

            // Log audit event
            activity()
                ->causedBy(auth()->user())
                ->withProperties(['theme' => $this->activeTheme->identifier])
                ->log('Theme settings updated');

            Notification::make()
                ->title('Theme Saved Successfully')
                ->body('Your customisation changes have been applied.')
                ->success()
                ->send();

            Notification::make()
                ->title('Theme Settings Updated')
                ->body('The panel theme and customisation settings were modified.')
                ->success()
                ->actions([
                    \Filament\Notifications\Actions\Action::make('view')
                        ->label('View Changes')
                        ->url('/admin/theme-manager')
                        ->button()
                        ->markAsRead(),
                ])
                ->sendToDatabase(auth()->user());

            $this->js('setTimeout(() => window.location.reload(), 500);');
        }
    }

    public function discardChanges(): void
    {
        $this->js('window.location.reload()');
    }
}
