<?php

namespace App\Livewire;

use Filament\Forms\Concerns\InteractsWithForms;
use Filament\Forms\Contracts\HasForms;
use Filament\Tables\Columns\TextColumn;
use Filament\Tables\Concerns\InteractsWithTable;
use Filament\Tables\Contracts\HasTable;
use Filament\Tables\Table;
use App\Models\LoginHistory;
use Livewire\Component;

class LoginHistoryTable extends Component implements HasForms, HasTable
{
    use InteractsWithForms;
    use InteractsWithTable;

    public function table(Table $table): Table
    {
        return $table
            ->query(LoginHistory::where("user_id", auth()->id()))
            ->columns([
                TextColumn::make("created_at")
                    ->label("Date / Time")
                    ->dateTime("M d, Y h:i A")
                    ->sortable(),
                
                TextColumn::make("ip_address")
                    ->label("IP Address")
                    ->searchable(),
                
                TextColumn::make("user_agent")
                    ->label("Device / Browser")
                    ->wrap()
                    ->limit(40)
                    ->tooltip(fn ($record) => $record->user_agent)
                    ->searchable(),
            ])
            ->filters([
                //
            ])
            ->actions([
                //
            ])
            ->bulkActions([
                //
            ])
            ->defaultSort("created_at", "desc")
            ->defaultPaginationPageOption(5)
            ->paginationPageOptions([5, 10, 25, 50, 100]);
    }

    public function render()
    {
        return view("livewire.login-history-table");
    }
}
