<?php

namespace App\Filament\Resources;

use BezhanSalleh\FilamentShield\Contracts\HasShieldPermissions;
use BezhanSalleh\FilamentShield\Forms\ShieldSelectAllToggle;
use App\Filament\Resources\RoleResource\Pages;
use BezhanSalleh\FilamentShield\Support\Utils;
use BezhanSalleh\FilamentShield\Traits\HasShieldFormComponents;
use Filament\Facades\Filament;
use Filament\Forms;
use Filament\Forms\Form;
use Filament\Pages\SubNavigationPosition;
use Filament\Resources\Resource;
use Filament\Tables;
use Filament\Tables\Table;
use Illuminate\Contracts\Support\Arrayable;
use Illuminate\Support\HtmlString;
use Illuminate\Support\Str;
use Illuminate\Validation\Rules\Unique;

class RoleResource extends Resource implements HasShieldPermissions
{
    use HasShieldFormComponents;

    protected static ?string $recordTitleAttribute = 'name';

    public static function getShieldFormComponents(): Forms\Components\Component
    {
        $backupPermissions = [
            'page_BackupManager' => 'Access Backup Manager',
            'view_manual_backups' => 'View Manual Backups',
            'view_auto_backups' => 'View Auto Backups',
            'create_manual_backups' => 'Create Manual Backups',
            'download_manual_backups' => 'Download Manual Backups',
            'download_auto_backups' => 'Download Auto Backups',
            'delete_manual_backups' => 'Delete Manual Backups',
            'delete_auto_backups' => 'Delete Auto Backups',
            'update_auto_backups_settings' => 'Update Auto Backups Settings',
            'widget_BackupTableWidget' => 'Manual Backups Widget',
            'widget_AutoBackupTableWidget' => 'Auto Backups Widget',
        ];

                $licensePermissions = [
            "view_license_status" => "View License Status",
        ];

        $updaterPermissions = [
            'page_SystemUpdater' => 'Access System Updater',
            'check_updates' => 'Check Updates',
            'execute_update' => 'Install Updates',
            'rollback_updates' => 'Rollback Updates',
        ];

        $pageOptions = collect(static::getPageOptions())
            ->except(["page_BackupManager", "page_SystemUpdater", "view_license_status", "page_LicenseStatus"])
            ->toArray();
            
        $widgetOptions = collect(static::getWidgetOptions())
            ->except(['widget_BackupTableWidget', 'widget_AutoBackupTableWidget'])
            ->toArray();
            
        $customOptions = collect(static::getCustomPermissionOptions())
            ->except(array_merge(array_keys($backupPermissions), array_keys($updaterPermissions), array_keys($licensePermissions)))
            ->toArray();

        $resourceSchemas = static::getResourceEntitiesSchema() ?? [];
        
        $resourceSchemas[] = Forms\Components\Section::make('Backup Manager')
            ->description('Manage backup system permissions')
            ->compact()
            ->collapsible()
            ->schema([
                static::getCheckboxListFormComponent('backup_manager_permissions', $backupPermissions, false)
            ])
            ->columnSpan(static::shield()->getSectionColumnSpan());

                $resourceSchemas[] = Forms\Components\Section::make('System Updater')
            ->description('Manage system update permissions')
            ->compact()
            ->collapsible()
            ->schema([
                static::getCheckboxListFormComponent('system_updater_permissions', $updaterPermissions, false)
            ])
            ->columnSpan(static::shield()->getSectionColumnSpan());

        $resourceSchemas[] = Forms\Components\Section::make('License Manager')
            ->description('Manage license information access')
            ->compact()
            ->collapsible()
            ->schema([
                static::getCheckboxListFormComponent('license_manager_permissions', $licensePermissions, false)
            ])
            ->columnSpan(static::shield()->getSectionColumnSpan());

        $tabs = [];

        $tabs[] = Forms\Components\Tabs\Tab::make('resources')
            ->label(__('filament-shield::filament-shield.resources'))
            ->badge(static::getResourceTabBadgeCount() + count($backupPermissions) + count($updaterPermissions) + count($licensePermissions))
            ->schema([
                Forms\Components\Grid::make()
                    ->schema($resourceSchemas)
                    ->columns(static::shield()->getGridColumns()),
            ]);

        if (count($pageOptions) > 0) {
            $tabs[] = Forms\Components\Tabs\Tab::make('pages')
                ->label(__('filament-shield::filament-shield.pages'))
                ->badge(count($pageOptions))
                ->schema([
                    static::getCheckboxListFormComponent('pages_tab', $pageOptions),
                ]);
        }

        if (count($widgetOptions) > 0) {
            $tabs[] = Forms\Components\Tabs\Tab::make('widgets')
                ->label(__('filament-shield::filament-shield.widgets'))
                ->badge(count($widgetOptions))
                ->schema([
                    static::getCheckboxListFormComponent('widgets_tab', $widgetOptions),
                ]);
        }

        if (Utils::isCustomPermissionEntityEnabled() && count($customOptions) > 0) {
            $tabs[] = Forms\Components\Tabs\Tab::make('custom')
                ->label(__('filament-shield::filament-shield.custom'))
                ->badge(count($customOptions))
                ->schema([
                    static::getCheckboxListFormComponent('custom_permissions', $customOptions),
                ]);
        }

        return Forms\Components\Tabs::make('Permissions')
            ->contained()
            ->tabs($tabs)
            ->columnSpan('full');
    }

