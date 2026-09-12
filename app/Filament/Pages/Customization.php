<?php

namespace App\Filament\Pages;

use App\Settings\CustomizationSettings;
use Filament\Forms;
use Filament\Forms\Form;
use Filament\Pages\SettingsPage;
use Filament\Forms\Components\Section;
use Filament\Forms\Components\TextInput;
use Filament\Forms\Components\FileUpload;
use Filament\Forms\Components\ColorPicker;
use Filament\Forms\Components\Grid;
use Filament\Forms\Components\Select;
use Filament\Forms\Components\Actions\Action;

class Customization extends BaseSettingsPage
{
    protected static ?string $navigationIcon = 'heroicon-o-swatch';
    
    protected static ?string $navigationGroup = 'System Settings';

    public static function canAccess(): bool
    {
        return auth()->check() && auth()->user()->hasAnyPermission([
            'view_brand_assets_customization', 'update_brand_assets_customization',
            'view_brand_colors_customization', 'update_brand_colors_customization',
            'view_login_background_customization', 'update_login_background_customization',
            'view_login_card_customization', 'update_login_card_customization',
            'view_login_slides_customization', 'update_login_slides_customization',
            'view_404_customization_customization', 'update_404_customization_customization',
        ]);
    }


    protected static string $settings = CustomizationSettings::class;

