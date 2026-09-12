<?php

namespace App\Livewire;

use Livewire\Component;
use Filament\Forms\Concerns\InteractsWithForms;
use Filament\Forms\Contracts\HasForms;
use Filament\Tables\Concerns\InteractsWithTable;
use Filament\Tables\Contracts\HasTable;
use Filament\Tables\Table;
use Filament\Tables;
use Filament\Forms;
use Illuminate\Support\HtmlString;
use App\Models\PersonalAccessToken;

class UserApiTokens extends Component implements HasForms, HasTable
{
    use InteractsWithForms;
    use InteractsWithTable;

    public function table(Table $table): Table
    {
        return $table
            ->query(PersonalAccessToken::query()->where('tokenable_type', \App\Models\User::class)->where('tokenable_id', auth()->id()))
            ->columns([
                Tables\Columns\TextColumn::make('name')->searchable(),
                Tables\Columns\TextColumn::make('rate_limit')->label('Rate Limit (per min)')->default('Unlimited'),
                Tables\Columns\TextColumn::make('last_used_at')->dateTime(),
                Tables\Columns\TextColumn::make('expires_at')->dateTime(),
            ])
            ->headerActions([
                Tables\Actions\CreateAction::make('create')
                    ->label('Generate New Token')
                    ->model(PersonalAccessToken::class)
                    ->form([
                        Forms\Components\TextInput::make('name')->required(),
                        Forms\Components\DateTimePicker::make('expires_at'),
                        Forms\Components\TextInput::make('rate_limit')
                            ->numeric()
                            ->label('Rate Limit (Requests per minute)')
                            ->helperText('Leave empty for unlimited.'),
                        Forms\Components\TagsInput::make('allowed_ips')
                            ->label('Allowed IP Addresses')
                            ->helperText('Restrict usage to specific IPs or CIDR blocks. Leave empty to allow any IP.'),
                        Forms\Components\TagsInput::make('blocked_ips')
                            ->label('Blocked IP Addresses'),
                        Forms\Components\CheckboxList::make('abilities')
                            ->label('Allowed Endpoints (Abilities)')
                            ->options([
                                '*' => 'Full Access (All Endpoints)',
                                'users:read' => 'Read Users (GET /api/v1/users)',
                                'users:write' => 'Write Users (POST/PUT /api/v1/users)',
                                'users:delete' => 'Delete Users (DELETE /api/v1/users)',
                                'roles:read' => 'Read Roles (GET /api/v1/roles)',
                                'roles:write' => 'Write Roles (POST/PUT /api/v1/roles)',
                                'permissions:read' => 'Read Permissions (GET /api/v1/permissions)',
                                'logs:read' => 'Read Logs (GET /api/v1/logs/*)',
                                'settings:read' => 'Read Settings (GET /api/v1/settings/*)',
                                'settings:write' => 'Write Settings (PUT /api/v1/settings/*)',
                                'applications:read' => 'Read Applications (GET /api/v1/applications)',
                            ])
                            ->columns(2)
                            ->bulkToggleable()
                            ->live()
                            ->afterStateUpdated(function (Forms\Set $set, $state) {
                                if (is_array($state) && in_array('*', $state)) {
                                    $set('abilities', ['*', 'users:read', 'users:write', 'users:delete', 'roles:read', 'roles:write', 'permissions:read', 'logs:read', 'settings:read', 'settings:write', 'applications:read']);
                                }
                            })
                            ->required()
                            ->columnSpanFull(),
                    ])
                    ->using(function (array $data) {
                        $token = auth()->user()->createToken($data['name'], $data['abilities'] ?? ['*'], $data['expires_at'] ? \Carbon\Carbon::parse($data['expires_at']) : null);
                        
                        $token->accessToken->rate_limit = $data['rate_limit'] ?? null;
                        $token->accessToken->allowed_ips = $data['allowed_ips'] ?? null;
                        $token->accessToken->blocked_ips = $data['blocked_ips'] ?? null;
                        $token->accessToken->save();

                        \Filament\Notifications\Notification::make()
                            ->title('Token Generated')
                            ->body(new HtmlString("Please copy your token now. You will not be able to see it again:<br><br><strong>{$token->plainTextToken}</strong>"))
                            ->success()
                            ->persistent()
                            ->send();

                        return $token->accessToken;
                    }),
            ])
            ->actions([
                Tables\Actions\EditAction::make()
                    ->label('Edit Security Settings')
                    ->form([
                        Forms\Components\TextInput::make('name')
                            ->required()
                            ->disabled(),
                        Forms\Components\DateTimePicker::make('expires_at'),
                        Forms\Components\TextInput::make('rate_limit')
                            ->numeric()
                            ->label('Rate Limit (Requests per minute)')
                            ->helperText('Leave empty for unlimited.'),
                        Forms\Components\TagsInput::make('allowed_ips')
                            ->label('Allowed IP Addresses')
                            ->helperText('Restrict usage to specific IPs or CIDR blocks. Leave empty to allow any IP.'),
                        Forms\Components\TagsInput::make('blocked_ips')
                            ->label('Blocked IP Addresses'),
                        Forms\Components\CheckboxList::make('abilities')
                            ->label('Allowed Endpoints (Abilities)')
                            ->options([
                                '*' => 'Full Access (All Endpoints)',
                                'users:read' => 'Read Users (GET /api/v1/users)',
                                'users:write' => 'Write Users (POST/PUT /api/v1/users)',
                                'users:delete' => 'Delete Users (DELETE /api/v1/users)',
                                'roles:read' => 'Read Roles (GET /api/v1/roles)',
                                'roles:write' => 'Write Roles (POST/PUT /api/v1/roles)',
                                'permissions:read' => 'Read Permissions (GET /api/v1/permissions)',
                                'logs:read' => 'Read Logs (GET /api/v1/logs/*)',
                                'settings:read' => 'Read Settings (GET /api/v1/settings/*)',
                                'settings:write' => 'Write Settings (PUT /api/v1/settings/*)',
                                'applications:read' => 'Read Applications (GET /api/v1/applications)',
                            ])
                            ->columns(2)
                            ->bulkToggleable()
                            ->live()
                            ->afterStateUpdated(function (Forms\Set $set, $state) {
                                if (is_array($state) && in_array('*', $state)) {
                                    $set('abilities', ['*', 'users:read', 'users:write', 'users:delete', 'roles:read', 'roles:write', 'permissions:read', 'logs:read', 'settings:read', 'settings:write', 'applications:read']);
                                }
                            })
                            ->required()
                            ->columnSpanFull(),
                    ]),
                Tables\Actions\DeleteAction::make()->label('Revoke'),
            ]);
    }

    public function render()
    {
        return view('livewire.user-api-tokens');
    }
}
