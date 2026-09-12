<?php

namespace App\Mail;

use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Queue\SerializesModels;

class UpdateAvailableMail extends Mailable
{
    use Queueable, SerializesModels;

    public $version;
    public $notes;

    public function __construct($version, $notes)
    {
        $this->version = $version;
        $this->notes = $notes;
    }

    public function build()
    {
        return $this->subject("System Update Available: " . $this->version)
                    ->markdown("emails.update-available");
    }
}
