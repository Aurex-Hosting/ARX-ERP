<?php

namespace App\Filament\Pages;

use Filament\Forms;
use Filament\Forms\Form;
use Filament\Pages\SettingsPage;
use App\Settings\MailSettings as MailSettingsClass;
use Filament\Forms\Components\Tabs;
use Filament\Forms\Components\TextInput;
use Filament\Forms\Components\Select;
use Filament\Forms\Components\Section;
use Filament\Actions\Action;
use Illuminate\Support\Facades\Mail;
use Filament\Notifications\Notification;
use Exception;

class MailSettings extends BaseSettingsPage
{
    protected static ?string $navigationIcon = 'heroicon-o-envelope';
    protected static ?string $navigationGroup = 'System Settings';

    public static function canAccess(): bool
    {
        return auth()->check() && auth()->user()->hasAnyPermission([
            'view_smtp_settings_mail::settings', 'update_smtp_settings_mail::settings',
            'execute_test_email_mail::settings',
            'view_template_email_verification_mail::settings', 'update_template_email_verification_mail::settings',
            'view_template_2fa_mail::settings', 'update_template_2fa_mail::settings',
            'view_template_password_reset_mail::settings', 'update_template_password_reset_mail::settings',
            'view_template_login_detection_mail::settings', 'update_template_login_detection_mail::settings',
            'view_broadcast_mail::settings', 'execute_broadcast_mail::settings',
            'view_global_placeholders_mail::settings', 'update_global_placeholders_mail::settings',
            'create_global_placeholders_mail::settings', 'delete_global_placeholders_mail::settings',
        ]);
    }

    protected static string $settings = MailSettingsClass::class;
    protected array $ignoreChanges = [
        'mail_active_template',
        'broadcast_subject',
        'broadcast_body',
        'broadcast_send_to_all',
        'broadcast_roles',
        'broadcast_include_users',
        'broadcast_exclude_users',
    ];

