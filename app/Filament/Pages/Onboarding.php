<?php

namespace App\Filament\Pages;

use Filament\Forms\Concerns\InteractsWithForms;
use Filament\Forms\Contracts\HasForms;
use Filament\Forms\Form;
use Filament\Pages\Page;
use Filament\Forms\Components;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\HtmlString;

class Onboarding extends Page implements HasForms
{
    use InteractsWithForms;

    protected static string $view = 'filament.pages.onboarding';
    protected static string $layout = 'filament-panels::components.layout.simple';
    protected static bool $shouldRegisterNavigation = false;
    protected static ?string $title = 'Account Setup';
    
    public ?array $data = [];

    public function hasLogo(): bool
    {
        return false;
    }

    public function mount(): void
    {
        $user = auth()->user();
        if (!$user->force_password_change && !$user->force_profile_update) {
            redirect('/admin');
        }
        
        $this->form->fill($user->toArray());
    }

    public function form(Form $form): Form
    {
        return $form
            ->schema([
                Components\Wizard::make([
                    Components\Wizard\Step::make('Security')
                        ->description('Update your password')
                        ->schema([
                            Components\TextInput::make('new_password')
                                ->label('New Password')
                                ->password()
                                ->required()
                                ->confirmed(),
                            Components\TextInput::make('new_password_confirmation')
                                ->label('Confirm New Password')
                                ->password()
                                ->required(),
                        ])
                        ->afterValidation(function ($state) {
                            $user = auth()->user();
                            $user->update([
                                'password' => Hash::make($state['new_password']),
                                'force_password_change' => false,
                            ]);
                        }),

                    Components\Wizard\Step::make('Profile')
                        ->description('Update your personal details')
                        ->schema([
                            Components\Grid::make(2)->schema([
                                Components\FileUpload::make('avatar_url')
                                    ->label('Profile Picture')
                                    ->image()
                                    ->directory('avatars')
                                    ->visibility('public')
                                    ->columnSpan(1),
                                Components\FileUpload::make('banner_url')
                                    ->label('Profile Banner')
                                    ->image()
                                    ->directory('banners')
                                    ->visibility('public')
                                    ->columnSpan(1),
                                Components\TextInput::make('first_name')
                                    ->label('First Name')
                                    ->required()
                                    ->maxLength(255),
                                Components\TextInput::make('last_name')
                                    ->label('Last Name')
                                    ->required()
                                    ->maxLength(255),
                                Components\TextInput::make('phone_number')
                                    ->label('Phone Number')
                                    ->tel()
                                    ->required()
                                    ->maxLength(255)
                                    ->columnSpanFull(),
                            ]),
                            Components\Grid::make(2)->schema([
                                Components\Select::make('country')
                                    ->label('Country')
                                    ->required()
                                    ->searchable()
                                    ->options([
                                        'Afghanistan'=>'Afghanistan','Albania'=>'Albania','Algeria'=>'Algeria','Andorra'=>'Andorra','Angola'=>'Angola','Antigua and Barbuda'=>'Antigua and Barbuda','Argentina'=>'Argentina','Armenia'=>'Armenia','Australia'=>'Australia','Austria'=>'Austria','Azerbaijan'=>'Azerbaijan','Bahamas'=>'Bahamas','Bahrain'=>'Bahrain','Bangladesh'=>'Bangladesh','Barbados'=>'Barbados','Belarus'=>'Belarus','Belgium'=>'Belgium','Belize'=>'Belize','Benin'=>'Benin','Bhutan'=>'Bhutan','Bolivia'=>'Bolivia','Bosnia and Herzegovina'=>'Bosnia and Herzegovina','Botswana'=>'Botswana','Brazil'=>'Brazil','Brunei'=>'Brunei','Bulgaria'=>'Bulgaria','Burkina Faso'=>'Burkina Faso','Burundi'=>'Burundi','Côte d\'Ivoire'=>'Côte d\'Ivoire','Cabo Verde'=>'Cabo Verde','Cambodia'=>'Cambodia','Cameroon'=>'Cameroon','Canada'=>'Canada','Central African Republic'=>'Central African Republic','Chad'=>'Chad','Chile'=>'Chile','China'=>'China','Colombia'=>'Colombia','Comoros'=>'Comoros','Congo (Congo-Brazzaville)'=>'Congo (Congo-Brazzaville)','Costa Rica'=>'Costa Rica','Croatia'=>'Croatia','Cuba'=>'Cuba','Cyprus'=>'Cyprus','Czechia (Czech Republic)'=>'Czechia (Czech Republic)','Democratic Republic of the Congo'=>'Democratic Republic of the Congo','Denmark'=>'Denmark','Djibouti'=>'Djibouti','Dominica'=>'Dominica','Dominican Republic'=>'Dominican Republic','Ecuador'=>'Ecuador','Egypt'=>'Egypt','El Salvador'=>'El Salvador','Equatorial Guinea'=>'Equatorial Guinea','Eritrea'=>'Eritrea','Estonia'=>'Estonia','Eswatini'=>'Eswatini','Ethiopia'=>'Ethiopia','Fiji'=>'Fiji','Finland'=>'Finland','France'=>'France','Gabon'=>'Gabon','Gambia'=>'Gambia','Georgia'=>'Georgia','Germany'=>'Germany','Ghana'=>'Ghana','Greece'=>'Greece','Grenada'=>'Grenada','Guatemala'=>'Guatemala','Guinea'=>'Guinea','Guinea-Bissau'=>'Guinea-Bissau','Guyana'=>'Guyana','Haiti'=>'Haiti','Holy See'=>'Holy See','Honduras'=>'Honduras','Hungary'=>'Hungary','Iceland'=>'Iceland','India'=>'India','Indonesia'=>'Indonesia','Iran'=>'Iran','Iraq'=>'Iraq','Ireland'=>'Ireland','Israel'=>'Israel','Italy'=>'Italy','Jamaica'=>'Jamaica','Japan'=>'Japan','Jordan'=>'Jordan','Kazakhstan'=>'Kazakhstan','Kenya'=>'Kenya','Kiribati'=>'Kiribati','Kuwait'=>'Kuwait','Kyrgyzstan'=>'Kyrgyzstan','Laos'=>'Laos','Latvia'=>'Latvia','Lebanon'=>'Lebanon','Lesotho'=>'Lesotho','Liberia'=>'Liberia','Libya'=>'Libya','Liechtenstein'=>'Liechtenstein','Lithuania'=>'Lithuania','Luxembourg'=>'Luxembourg','Madagascar'=>'Madagascar','Malawi'=>'Malawi','Malaysia'=>'Malaysia','Maldives'=>'Maldives','Mali'=>'Mali','Malta'=>'Malta','Marshall Islands'=>'Marshall Islands','Mauritania'=>'Mauritania','Mauritius'=>'Mauritius','Mexico'=>'Mexico','Micronesia'=>'Micronesia','Moldova'=>'Moldova','Monaco'=>'Monaco','Mongolia'=>'Mongolia','Montenegro'=>'Montenegro','Morocco'=>'Morocco','Mozambique'=>'Mozambique','Myanmar (formerly Burma)'=>'Myanmar (formerly Burma)','Namibia'=>'Namibia','Nauru'=>'Nauru','Nepal'=>'Nepal','Netherlands'=>'Netherlands','New Zealand'=>'New Zealand','Nicaragua'=>'Nicaragua','Niger'=>'Niger','Nigeria'=>'Nigeria','North Korea'=>'North Korea','North Macedonia'=>'North Macedonia','Norway'=>'Norway','Oman'=>'Oman','Pakistan'=>'Pakistan','Palau'=>'Palau','Palestine State'=>'Palestine State','Panama'=>'Panama','Papua New Guinea'=>'Papua New Guinea','Paraguay'=>'Paraguay','Peru'=>'Peru','Philippines'=>'Philippines','Poland'=>'Poland','Portugal'=>'Portugal','Qatar'=>'Qatar','Romania'=>'Romania','Russia'=>'Russia','Rwanda'=>'Rwanda','Saint Kitts and Nevis'=>'Saint Kitts and Nevis','Saint Lucia'=>'Saint Lucia','Saint Vincent and the Grenadines'=>'Saint Vincent and the Grenadines','Samoa'=>'Samoa','San Marino'=>'San Marino','Sao Tome and Principe'=>'Sao Tome and Principe','Saudi Arabia'=>'Saudi Arabia','Senegal'=>'Senegal','Serbia'=>'Serbia','Seychelles'=>'Seychelles','Sierra Leone'=>'Sierra Leone','Singapore'=>'Singapore','Slovakia'=>'Slovakia','Slovenia'=>'Slovenia','Solomon Islands'=>'Solomon Islands','Somalia'=>'Somalia','South Africa'=>'South Africa','South Korea'=>'South Korea','South Sudan'=>'South Sudan','Spain'=>'Spain','Sri Lanka'=>'Sri Lanka','Sudan'=>'Sudan','Suriname'=>'Suriname','Sweden'=>'Sweden','Switzerland'=>'Switzerland','Syria'=>'Syria','Tajikistan'=>'Tajikistan','Tanzania'=>'Tanzania','Thailand'=>'Thailand','Timor-Leste'=>'Timor-Leste','Togo'=>'Togo','Tonga'=>'Tonga','Trinidad and Tobago'=>'Trinidad and Tobago','Tunisia'=>'Tunisia','Turkey'=>'Turkey','Turkmenistan'=>'Turkmenistan','Tuvalu'=>'Tuvalu','Uganda'=>'Uganda','Ukraine'=>'Ukraine','United Arab Emirates'=>'United Arab Emirates','United Kingdom'=>'United Kingdom','United States of America'=>'United States of America','Uruguay'=>'Uruguay','Uzbekistan'=>'Uzbekistan','Vanuatu'=>'Vanuatu','Venezuela'=>'Venezuela','Vietnam'=>'Vietnam','Yemen'=>'Yemen','Zambia'=>'Zambia','Zimbabwe'=>'Zimbabwe'
                                    ]),
                                Components\TextInput::make('region')
                                    ->label('Region')
                                    ->required(),
                                Components\TextInput::make('city')
                                    ->label('City')
                                    ->required(),
                                Components\TextInput::make('postal_code')
                                    ->label('Postal Code')
                                    ->required(),
                                Components\TextInput::make('address_line_1')
                                    ->label('Address Line 1')
                                    ->required()
                                    ->columnSpanFull(),
                                Components\TextInput::make('address_line_2')
                                    ->label('Address Line 2 (Optional)')
                                    ->columnSpanFull(),
                            ]),
                        ])
                        ->afterValidation(function ($state) {
                            $user = auth()->user();
                            $user->update([
                                'country' => $state['country'],
                                'region' => $state['region'],
                                'city' => $state['city'],
                                'postal_code' => $state['postal_code'],
                                'address_line_1' => $state['address_line_1'],
                                'address_line_2' => $state['address_line_2'],
                                'first_name' => $state['first_name'],
                                'last_name' => $state['last_name'],
                                'avatar_url' => $state['avatar_url'] ?? null,
                                'banner_url' => $state['banner_url'] ?? null,
                                'phone_number' => $state['phone_number'],
                                'force_profile_update' => false,
                            ]);
                        }),

                    Components\Wizard\Step::make('Complete')
                        ->description('You are ready to go!')
                        ->schema([
                            Components\Placeholder::make('all_done')
                                ->label('')
                                ->content(new HtmlString('<div class="text-center py-8"><h2 class="text-2xl font-bold mb-2">All done!</h2><p class="text-gray-500">You will now be able to login to your account.</p></div>'))
                        ]),
                ])
                ->submitAction(new HtmlString(\Illuminate\Support\Facades\Blade::render('<x-filament::button type="submit" size="lg" color="primary">Finish & Login</x-filament::button>')))
            ])
            ->statePath('data');
    }
    
    public function submit(): void
    {
        auth()->logout();
        request()->session()->invalidate();
        request()->session()->regenerateToken();
        $this->redirect('/admin/login');
    }
}
