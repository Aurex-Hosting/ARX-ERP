<?php

namespace App\Filament\Resources;

use App\Filament\Resources\UserResource\Pages;
use App\Filament\Resources\UserResource\RelationManagers;
use App\Models\User;
use Filament\Forms;
use Filament\Forms\Form;
use Filament\Resources\Resource;
use Filament\Tables;
use Filament\Tables\Table;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\SoftDeletingScope;

class UserResource extends Resource implements \BezhanSalleh\FilamentShield\Contracts\HasShieldPermissions
{
    public static function getPermissionPrefixes(): array
    {
        return [
            'view',
            'view_any',
            'create',
            'update',
            'delete',
            'delete_any',
            'restore',
            'restore_any',
            'force_delete',
            'force_delete_any',
            'lock',
            'verify',
            'resend_verification',
            'disable_2fa',
        ];
    }
    protected static ?string $model = User::class;

    protected static ?string $navigationIcon = 'heroicon-o-users';

    protected static ?string $navigationGroup = 'Filament Shield';

    public static function getNavigationBadge(): ?string
    {
        return static::getModel()::count();
    }

    public static function form(Form $form): Form
    {
        return $form
            ->schema([
                Forms\Components\Placeholder::make('profile_id')
                    ->label('Profile ID')
                    ->content(fn ($record) => $record?->profile_id ?? 'Will be generated on save')
                    ->visibleOn('edit'),
                Forms\Components\Grid::make(2)->schema([
                    Forms\Components\TextInput::make('first_name')
                        ->label('First Name')
                        ->required()
                        ->maxLength(255),
                    Forms\Components\TextInput::make('last_name')
                        ->label('Last Name')
                        ->required()
                        ->maxLength(255),
                ]),
                Forms\Components\FileUpload::make('avatar_url')
                    ->label('Profile Picture')
                    ->image()
                    ->directory('avatars')
                    ->visibility('public'),
                Forms\Components\FileUpload::make('banner_url')
                    ->label('Profile Banner')
                    ->image()
                    ->directory('banners')
                    ->visibility('public'),
                Forms\Components\TextInput::make('email')
                    ->email()
                    ->required()
                    ->maxLength(255),
                Forms\Components\TextInput::make('password')
                    ->password()
                    ->required(fn (string $context): bool => $context === 'create')
                    ->dehydrated(fn ($state) => filled($state))
                    ->maxLength(255),
                Forms\Components\Select::make('roles')
                    ->multiple()
                    ->relationship('roles', 'name')
                    ->preload()
                    ->searchable()
                    ->columnSpanFull(),
            ]);
    }