    public function form(Form $form): Form
    {
        return $form
            ->schema([
                Tabs::make('Mail Settings')
                    ->tabs([
                        Tabs\Tab::make('Mail Server Setup')
                            ->visible(fn() => auth()->user()->can('view_smtp_settings_mail::settings') || auth()->user()->can('update_smtp_settings_mail::settings'))
                            ->icon('heroicon-o-server')
                            ->schema([
                                Section::make('SMTP Configuration')
                                    ->description('Configure your outgoing mail server settings.')
                                    ->disabled(fn() => !auth()->user()->can('update_smtp_settings_mail::settings'))
                                    ->headerActions([
                                        \Filament\Forms\Components\Actions\Action::make('test_email')->visible(fn() => auth()->user()->can('execute_test_email_mail::settings'))
                                            ->label('Test Email')
                                            ->icon('heroicon-o-paper-airplane')
                                            ->color('info')
                                            ->form([
                                                TextInput::make('test_email_address')
                                                    ->label('Recipient Email Address')
                                                    ->email()
                                                    ->required(),
                                            ])
                                            ->action(function (array $data, \Filament\Forms\Get $get) {
                                                try {
                                                    // Dynamically use current form state if unsaved, fallback to settings
                                                    $settings = app(MailSettingsClass::class);
                                                    config([
                                                        'mail.default' => $get('mail_mailer') ?? $settings->mail_mailer,
                                                        'mail.mailers.smtp.host' => $get('mail_host') ?? $settings->mail_host,
                                                        'mail.mailers.smtp.port' => $get('mail_port') ?? $settings->mail_port,
                                                        'mail.mailers.smtp.username' => $get('mail_username') ?? $settings->mail_username,
                                                        'mail.mailers.smtp.password' => $get('mail_password') ?? $settings->mail_password,
                                                        'mail.mailers.smtp.encryption' => $get('mail_encryption') ?? ($settings->mail_encryption ?: null),
                                                        'mail.mailers.smtp.verify_peer' => $get('mail_verify_peer') ?? $settings->mail_verify_peer,
                                                        'mail.from.address' => $get('mail_from_address') ?? $settings->mail_from_address,
                                                        'mail.from.name' => $get('mail_from_name') ?? $settings->mail_from_name,
                                                    ]);

                                                    Mail::raw('This is a test email from Aurex ERP.', function ($message) use ($data) {
                                                        $message->to($data['test_email_address'])
                                                            ->subject('Test Email - Aurex ERP');
                                                    });

                                                    Notification::make()
                                                        ->title('Test email sent successfully!')
                                                        ->success()
                                                        ->send();
                                                } catch (Exception $e) {
                                                    Notification::make()
                                                        ->title('Failed to send test email')
                                                        ->body($e->getMessage())
                                                        ->danger()
                                                        ->send();
                                                }
                                            })
                                    ])
                                    ->schema([
                                        Select::make('mail_mailer')
                                            ->label('Mailer')
                                            ->options([
                                                'smtp' => 'SMTP',
                                                'sendmail' => 'Sendmail',
                                                'log' => 'Log',
                                            ])
                                            ->required()
                                            ->live(),
                                        TextInput::make('mail_host')
                                            ->label('Host')
                                            ->required()
                                            ->live(debounce: 500),
                                        TextInput::make('mail_port')
                                            ->label('Port')
                                            ->numeric()
                                            ->required()
                                            ->live(debounce: 500),
                                        TextInput::make('mail_username')
                                            ->label('Username')
                                            ->live(debounce: 500),
                                        TextInput::make('mail_password')
                                            ->label('Password')
                                            ->password()
                                            ->revealable()
                                            ->live(debounce: 500),
                                        Select::make('mail_encryption')
                                            ->label('Encryption')
                                            ->options([
                                                'tls' => 'TLS',
                                                'ssl' => 'SSL',
                                                '' => 'None',
                                            ])
                                            ->live(),
                                        \Filament\Forms\Components\Toggle::make('mail_verify_peer')
                                            ->label('Verify SSL Certificate')
                                            ->helperText('Disable this if you are using a self-signed certificate on your mail server.')
                                            ->default(true)
                                            ->live(),
                                        TextInput::make('mail_from_address')
                                            ->label('From Address')
                                            ->email()
                                            ->required()
                                            ->live(debounce: 500),
                                        TextInput::make('mail_from_name')
                                            ->label('From Name')
                                            ->required()
                                            ->live(debounce: 500),
                                    ])->columns(2),
                            ]),
                        Tabs\Tab::make('Mail Templates')
                            ->visible(fn() => auth()->user()->hasAnyPermission([
                                'view_template_email_verification_mail::settings', 'update_template_email_verification_mail::settings',
                                'view_template_2fa_mail::settings', 'update_template_2fa_mail::settings',
                                'view_template_password_reset_mail::settings', 'update_template_password_reset_mail::settings',
                                'view_template_login_detection_mail::settings', 'update_template_login_detection_mail::settings',
                            ]))
                            ->icon('heroicon-o-document-text')
                            ->schema([
                                Select::make('mail_active_template')
                                    ->label('Select Template to Edit')
                                    ->options([
                                        'email_verification' => 'Email Verification (Signup)',
                                        '2fa' => '2FA Verification Code',
                                        'password_reset' => 'Password Reset',
                                        'login_detection' => 'Login Detection',
                                    ])
                                    ->live()
                                    ->required(),

                                $this->getTemplateEditor('email_verification', 'mail_template_email_verification', 'Email Verification Template', 'Available variables: {{verify_url}}, {{name}}'),
                                $this->getTemplateEditor('2fa', 'mail_template_2fa', '2FA Verification Template', 'Available variables: {{code}}, {{name}}'),
                                $this->getTemplateEditor('password_reset', 'mail_template_password_reset', 'Password Reset Template', 'Available variables: {{link}}, {{name}}'),
                                $this->getTemplateEditor('login_detection', 'mail_template_login_detection', 'Login Detection Template', 'Available variables: {{ip}}, {{device}}, {{time}}, {{name}}'),
                            ]),
                        Tabs\Tab::make('Global Placeholders')
                            ->visible(fn() => auth()->user()->can('view_global_placeholders_mail::settings') || auth()->user()->can('update_global_placeholders_mail::settings'))
                            ->icon('heroicon-o-variable')
                            ->schema([
                                Section::make('Custom Mail Variables')
                                    ->description('Define global variables that can be used across all your email templates. For example, if you add a key "company_name", you can use {{company_name}} in any template.')
                                    ->schema([
                                        \Filament\Forms\Components\KeyValue::make('mail_placeholders')
                                            ->label('Placeholders')
                                            ->keyLabel('Variable Name (e.g. support_email)')
                                            ->valueLabel('Value')
                                            ->addActionLabel('Add Placeholder')
                                            ->disabled(fn() => !auth()->user()->can('update_global_placeholders_mail::settings'))
                                            ->addable(fn() => auth()->user()->can('create_global_placeholders_mail::settings'))
                                            ->deletable(fn() => auth()->user()->can('delete_global_placeholders_mail::settings'))
                                            ->live(debounce: 500)
                                    ])
                            ]),
                        Tabs\Tab::make('Broadcast Mail')->visible(fn() => auth()->user()->can('view_broadcast_mail::settings') || auth()->user()->can('execute_broadcast_mail::settings'))->disabled(fn() => !auth()->user()->can('execute_broadcast_mail::settings'))
                            ->icon('heroicon-o-megaphone')
                            ->schema([
                                TextInput::make('broadcast_subject')
                                    ->label('Subject')
                                    ->required()
                                    ->live(debounce: 500),
                                \Filament\Forms\Components\RichEditor::make('broadcast_body')
                                    ->label('Email Body')
                                    ->hint('Available variables: {{username}}, {{email}} + Global Placeholders')
                                    ->live(debounce: 500)
                                    ->hintActions([
                                        \Filament\Forms\Components\Actions\Action::make('preview_broadcast')
                                            ->label('Preview Mail')
                                            ->icon('heroicon-o-eye')
                                            ->color('gray')
                                            ->modalHeading('Broadcast Preview')
                                            ->modalSubmitAction(false)
                                            ->modalCancelActionLabel('Close')
                                            ->modalContent(function (\Filament\Forms\Get $get) {
                                                $body = $get('broadcast_body') ?? '';
                                                $settings = app(MailSettingsClass::class);
                                                
                                                $body = str_replace(['{{username}}', '{{email}}'], ['John Doe', 'john@example.com'], $body);
                                                if (is_array($settings->mail_placeholders)) {
                                                    foreach ($settings->mail_placeholders as $k => $v) {
                                                        $body = str_replace('{{'.$k.'}}', $v, $body);
                                                    }
                                                }

                                                return new \Illuminate\Support\HtmlString('<div style="all: initial; font-family: sans-serif; display: block; background: #fff; padding: 2rem; border-radius: 0.5rem; border: 1px solid #e5e7eb; width: 100%; box-sizing: border-box;">' . $body . '</div>');
                                            }),
                                        \Filament\Forms\Components\Actions\Action::make('test_broadcast')
                                            ->visible(fn() => auth()->user()->can('execute_test_email_mail::settings'))
                                            ->label('Test Send')
                                            ->icon('heroicon-o-beaker')
                                            ->form([
                                                TextInput::make('test_email')
                                                    ->label('Recipient Email')
                                                    ->email()
                                                    ->required()
                                            ])
                                            ->action(function (array $data, \Filament\Forms\Get $get) {
                                                try {
                                                    $settings = app(MailSettingsClass::class);
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

                                                    $body = $get('broadcast_body');
                                                    $body = str_replace(['{{username}}', '{{email}}'], ['Admin Test', $data['test_email']], $body);
                                                    if (is_array($settings->mail_placeholders)) {
                                                        foreach ($settings->mail_placeholders as $k => $v) {
                                                            $body = str_replace('{{'.$k.'}}', $v, $body);
                                                        }
                                                    }

                                                    Mail::html($body, function($msg) use ($get, $data) {
                                                        $msg->to($data['test_email'])->subject($get('broadcast_subject') ?: 'Test Broadcast');
                                                    });

                                                    Notification::make()->title('Test Broadcast Sent!')->success()->send();
                                                } catch (Exception $e) {
                                                    Notification::make()->title('Failed to send')->body($e->getMessage())->danger()->send();
                                                }
                                            })
                                    ]),
                                Section::make('Audience Selection')
                                    ->schema([
                                        \Filament\Forms\Components\Toggle::make('broadcast_send_to_all')
                                            ->label('Send to ALL System Users')
                                            ->live(),
                                        Select::make('broadcast_roles')
                                            ->label('Target Roles (Future Config)')
                                            ->multiple()
                                            ->options([
                                                'admin' => 'Administrators (Mock)',
                                                'manager' => 'Managers (Mock)',
                                                'user' => 'Users (Mock)'
                                            ])
                                            ->visible(fn (\Filament\Forms\Get $get) => !$get('broadcast_send_to_all'))
                                            ->live(),
                                        Select::make('broadcast_include_users')
                                            ->label(fn (\Filament\Forms\Get $get) => $get('broadcast_send_to_all') ? 'Additional Users' : 'Target Specific Users')
                                            ->multiple()
                                            ->searchable()
                                            ->getSearchResultsUsing(fn (string $search) => \App\Models\User::where('name', 'like', "%{$search}%")->orWhere('email', 'like', "%{$search}%")->limit(50)->pluck('name', 'id'))
                                            ->getOptionLabelUsing(fn ($value) => \App\Models\User::find($value)?->name)
                                            ->visible(fn (\Filament\Forms\Get $get) => !$get('broadcast_send_to_all'))
                                            ->live(),
                                        Select::make('broadcast_exclude_users')
                                            ->label('Exclude Specific Users')
                                            ->multiple()
                                            ->searchable()
                                            ->getSearchResultsUsing(fn (string $search) => \App\Models\User::where('name', 'like', "%{$search}%")->orWhere('email', 'like', "%{$search}%")->limit(50)->pluck('name', 'id'))
                                            ->getOptionLabelUsing(fn ($value) => \App\Models\User::find($value)?->name)
                                            ->live(),
                                    ])->columns(2),
                                \Filament\Forms\Components\Actions::make([
                                    \Filament\Forms\Components\Actions\Action::make('send_broadcast_now')
                                        ->label('Send Broadcast Now')
                                        ->icon('heroicon-o-paper-airplane')
                                        ->requiresConfirmation()
                                        ->modalHeading('Send Broadcast')
                                        ->modalDescription(fn (\Filament\Forms\Get $get) => $get('broadcast_send_to_all') ? 'Are you sure you want to send this email to ALL users in the system?' : 'Are you sure you want to send this email to the selected users/roles?')
                                        ->color('primary')
                                        ->action(function (\Filament\Forms\Get $get, \Livewire\Component $livewire) {
                                            try {
                                                $settings = app(MailSettingsClass::class);
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

                                                $query = \App\Models\User::query();
                                                
                                                if (!$get('broadcast_send_to_all')) {
                                                    $includeIds = $get('broadcast_include_users') ?? [];
                                                    // In the future, merge with Role queries here
                                                    if (empty($includeIds)) {
                                                        Notification::make()->title('No users targeted.')->warning()->send();
                                                        return;
                                                    }
                                                    $query->whereIn('id', $includeIds);
                                                }

                                                $excludeIds = $get('broadcast_exclude_users') ?? [];
                                                if (!empty($excludeIds)) {
                                                    $query->whereNotIn('id', $excludeIds);
                                                }

                                                $users = $query->get();
                                                if ($users->isEmpty()) {
                                                    Notification::make()->title('No users matched your selection.')->warning()->send();
                                                    return;
                                                }

                                                $sentCount = 0;
                                                foreach ($users as $user) {
                                                    $body = $get('broadcast_body');
                                                    $body = str_replace(['{{username}}', '{{email}}'], [$user->name, $user->email], $body);
                                                    if (is_array($settings->mail_placeholders)) {
                                                        foreach ($settings->mail_placeholders as $k => $v) {
                                                            $body = str_replace('{{'.$k.'}}', $v, $body);
                                                        }
                                                    }

                                                    Mail::html($body, function($msg) use ($user, $get) {
                                                        $msg->to($user->email)->subject($get('broadcast_subject') ?: 'Broadcast Update');
                                                    });
                                                    $sentCount++;
                                                }

                                                Notification::make()->title("Successfully broadcasted to {$sentCount} user(s)!")->success()->send();
                                                $livewire->js('setTimeout(() => window.location.reload(), 1500)');
                                            } catch (Exception $e) {
                                                Notification::make()->title('Failed to broadcast')->body($e->getMessage())->danger()->send();
                                            }
                                        })
                                ])
                            ]),
                    ])->columnSpanFull(),
            ]);
    }