    public static function getPermissionPrefixes(): array
    {
        return [
            'view',
            'view_any',
            'create',
            'update',
            'delete',
            'delete_any',
        ];
    }

    public static function form(Form $form): Form
    {
        return $form
            ->schema([
                Forms\Components\Grid::make()
                    ->schema([
                        Forms\Components\Section::make()
                            ->schema([
                                Forms\Components\TextInput::make('name')
                                    ->label(__('filament-shield::filament-shield.field.name'))
                                    ->unique(
                                        ignoreRecord: true, /** @phpstan-ignore-next-line */
                                        modifyRuleUsing: fn (Unique $rule) => Utils::isTenancyEnabled() ? $rule->where(Utils::getTenantModelForeignKey(), Filament::getTenant()?->id) : $rule
                                    )
                                    ->required()
                                    ->maxLength(255),

                                Forms\Components\TextInput::make('guard_name')
                                    ->label(__('filament-shield::filament-shield.field.guard_name'))
                                    ->default(Utils::getFilamentAuthGuard())
                                    ->nullable()
                                    ->maxLength(255),

                                Forms\Components\ColorPicker::make('color')
                                    ->label('Role Color')
                                    ->nullable(),

                                Forms\Components\Select::make(config('permission.column_names.team_foreign_key'))
                                    ->label(__('filament-shield::filament-shield.field.team'))
                                    ->placeholder(__('filament-shield::filament-shield.field.team.placeholder'))
                                    /** @phpstan-ignore-next-line */
                                    ->default([Filament::getTenant()?->id])
                                    ->options(fn (): Arrayable => Utils::getTenantModel() ? Utils::getTenantModel()::pluck('name', 'id') : collect())
                                    ->hidden(fn (): bool => ! (static::shield()->isCentralApp() && Utils::isTenancyEnabled()))
                                    ->dehydrated(fn (): bool => ! (static::shield()->isCentralApp() && Utils::isTenancyEnabled())),
                                ShieldSelectAllToggle::make('select_all')
                                    ->onIcon('heroicon-s-shield-check')
                                    ->offIcon('heroicon-s-shield-exclamation')
                                    ->label(__('filament-shield::filament-shield.field.select_all.name'))
                                    ->helperText(fn (): HtmlString => new HtmlString(__('filament-shield::filament-shield.field.select_all.message')))
                                    ->dehydrated(fn (bool $state): bool => $state),
                                Forms\Components\Toggle::make('custom_admin_access')
                                    ->label('Access Admin Panel')
                                    ->helperText('Enable this to grant access to the Admin Panel and allow assigning permissions.')
                                    ->onIcon('heroicon-s-shield-check')
                                    ->offIcon('heroicon-s-x-circle')
                                    ->live()
                                    ->afterStateHydrated(function ($component, $record) {
                                        if ($record) {
                                            $component->state($record->permissions->where('name', 'access_admin_panel')->isNotEmpty());
                                        }
                                    }),
                            ])
                            ->columns([
                                'sm' => 2,
                                'lg' => 3,
                            ]),
                    ]),
                Forms\Components\Group::make([
                    static::getShieldFormComponents(),
                ])->visible(fn (Forms\Get $get): bool => (bool) $get('custom_admin_access'))
                  ->columnSpanFull(),
            ]);
    }