    public static function table(Table $table): Table
    {
        return $table
            ->columns([
                Tables\Columns\ImageColumn::make('avatar_url')
                    ->label('Avatar')
                    ->circular(),
                Tables\Columns\TextColumn::make('profile_id')
                    ->label('Profile ID')
                    ->searchable()
                    ->badge()
                    ->color('gray')
                    ->copyable(),
                Tables\Columns\TextColumn::make('full_name')
                    ->label('Name')
                    ->getStateUsing(fn ($record) => trim($record->first_name . ' ' . $record->last_name))
                    ->searchable(['first_name', 'last_name']),
                Tables\Columns\TextColumn::make('email')
                    ->searchable(),
                Tables\Columns\TextColumn::make('roles.name')
                    ->badge()
                    ->color(function (string $state) {
                        $color = \Spatie\Permission\Models\Role::where('name', $state)->value('color');
                        if (!$color) return 'primary';
                        if (str_starts_with($color, '#')) return \Filament\Support\Colors\Color::hex($color);
                        return $color;
                    })
                    ->searchable(),
                Tables\Columns\TextColumn::make('status')
                    ->label('Status')
                    ->badge()
                    ->getStateUsing(function (User $record) {
                        if ($record->is_locked) return 'Locked';
                        if (!$record->hasVerifiedEmail()) return 'Unverified';
                        return 'Verified';
                    })
                    ->color(fn (string $state): string => match ($state) {
                        'Locked' => 'danger',
                        'Unverified' => 'warning',
                        'Verified' => 'success',
                        default => 'gray',
                    })
                    ->icon(fn (string $state): string => match ($state) {
                        'Locked' => 'heroicon-m-lock-closed',
                        'Unverified' => 'heroicon-m-exclamation-circle',
                        'Verified' => 'heroicon-m-check-circle',
                        default => 'heroicon-m-minus',
                    }),
                Tables\Columns\TextColumn::make('created_at')
                    ->dateTime()
                    ->sortable()
                    ->toggleable(isToggledHiddenByDefault: true),
                Tables\Columns\TextColumn::make('deleted_at')
                    ->label('Pending Deletion')
                    ->getStateUsing(fn (User $record) => $record->trashed() ? max(0, round(30 - now()->diffInDays($record->deleted_at))) . ' days left' : '-')
                    ->color(fn (User $record) => $record->trashed() ? 'danger' : 'gray')
                    ->sortable()
                    ->toggleable(),
                Tables\Columns\TextColumn::make('updated_at')
                    ->dateTime()
                    ->sortable()
                    ->toggleable(isToggledHiddenByDefault: true),
            ])
            ->filters([
                //
            ])
            ->actions([
                Tables\Actions\Action::make('toggle_lock')
                    ->label(fn (User $record) => $record->is_locked ? 'Unlock' : 'Lock')
                    ->icon(fn (User $record) => $record->is_locked ? 'heroicon-o-lock-open' : 'heroicon-o-lock-closed')
                    ->color(fn (User $record) => $record->is_locked ? 'success' : 'danger')
                    ->action(function (User $record) {
                        $record->update([
                            'is_locked' => !$record->is_locked,
                            'failed_login_attempts' => 0
                        ]);
                        \Filament\Notifications\Notification::make()
                            ->title($record->is_locked ? 'Account Locked' : 'Account Unlocked')
                            ->success()
                            ->send();
                    })
                    ->requiresConfirmation()
                    ->modalHeading(fn (User $record) => $record->is_locked ? 'Unlock Account' : 'Lock Account')
                    ->modalDescription(fn (User $record) => $record->is_locked ? 'Are you sure you want to unlock this account?' : 'Are you sure you want to lock this account? The user will be unable to log in.')
                    ->hidden(fn (User $record) => auth()->id() === $record->id || !auth()->user()->can('lock_user') || $record->trashed()),
                Tables\Actions\Action::make('resend_verification')
                    ->label('Resend Link')
                    ->icon('heroicon-o-envelope')
                    ->color('warning')
                    ->action(function (User $record) {
                        try {
                            $settings = app(\App\Settings\MailSettings::class);
                            config([
                                'mail.default' => $settings->mail_mailer,
                                'mail.mailers.smtp.host' => $settings->mail_host,
                                'mail.mailers.smtp.port' => $settings->mail_port,
                                'mail.mailers.smtp.username' => $settings->mail_username,
                                'mail.mailers.smtp.password' => $settings->mail_password,
                                'mail.mailers.smtp.encryption' => $settings->mail_encryption ?: null,
                                'mail.mailers.smtp.verify_peer' => $settings->mail_verify_peer,
                                'mail.from.address' => $settings->mail_from_address,
                                'mail.from.name' => $settings->mail_from_name,
                            ]);

                            $verifyUrl = \Illuminate\Support\Facades\URL::temporarySignedRoute(
                                'verification.verify',
                                now()->addHours(24),
                                ['id' => $record->getKey(), 'hash' => sha1($record->getEmailForVerification())]
                            );

                            $body = $settings->mail_template_email_verification;
                            $body = str_replace(['{{verify_url}}', '{{name}}'], [$verifyUrl, $record->name], $body);
                            
                            if (is_array($settings->mail_placeholders)) {
                                foreach ($settings->mail_placeholders as $k => $v) {
                                    $body = str_replace('{{'.$k.'}}', $v, $body);
                                }
                            }

                            \Illuminate\Support\Facades\Mail::html($body, function($msg) use ($record) {
                                $msg->to($record->email)->subject('Verify your account');
                            });
                            
                            \Filament\Notifications\Notification::make()->title('Verification link resent!')->success()->send();
                        } catch (\Exception $e) {
                            \Filament\Notifications\Notification::make()->title('Failed to resend link')->body($e->getMessage())->danger()->send();
                        }
                    })
                    ->requiresConfirmation()
                    ->hidden(fn (User $record) => $record->hasVerifiedEmail() || !auth()->user()->can('resend_verification_user') || $record->trashed()),
                Tables\Actions\Action::make('verify')
                    ->label('Verify')
                    ->icon('heroicon-o-check-circle')
                    ->color('success')
                    ->action(fn (User $record) => $record->markEmailAsVerified())
                    ->requiresConfirmation()
                    ->hidden(fn (User $record) => $record->hasVerifiedEmail() || !auth()->user()->can('verify_user') || $record->trashed()),
                Tables\Actions\Action::make('disable_2fa')
                    ->label('Disable 2FA')
                    ->icon('heroicon-o-shield-exclamation')
                    ->color('danger')
                    ->action(function (User $record) {
                        $record->update([
                            'two_factor_secret' => null,
                            'two_factor_recovery_codes' => null,
                            'two_factor_confirmed_at' => null,
                        ]);
                        \Filament\Notifications\Notification::make()
                            ->title('2FA Disabled')
                            ->body('Two-factor authentication has been forcefully disabled for this user.')
                            ->success()
                            ->send();
                    })
                    ->requiresConfirmation()
                    ->modalHeading('Disable Two-Factor Authentication')
                    ->modalDescription('Are you sure you want to forcefully disable 2FA for this user? This will allow them to log in without an authenticator code.')
                    ->hidden(fn (User $record) => $record->two_factor_confirmed_at === null || !auth()->user()->can('disable_2fa_user') || $record->trashed()),
                Tables\Actions\EditAction::make(),
                Tables\Actions\DeleteAction::make()
                    ->hidden(fn (User $record) => auth()->id() === $record->id || $record->trashed()),
                Tables\Actions\RestoreAction::make()
                    ->hidden(fn (User $record) => !$record->trashed()),
                Tables\Actions\ForceDeleteAction::make()
                    ->hidden(fn (User $record) => auth()->id() === $record->id || !$record->trashed()),
            ])
            ->bulkActions([
                Tables\Actions\BulkActionGroup::make([
                    Tables\Actions\DeleteBulkAction::make()
                        ->action(function (\Illuminate\Database\Eloquent\Collection $records) {
                            $records->each(function ($record) {
                                if (auth()->id() !== $record->id) {
                                    $record->delete();
                                }
                            });
                        }),
                    Tables\Actions\RestoreBulkAction::make(),
                    Tables\Actions\ForceDeleteBulkAction::make(),
                ]),
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
            'index' => Pages\ListUsers::route('/'),
            'create' => Pages\CreateUser::route('/create'),
            'edit' => Pages\EditUser::route('/{record}/edit'),
            'recycle-bin' => Pages\RecycleBin::route('/recycle-bin'),
        ];
    }
}