    private function getTemplateEditor(string $type, string $field, string $label, string $hint): \Filament\Forms\Components\RichEditor
    {
        return \Filament\Forms\Components\RichEditor::make($field)
            ->visible(function () use ($field) {
                if ($field === 'mail_template_email_verification') return auth()->user()->can('view_template_email_verification_mail::settings') || auth()->user()->can('update_template_email_verification_mail::settings');
                if ($field === 'mail_template_2fa') return auth()->user()->can('view_template_2fa_mail::settings') || auth()->user()->can('update_template_2fa_mail::settings');
                if ($field === 'mail_template_password_reset') return auth()->user()->can('view_template_password_reset_mail::settings') || auth()->user()->can('update_template_password_reset_mail::settings');
                if ($field === 'mail_template_login_detection') return auth()->user()->can('view_template_login_detection_mail::settings') || auth()->user()->can('update_template_login_detection_mail::settings');
                return true;
            })
            ->disabled(function () use ($field) {
                if ($field === 'mail_template_email_verification') return !auth()->user()->can('update_template_email_verification_mail::settings');
                if ($field === 'mail_template_2fa') return !auth()->user()->can('update_template_2fa_mail::settings');
                if ($field === 'mail_template_password_reset') return !auth()->user()->can('update_template_password_reset_mail::settings');
                if ($field === 'mail_template_login_detection') return !auth()->user()->can('update_template_login_detection_mail::settings');
                return false;
            })
            ->label($label)
            ->hint($hint)
            // Use Alpine to hide so the field remains in Livewire state
            ->extraAttributes([
                'x-show' => "\$wire.data.mail_active_template === '$type'",
                'x-transition' => true,
            ])
            ->live(debounce: 500)
            ->hintActions([
                \Filament\Forms\Components\Actions\Action::make('preview_template')
                    ->label('Preview Template')
                    ->icon('heroicon-o-eye')
                    ->color('gray')
                    ->modalHeading('Mail Preview')
                    ->modalSubmitAction(false)
                    ->modalCancelActionLabel('Close')
                    ->modalContent(function (\Filament\Forms\Get $get) use ($field) {
                        $htmlContent = $get($field) ?? '';
                        $settings = app(MailSettingsClass::class);
                        
                        $htmlContent = str_replace(
                            ['{{code}}', '{{name}}', '{{link}}', '{{ip}}', '{{device}}', '{{time}}', '{{verify_url}}'],
                            ['123456', 'John Doe', url('/'), '192.168.1.1', 'Chrome on Windows', now()->format('Y-m-d H:i:s'), url('/verify/12345')],
                            $htmlContent
                        );

                        if (is_array($settings->mail_placeholders)) {
                            foreach ($settings->mail_placeholders as $key => $val) {
                                $htmlContent = str_replace('{{' . $key . '}}', $val, $htmlContent);
                            }
                        }

                        return new \Illuminate\Support\HtmlString('<div style="all: initial; font-family: sans-serif; display: block; background: #fff; padding: 2rem; border-radius: 0.5rem; border: 1px solid #e5e7eb; width: 100%; box-sizing: border-box;">' . $htmlContent . '</div>');
                    }),

                \Filament\Forms\Components\Actions\Action::make('test_template')
                    ->visible(fn() => auth()->user()->can('execute_test_email_mail::settings'))
                    ->label('Test Template')
                    ->icon('heroicon-o-paper-airplane')
                    ->form([
                        \Filament\Forms\Components\TextInput::make('test_email')
                            ->label('Recipient Email')
                            ->email()
                            ->required(),
                    ])
                    ->action(function (array $data, \Filament\Forms\Get $get) use ($field, $label) {
                        $htmlContent = $get($field);
                        try {
                            $settings = app(MailSettingsClass::class);
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

                            $htmlContent = str_replace(
                                ['{{code}}', '{{name}}', '{{link}}', '{{ip}}', '{{device}}', '{{time}}', '{{verify_url}}'],
                                ['123456', 'John Doe', url('/'), '192.168.1.1', 'Chrome on Windows', now()->format('Y-m-d H:i:s'), url('/verify/12345')],
                                $htmlContent
                            );

                            // Replace global placeholders
                            if (is_array($settings->mail_placeholders)) {
                                foreach ($settings->mail_placeholders as $key => $val) {
                                    $htmlContent = str_replace('{{' . $key . '}}', $val, $htmlContent);
                                }
                            }

                            Mail::html($htmlContent, function ($message) use ($data, $label) {
                                $message->to($data['test_email'])
                                    ->subject("Test: $label");
                            });

                            Notification::make()->title('Test email sent successfully!')->success()->send();
                        } catch (Exception $e) {
                            Notification::make()->title('Failed to send test email')->body($e->getMessage())->danger()->send();
                        }
                    })
            ]);
    }
}