    public static function table(Table $table): Table
    {
        return $table
            ->columns([
                Tables\Columns\ColorColumn::make('color')
                    ->label('Color')
                    ->searchable(),
                Tables\Columns\TextColumn::make('name')
                    ->badge()
                    ->color(function ($record) {
                        if (!$record->color) return 'primary';
                        if (str_starts_with($record->color, '#')) return \Filament\Support\Colors\Color::hex($record->color);
                        return $record->color;
                    })
                    ->weight('font-medium')
                    ->label(__('filament-shield::filament-shield.column.name'))
                    ->formatStateUsing(fn ($state): string => Str::headline($state))
                    ->searchable(),
                Tables\Columns\TextColumn::make('guard_name')
                    ->badge()
                    ->color('warning')
                    ->label(__('filament-shield::filament-shield.column.guard_name')),
                Tables\Columns\TextColumn::make('team.name')
                    ->default('Global')
                    ->badge()
                    ->color(fn (mixed $state): string => str($state)->contains('Global') ? 'gray' : 'primary')
                    ->label(__('filament-shield::filament-shield.column.team'))
                    ->searchable()
                    ->visible(fn (): bool => static::shield()->isCentralApp() && Utils::isTenancyEnabled()),
                Tables\Columns\TextColumn::make('permissions_count')
                    ->badge()
                    ->label(__('filament-shield::filament-shield.column.permissions'))
                    ->counts('permissions')
                    ->colors(['success']),
                Tables\Columns\TextColumn::make('updated_at')
                    ->label(__('filament-shield::filament-shield.column.updated_at'))
                    ->dateTime(),
            ])
            ->filters([
                //
            ])
            ->actions([
                Tables\Actions\EditAction::make(),
                Tables\Actions\DeleteAction::make(),
            ])
            ->bulkActions([
                Tables\Actions\DeleteBulkAction::make(),
            ]);
    }

    public static function getRelations(): array
    {
        return [
            //
        ];
    }

    public static function getPages(): array
    {
        return [
            'index' => Pages\ListRoles::route('/'),
            'create' => Pages\CreateRole::route('/create'),
            'view' => Pages\ViewRole::route('/{record}'),
            'edit' => Pages\EditRole::route('/{record}/edit'),
        ];
    }

    public static function getCluster(): ?string
    {
        return Utils::getResourceCluster() ?? static::$cluster;
    }

    public static function getModel(): string
    {
        return Utils::getRoleModel();
    }

    public static function getModelLabel(): string
    {
        return __('filament-shield::filament-shield.resource.label.role');
    }

    public static function getPluralModelLabel(): string
    {
        return __('filament-shield::filament-shield.resource.label.roles');
    }

    public static function shouldRegisterNavigation(): bool
    {
        return Utils::isResourceNavigationRegistered();
    }

    public static function getNavigationGroup(): ?string
    {
        return Utils::isResourceNavigationGroupEnabled()
            ? __('filament-shield::filament-shield.nav.group')
            : '';
    }

    public static function getNavigationLabel(): string
    {
        return __('filament-shield::filament-shield.nav.role.label');
    }

    public static function getNavigationIcon(): string
    {
        return __('filament-shield::filament-shield.nav.role.icon');
    }

    public static function getNavigationSort(): ?int
    {
        return Utils::getResourceNavigationSort();
    }

    public static function getSubNavigationPosition(): SubNavigationPosition
    {
        return Utils::getSubNavigationPosition() ?? static::$subNavigationPosition;
    }

    public static function getSlug(): string
    {
        return Utils::getResourceSlug();
    }

    public static function getNavigationBadge(): ?string
    {
        return Utils::isResourceNavigationBadgeEnabled()
            ? strval(static::getEloquentQuery()->count())
            : null;
    }

    public static function isScopedToTenant(): bool
    {
        return Utils::isScopedToTenant();
    }

    public static function canGloballySearch(): bool
    {
        return Utils::isResourceGloballySearchable() && count(static::getGloballySearchableAttributes()) && static::canViewAny();
    }
}
