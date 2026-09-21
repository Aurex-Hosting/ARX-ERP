<?php

namespace App\Filament\Pages;

use Filament\Forms\Concerns\InteractsWithForms;
use Filament\Forms\Contracts\HasForms;
use Filament\Forms\Form;
use Filament\Pages\Page;
use Filament\Forms\Components;
use Illuminate\Support\Facades\Hash;
use Filament\Notifications\Notification;
use Filament\Actions\Action;

class ManageProfile extends Page implements HasForms
{
    use InteractsWithForms;

    protected static ?string $navigationIcon = 'heroicon-o-user';
    protected static string $view = 'filament.pages.manage-profile';
    protected static bool $shouldRegisterNavigation = false;
    protected static ?string $title = 'My Profile';

    public ?array $profileData = [];
    public ?array $passwordData = [];

    public function mount(): void
    {
        $this->profileForm->fill(auth()->user()->toArray());
    }

    protected function getForms(): array
    {
        return [
            'profileForm',
            'passwordForm',
        ];
    }

    public function profileForm(Form $form): Form
    {
        return $form
            ->schema([
                Components\Section::make('Personal Information')
                    ->description('Update your account\'s profile information and address.')
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
            ])
            ->statePath('profileData');
    }

    public function passwordForm(Form $form): Form
    {
        return $form
            ->schema([
                Components\Section::make('Update Password')
                    ->description('Ensure your account is using a long, random password to stay secure.')
                    ->schema([
                        Components\TextInput::make('current_password')
                            ->label('Current Password')
                            ->password()
                            ->required()
                            ->currentPassword(),
                        Components\TextInput::make('new_password')
                            ->label('New Password')
                            ->password()
                            ->required()
                            ->confirmed(),
                        Components\TextInput::make('new_password_confirmation')
                            ->label('Confirm New Password')
                            ->password()
                            ->required(),
                        Components\TextInput::make('two_factor_code')
                            ->label('2FA Authenticator Code')
                            ->placeholder('123456')
                            ->required(fn () => auth()->user()->two_factor_confirmed_at !== null)
                            ->visible(fn () => auth()->user()->two_factor_confirmed_at !== null)
                            ->rule(function () {
                                return function (string $attribute, $value, \Closure $fail) {
                                    if (auth()->user()->two_factor_confirmed_at) {
                                        $google2fa = new \PragmaRX\Google2FA\Google2FA();
                                        if (!$google2fa->verifyKey(decrypt(auth()->user()->two_factor_secret), $value)) {
                                            $fail('The 2FA code provided is invalid.');
                                        }
                                    }
                                };
                            }),
                    ])
            ])
            ->statePath('passwordData');
    }

    public function updateProfile(): void
    {
        $data = $this->profileForm->getState();
        auth()->user()->update($data);

        Notification::make()
            ->success()
            ->title('Profile updated')
            ->send();
            
        Notification::make()
            ->title('Profile Information Updated')
            ->body('Your personal information was successfully updated.')
            ->success()
            ->actions([
                \Filament\Notifications\Actions\Action::make('view')
                    ->label('Read More')
                    ->url('/admin/manage-profile?tab=notifications')
                    ->button()
                    ->markAsRead(),
            ])
            ->sendToDatabase(auth()->user());
    }

    
    public function updateProfileAndReload(): void
    {
        $this->updateProfile();
        $this->js("setTimeout(() => window.location.reload(), 500)");
    }

    public function updatePassword(): void
    {
        $data = $this->passwordForm->getState();
        
        auth()->user()->update([
            'password' => Hash::make($data['new_password']),
        ]);

        $this->passwordForm->fill();

        Notification::make()
            ->success()
            ->title('Password updated')
            ->send();
            
        Notification::make()
            ->title('Password Changed')
            ->body('Your account password was recently changed. If this was not you, please contact support immediately.')
            ->warning()
            ->actions([
                \Filament\Notifications\Actions\Action::make('view')
                    ->label('Read More')
                    ->url('/admin/manage-profile?tab=notifications')
                    ->button()
                    ->markAsRead(),
            ])
            ->sendToDatabase(auth()->user());
    }

    public function revokeAllSessions(): void
    {
        \DB::table('sessions')->where('user_id', auth()->id())->delete();
        request()->session()->invalidate();
        request()->session()->regenerateToken();
        redirect('/admin/login');
    }

    public function revokeSession(string $sessionId): void
    {
        \DB::table('sessions')
            ->where('user_id', auth()->id())
            ->where('id', $sessionId)
            ->delete();

        Notification::make()
            ->success()
            ->title('Session revoked successfully.')
            ->send();
            
        Notification::make()
            ->title('Session Revoked')
            ->body('An active session was manually revoked from your account.')
            ->info()
            ->actions([
                \Filament\Notifications\Actions\Action::make('view')
                    ->label('Read More')
                    ->url('/admin/manage-profile?tab=notifications')
                    ->button()
                    ->markAsRead(),
            ])
            ->sendToDatabase(auth()->user());
    }

    public function clearOldLoginHistory(): void
    {
        $deleted = \App\Models\LoginHistory::where('user_id', auth()->id())
            ->where('created_at', '<', now()->subDays(30))
            ->delete();

        Notification::make()
            ->success()
            ->title("Cleared $deleted old login records.")
            ->send();
            
        Notification::make()
            ->title('Login History Cleared')
            ->body("$deleted old login history records were permanently deleted.")
            ->info()
            ->actions([
                \Filament\Notifications\Actions\Action::make('view')
                    ->label('Read More')
                    ->url('/admin/manage-profile?tab=notifications')
                    ->button()
                    ->markAsRead(),
            ])
            ->sendToDatabase(auth()->user());
    }

    
    public function getUpdateProfileFormActions(): array
    {
        return [
            \Filament\Actions\Action::make('saveProfile')
                ->label('Save Personal Information')
                ->submit('updateProfile')
                ->keyBindings(['mod+s']),
        ];
    }

    public function getUpdatePasswordFormActions(): array
    {
        return [
            \Filament\Actions\Action::make('updatePassword')
                ->label('Update Password')
                ->submit('updatePassword'),
        ];
    }

    public function deleteAccountAction(): Action

    {
        return Action::make('deleteAccount')
                ->label('Delete Account')
                ->color('danger')
                ->requiresConfirmation()
                ->modalHeading('Delete Account')
                ->modalDescription('Are you sure you want to delete your account? This action will move your account to the recycle bin.')
                ->modalSubmitActionLabel('Yes, delete my account')
                ->action(function () {
                    $user = auth()->user();
                    auth()->logout();
                    $user->delete(); // Soft delete
                    request()->session()->invalidate();
                    request()->session()->regenerateToken();
                    return redirect('/admin/login');
                });
    }
}

