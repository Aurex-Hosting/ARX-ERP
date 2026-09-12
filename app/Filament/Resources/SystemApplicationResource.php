<?php

namespace App\Filament\Resources;

use App\Filament\Resources\SystemApplicationResource\Pages;
use App\Filament\Resources\SystemApplicationResource\RelationManagers;
use App\Models\SystemApplication;
use Filament\Forms;
use Filament\Forms\Form;
use Filament\Resources\Resource;
use Filament\Tables;
use Filament\Tables\Table;
use Filament\Infolists\Infolist;
use Filament\Infolists\Components;

class SystemApplicationResource extends Resource
{
    protected static ?string $model = SystemApplication::class;

    protected static ?string $navigationIcon = 'heroicon-o-server';
    protected static ?string $navigationGroup = 'Integrations';
    protected static ?string $navigationLabel = 'API Keys';
    protected static ?string $modelLabel = 'System Application';

    public static function form(Form $form): Form
    {
        return $form
            ->schema([
                Forms\Components\TextInput::make('name')
                    ->required()
                    ->maxLength(255),
                Forms\Components\Textarea::make('description')
                    ->maxLength(65535)
                    ->columnSpanFull(),
            ]);
    }

    public static function table(Table $table): Table
    {
        return $table
            ->columns([
                Tables\Columns\TextColumn::make('name')
                    ->searchable(),
                Tables\Columns\TextColumn::make('created_at')
                    ->dateTime()
                    ->sortable()
                    ->toggleable(isToggledHiddenByDefault: true),
                Tables\Columns\TextColumn::make('updated_at')
                    ->dateTime()
                    ->sortable()
                    ->toggleable(isToggledHiddenByDefault: true),
            ])
            ->filters([
                //
            ])
            ->actions([
                Tables\Actions\ViewAction::make(),
                Tables\Actions\EditAction::make(),
            ])
            ->bulkActions([
                Tables\Actions\BulkActionGroup::make([
                    Tables\Actions\DeleteBulkAction::make(),
                ]),
            ]);
    }

    public static function infolist(Infolist $infolist): Infolist
    {
        return $infolist
            ->schema([
                Components\Section::make('Application Details')
                    ->schema([
                        Components\TextEntry::make('name')->weight('bold'),
                        Components\TextEntry::make('description')->markdown(),
                        Components\TextEntry::make('created_at')->dateTime(),
                    ])->columns(2)
            ]);
    }

    public static function getRelations(): array
    {
        return [
            RelationManagers\TokensRelationManager::class,
        ];
    }

    public static function getPages(): array
    {
        return [
            'index' => Pages\ListSystemApplications::route('/'),
            'create' => Pages\CreateSystemApplication::route('/create'),
            'view' => Pages\ViewSystemApplication::route('/{record}'),
            'edit' => Pages\EditSystemApplication::route('/{record}/edit'),
        ];
    }
}