    public function form(Form $form): Form
    {
        return $form
            ->schema([
                \Filament\Forms\Components\Tabs::make('CustomizationTabs')
                    ->tabs([
                        \Filament\Forms\Components\Tabs\Tab::make('Brand & Colors')
                            ->visible(fn() => auth()->user()->hasAnyPermission(['view_brand_assets_customization', 'update_brand_assets_customization', 'view_brand_colors_customization', 'update_brand_colors_customization']))
                            ->icon('heroicon-o-swatch')
                            ->schema([
                                Section::make('Brand Identity')
                                    ->visible(fn() => auth()->user()->hasAnyPermission(['view_brand_assets_customization', 'update_brand_assets_customization']))
                                    ->disabled(fn() => !auth()->user()->can('update_brand_assets_customization'))
                                    ->description('Set your company name, logo, and favicon.')
                                    ->schema([
                                        TextInput::make('brand_name')
                                            ->label('Company Name')
                                            ->placeholder('Acme Corp')
                                            ->live(debounce: 500)
                                            ->afterStateUpdated(function (\Filament\Forms\Set $set, \Livewire\Component $livewire) {
                                                $livewire->hasChanges = true;
                                            }),
                                        Grid::make(2)
                                            ->schema([
                                                FileUpload::make('brand_logo')
                                                    ->label('Main Logo (Dark Mode)')
                                                    ->image()
                                                    ->directory('Customizations')
                                                    ->getUploadedFileNameForStorageUsing(fn ($file) => 'logo.' . $file->guessExtension())
                                                    ->panelLayout('compact')
                                                    ->imageEditor()
                                                    ->live(),
                                                FileUpload::make('brand_favicon')
                                                    ->label('Favicon')
                                                    ->image()
                                                    ->directory('Customizations')
                                                    ->getUploadedFileNameForStorageUsing(fn ($file) => 'favicon.' . $file->guessExtension())
                                                    ->panelLayout('compact')
                                                    ->imageEditor()
                                                    ->live(),
                                            ]),
                                    ]),

                                Section::make('Brand Colors')
                                    ->visible(fn() => auth()->user()->hasAnyPermission(['view_brand_colors_customization', 'update_brand_colors_customization']))
                                    ->disabled(fn() => !auth()->user()->can('update_brand_colors_customization'))
                                    ->description('Customize the application colors.')
                                    ->headerActions([
                                        \Filament\Forms\Components\Actions\Action::make('reset_defaults')
                                            ->visible(fn() => auth()->user()->can('update_brand_colors_customization'))
                                            ->label('Reset All Defaults')
                                            ->size('sm')
                                            ->link()
                                            ->color('gray')
                                            ->action(function (\Filament\Forms\Set $set, \Livewire\Component $livewire) {
                                                $set('color_primary', '#38bdf8');
                                                $set('color_secondary', '#3b82f6');
                                                $set('color_accent', '#34d399');
                                                $set('color_background', '#12141c');
                                                $set('color_text_primary', '#ffffff');
                                                $set('color_text_secondary', '#9ca3af');
                                                $livewire->hasChanges = ($livewire->form->getState() !== $livewire->originalData);
                                            }),
                                    ])
                                    ->schema([
                                        Grid::make(3)
                                            ->schema([
                                                \Filament\Forms\Components\ColorPicker::make('color_primary')->label('Primary Color')->live(),
                                                \Filament\Forms\Components\ColorPicker::make('color_secondary')->label('Secondary Color')->live(),
                                                \Filament\Forms\Components\ColorPicker::make('color_accent')->label('Accent Color')->live(),
                                                \Filament\Forms\Components\ColorPicker::make('color_background')->label('Background Color')->live(),
                                                \Filament\Forms\Components\ColorPicker::make('color_text_primary')->label('Text Color (Primary)')->live(),
                                                \Filament\Forms\Components\ColorPicker::make('color_text_secondary')->label('Text Color (Muted/Icons)')->live(),
                                            ]),
                                    ]),
                            ]),

                        \Filament\Forms\Components\Tabs\Tab::make('Login Page')
                            ->visible(fn() => auth()->user()->hasAnyPermission(['view_login_background_customization', 'update_login_background_customization', 'view_login_card_customization', 'update_login_card_customization', 'view_login_slides_customization', 'update_login_slides_customization']))
                            ->icon('heroicon-o-lock-closed')
                            ->schema([
                                Section::make('Login Background')->visible(fn() => auth()->user()->can('view_login_background_customization') || auth()->user()->can('update_login_background_customization'))->disabled(fn() => !auth()->user()->can('update_login_background_customization'))
                                    ->schema([
                                        FileUpload::make('login_background_image')
                                            ->label('Background Image')
                                            ->image()
                                            ->directory('Customizations')
                                            ->getUploadedFileNameForStorageUsing(fn ($file) => 'login-bg.' . $file->guessExtension())
                                            ->panelLayout('compact')
                                            ->imageEditor(),
                                        Grid::make(2)->schema([
                                            TextInput::make('login_background_opacity')
                                                ->label('Background Opacity (%)')
                                                ->numeric()->minValue(0)->maxValue(100)->live(debounce: 500),
                                            TextInput::make('login_background_blur')
                                                ->label('Background Blur (px)')
                                                ->numeric()->minValue(0)->maxValue(100)->live(debounce: 500),
                                        ]),
                                    ]),
                                Section::make('Login Card')->visible(fn() => auth()->user()->can('view_login_card_customization') || auth()->user()->can('update_login_card_customization'))->disabled(fn() => !auth()->user()->can('update_login_card_customization'))
                                    ->schema([
                                        Grid::make(2)->schema([
                                            TextInput::make('login_card_opacity')
                                                ->label('Card Opacity (%)')
                                                ->numeric()->minValue(0)->maxValue(100)->live(debounce: 500),
                                            TextInput::make('login_card_blur')
                                                ->label('Card Blur (px)')
                                                ->numeric()->minValue(0)->maxValue(100)->live(debounce: 500),
                                        ]),
                                    ]),
                                      Section::make('Login Slides')->visible(fn() => auth()->user()->can('view_login_slides_customization') || auth()->user()->can('update_login_slides_customization'))->disabled(fn() => !auth()->user()->can('update_login_slides_customization'))
                                      ->schema([
                                          \Filament\Forms\Components\Repeater::make('login_slides')
                                              ->schema([
                                                  FileUpload::make('image')->image()->directory('Customizations')->panelLayout('compact')->required()->live(),
                                                  TextInput::make('title')->required()->live(debounce: 500),
                                                  TextInput::make('description')->required()->live(debounce: 500),
                                              ])
                                              ->live()
                                              ->minItems(0),
                                      ]),
                            ]),

                        \Filament\Forms\Components\Tabs\Tab::make('404 Page')
                            ->visible(fn() => auth()->user()->hasAnyPermission(['view_404_customization_customization', 'update_404_customization_customization']))
                            ->icon('heroicon-o-exclamation-triangle')
                            ->schema([
                                Section::make('404 Background')->visible(fn() => auth()->user()->can('view_404_customization_customization') || auth()->user()->can('update_404_customization_customization'))->disabled(fn() => !auth()->user()->can('update_404_customization_customization'))
                                    ->schema([
                                        FileUpload::make('error_404_background_image')
                                            ->label('Background Image')
                                            ->image()
                                            ->directory('Customizations')
                                            ->getUploadedFileNameForStorageUsing(fn ($file) => '404-background.' . $file->guessExtension())
                                            ->panelLayout('compact')
                                            ->imageEditor(),
                                        Grid::make(2)->schema([
                                            TextInput::make('error_404_background_opacity')
                                                ->label('Background Opacity (%)')
                                                ->numeric()->minValue(0)->maxValue(100)->live(debounce: 500),
                                            TextInput::make('error_404_background_blur')
                                                ->label('Background Blur (px)')
                                                ->numeric()->minValue(0)->maxValue(100)->live(debounce: 500),
                                        ]),
                                    ]),
                            ]),
                    ])
                    ->columnSpanFull(),
            ]);
    }
}

