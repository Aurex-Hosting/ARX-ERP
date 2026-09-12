<?php

namespace App\Filament\Resources\SystemApplicationResource\RelationManagers;

use Filament\Forms;
use Filament\Forms\Form;
use Filament\Resources\RelationManagers\RelationManager;
use Filament\Tables;
use Filament\Tables\Table;
use Illuminate\Support\HtmlString;

class TokensRelationManager extends RelationManager
{
    protected static string $relationship = 'tokens';
    protected static ?string $title = 'API Tokens';

    public function form(Form $form): Form
    {
        return $form
            ->schema([
                Forms\Components\TextInput::make('name')
                    ->required()
                    ->maxLength(255)
                    ->disabled(fn ($operation) => $operation === 'edit'),
                    
                Forms\Components\DateTimePicker::make('expires_at')
                    ->label('Expiration Date'),
                    
                Forms\Components\TextInput::make('rate_limit')
                    ->numeric()
                    ->label('Rate Limit (Requests per minute)')
                    ->helperText('Leave empty for unlimited.'),
                    
                Forms\Components\TagsInput::make('allowed_ips')
                    ->label('Allowed IP Addresses')
                    ->helperText('Restrict usage to specific IPs or CIDR blocks. Leave empty to allow any IP.')
                    ->placeholder('e.g., 192.168.1.100 or 10.0.0.0/24'),
                    
                Forms\Components\TagsInput::make('blocked_ips')
                    ->label('Blocked IP Addresses')
                    ->helperText('Block specific IPs or CIDR blocks from using this token.'),

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
                            $set('abilities', [
                                '*', 
                                'users:read', 'users:write', 'users:delete', 
                                'roles:read', 'roles:write', 'permissions:read', 
                                'logs:read', 'settings:read', 'settings:write', 
                                'applications:read'
                            ]);
                        }
                    })
                    ->required()
                    ->columnSpanFull(),
            ]);
    }

    public function table(Table $table): Table
    {
        return $table
            ->recordTitleAttribute('name')
            ->columns([
                Tables\Columns\TextColumn::make('name'),
                Tables\Columns\TextColumn::make('abilities')->badge(),
                Tables\Columns\TextColumn::make('rate_limit')->default('Unlimited'),
                Tables\Columns\TextColumn::make('last_used_at')->dateTime(),
                Tables\Columns\TextColumn::make('expires_at')->dateTime(),
            ])
            ->filters([])
            ->headerActions([
                Tables\Actions\CreateAction::make()
                    ->label('Generate New Token')
                    ->using(function (array $data, string $model, RelationManager $livewire): \Illuminate\Database\Eloquent\Model {
                        $application = $livewire->getOwnerRecord();
                        $token = $application->createToken($data['name'], $data['abilities'] ?? ['*'], $data['expires_at'] ? \Carbon\Carbon::parse($data['expires_at']) : null);
                        
                        $token->accessToken->rate_limit = $data['rate_limit'] ?? null;
                        $token->accessToken->allowed_ips = $data['allowed_ips'] ?? null;
                        $token->accessToken->blocked_ips = $data['blocked_ips'] ?? null;
                        $token->accessToken->save();

                        activity()->causedBy(auth()->user())->performedOn($application)->log("Generated API token: {$data['name']}");

                        \Filament\Notifications\Notification::make()
                            ->title('System Token Generated')
                            ->body(new HtmlString("Please copy this System API Token now. You will not be able to see it again:<br><br><strong>{$token->plainTextToken}</strong>"))
                            ->success()
                            ->persistent()
                            ->send();

                        return $token->accessToken;
                    }),
            ])
            ->actions([
                Tables\Actions\EditAction::make()->label('Edit Security Settings'),
                Tables\Actions\DeleteAction::make()->after(function ($record, RelationManager $livewire) { activity()->causedBy(auth()->user())->performedOn($livewire->getOwnerRecord())->log("Revoked API token: {$record->name}"); })->label('Revoke'),
            ])
            ->bulkActions([
                Tables\Actions\BulkActionGroup::make([
                    Tables\Actions\DeleteBulkAction::make()->label('Revoke Selected'),
                ]),
            ]);
    }
}

