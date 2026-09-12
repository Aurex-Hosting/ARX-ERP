<?php

namespace App\Filament\Pages;

use App\Settings\StorageSettings;
use Filament\Forms;
use Filament\Forms\Form;
use Filament\Forms\Components\Section;
use Filament\Forms\Components\Grid;
use Filament\Forms\Components\Radio;
use Filament\Forms\Components\Toggle;
use Filament\Forms\Components\TextInput;
use Filament\Forms\Components\Placeholder;
use Filament\Forms\Components\Actions\Action as FormAction;
use Filament\Actions\Action;
use Illuminate\Support\HtmlString;
use Illuminate\Support\Facades\Storage as StorageFacade;

class Storage extends BaseSettingsPage
{
    
    
    protected static ?string $navigationIcon = 'heroicon-o-server-stack';
    protected static ?string $navigationGroup = 'System Settings';
    protected static ?string $title = 'Storage Settings';
    protected static ?string $navigationLabel = 'Storage';
    
    protected static string $settings = StorageSettings::class;

    public static function canAccess(): bool
    {
        return auth()->user()->can('view_storage');
    }

    

    public function form(Form $form): Form
    {
        return $form
            ->schema([
                Grid::make(3)->schema([
                    Grid::make(1)->columnSpan(2)->schema([
                        Section::make('Storage Provider')
                            ->schema([
                                Radio::make('provider')
                                    ->label('')
                                    ->options([
                                        'local' => 'Local Storage',
                                        's3' => 'Amazon S3',
                                        'bunny' => 'Bunny.net Storage',
                                        'r2' => 'Cloudflare R2',
                                        'spaces' => 'DigitalOcean Spaces',
                                        'custom' => 'Custom S3 Compatible',
                                    ])
                                    ->descriptions([
                                        'local' => 'Files stored on the server filesystem.',
                                        's3' => 'Amazon Web Services Simple Storage Service.',
                                        'bunny' => 'Bunny.net S3 compatible object storage with global CDN.',
                                        'r2' => 'Cloudflare R2 object storage, zero egress fees.',
                                        'spaces' => 'DigitalOcean Spaces object storage.',
                                        'custom' => 'Any S3 compatible provider (MinIO, Wasabi, Hetzner, etc.).',
                                    ])
                                    ->view('filament.forms.components.provider-cards')
                                    ->extraAttributes(['class' => 'w-full'])
                                    ->live()
                                    ->afterStateUpdated(function ($state, Forms\Set $set) {
                                        if ($state === 's3') {
                                            $set('s3_endpoint', 'https://s3.amazonaws.com');
                                            $set('s3_region', 'us-east-1');
                                        } elseif ($state === 'r2') {
                                            $set('s3_endpoint', 'https://<ACCOUNT_ID>.r2.cloudflarestorage.com');
                                            $set('s3_region', 'auto');
                                        } elseif ($state === 'bunny') {
                                            $set('s3_endpoint', 'https://ny.storage.bunnycdn.com');
                                            $set('s3_region', 'ny');
                                            $set('s3_use_path_style_endpoint', true);
                                        }
                                    }),
                            ]),

                        Section::make('Status')
                            ->visible(fn (Forms\Get $get) => $get('provider') !== 'local')
                            ->schema([
                                Toggle::make('s3_enabled')
                                    ->label('Enable S3 Storage')
                                    ->helperText('When enabled, all new file uploads will go to your configured bucket.'),
                            ]),

                        Section::make('Credentials')
                            ->visible(fn (Forms\Get $get) => $get('provider') !== 'local')
                            ->schema([
                                TextInput::make('s3_key')
                                    ->label('Access Key ID')
                                    ->password()
                                    ->revealable()
                                    ->required(fn (Forms\Get $get) => $get('provider') !== 'local'),
                                TextInput::make('s3_secret')
                                    ->label('Secret Access Key')
                                    ->password()
                                    ->revealable()
                                    ->required(fn (Forms\Get $get) => $get('provider') !== 'local'),
                                TextInput::make('s3_bucket')
                                    ->label('Bucket Name')
                                    ->required(fn (Forms\Get $get) => $get('provider') !== 'local')
                                    ->helperText(new HtmlString('<ul class="list-disc ml-4 mt-2 text-sm"><li>Create an IAM user with s3:PutObject, s3:GetObject, s3:DeleteObject, s3:ListBucket permissions.</li><li>Make sure the bucket has a public read policy or use a CloudFront CDN URL.</li></ul>')),
                            ]),
                    ]),

                    Grid::make(1)->columnSpan(1)->schema([
                        Section::make('Endpoint & Region')
                            ->visible(fn (Forms\Get $get) => $get('provider') !== 'local')
                            ->schema([
                                TextInput::make('s3_endpoint')
                                    ->label('Endpoint URL')
                                    ->required(fn (Forms\Get $get) => $get('provider') !== 'local' && $get('provider') !== 's3'),
                                TextInput::make('s3_region')
                                    ->label('Region')
                                    ->required(fn (Forms\Get $get) => $get('provider') !== 'local'),
                                Toggle::make('s3_use_path_style_endpoint')
                                    ->label('Force Path-Style URLs')
                                    ->helperText('Required for Bunny.net, MinIO, and some other providers.'),
                            ]),

                        Section::make('Public URL')
                            ->visible(fn (Forms\Get $get) => $get('provider') !== 'local')
                            ->schema([
                                TextInput::make('s3_url')
                                    ->label('CDN / Public Base URL')
                                    ->placeholder('https://cdn.example.com')
                                    ->url(),
                            ]),

                        Section::make('Test Connection')
                            ->visible(fn (Forms\Get $get) => $get('provider') !== 'local')
                            ->schema([
                                Placeholder::make('test_desc')
                                    ->label('')
                                    ->content('Verify your credentials by uploading and deleting a small test file from the configured bucket.'),
                                Forms\Components\Actions::make([
                                    FormAction::make('test_connection')
                                        ->label('Test Connection')
                                        ->icon('heroicon-o-wifi')
                                        ->action(function (Forms\Get $get) {
                                            try {
                                                if (empty($get('s3_bucket')) || empty($get('s3_region'))) {
                                                    throw new \Exception("Bucket Name and Region are required.");
                                                }
                                            
                                                $disk = StorageFacade::build([
                                                    'driver' => 's3',
                                                    'key' => $get('s3_key'),
                                                    'secret' => $get('s3_secret'),
                                                    'region' => $get('s3_region'),
                                                    'bucket' => $get('s3_bucket'),
                                                    'url' => $get('s3_url'),
                                                    'endpoint' => $get('s3_endpoint'),
                                                    'use_path_style_endpoint' => $get('s3_use_path_style_endpoint'),
                                                ]);
                                                
                                                if (!$disk->put('test-connection.txt', 'test')) {
                                                    throw new \Exception("Could not write to bucket.");
                                                }
                                                $disk->delete('test-connection.txt');
                                                
                                                \Filament\Notifications\Notification::make()
                                                    ->title('Connection Successful!')
                                                    ->success()
                                                    ->send();
                                            } catch (\Exception $e) {
                                                \Filament\Notifications\Notification::make()
                                                    ->title('Connection Failed')
                                                    ->body($e->getMessage())
                                                    ->danger()
                                                    ->send();
                                            }
                                        })
                                ])
                            ]),

                        Section::make('How It Works')
                            ->schema([
                                Placeholder::make('how_it_works')
                                    ->label('')
                                    ->content(new HtmlString('
                                        <ul class="list-disc ml-4 space-y-2 text-sm">
                                            <li>When S3 is active, all uploads (product images, banners, logos, avatars) go to your configured bucket.</li>
                                            <li>Existing files stored locally are not automatically migrated.</li>
                                            <li>Your bucket must allow public reads for images to display correctly (unless you set a CDN URL).</li>
                                            <li>Saving does not activate storage - you must also toggle "Enable S3 Storage" on.</li>
                                        </ul>
                                    ')),
                            ])
                    ]),
                ])
            ]);
    }
}


