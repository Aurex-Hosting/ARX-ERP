# ERP System

A robust Enterprise Resource Planning (ERP) system built with the TALL stack (Tailwind CSS, Alpine.js, Laravel, Livewire) and Filament Admin.

## 🚀 Tech Stack

- **Framework:** [Laravel 12](https://laravel.com/)
- **Admin Panel & UI:** [Filament v3](https://filamentphp.com/)
- **Roles & Permissions:** [Spatie Permissions](https://spatie.be/docs/laravel-permission) (via `bezhansalleh/filament-shield`)
- **Settings Management:** [Spatie Settings](https://spatie.be/docs/laravel-settings) (via `Filament Settings Plugin`)

## 🛠️ Features

- **User Management:** Full CRUD operations for users out of the box using Filament resources.
- **Roles & Permissions:** Fine-grained access control across the entire ERP using Filament Shield.
- **Customizable Settings:** Easily manage global application settings right from the Filament admin panel.
- **Scalable Architecture:** Ready for adding custom ERP modules (Inventory, HR, CRM, etc.).

## ⚙️ Requirements

- PHP 8.2 or higher
- Composer
- Node.js & NPM
- MySQL / PostgreSQL / SQLite

## 📦 Installation

1. **Clone the repository:**
   ```bash
   git clone <your-repo-url>
   cd erp-system
   ```

2. **Install PHP dependencies:**
   ```bash
   composer install
   ```

3. **Install NPM dependencies:**
   ```bash
   npm install
   npm run build
   ```

4. **Environment Setup:**
   ```bash
   cp .env.example .env
   php artisan key:generate
   ```

5. **Configure Database:**
   Update your `.env` file with your database credentials.

6. **Run Migrations & Seeders:**
   ```bash
   php artisan migrate
   ```

7. **Create an Admin User:**
   You can easily create an admin user using the Filament command:
   ```bash
   php artisan make:filament-user
   ```

8. **Serve the Application:**
   ```bash
   php artisan serve
   ```
   Access the admin panel at `http://localhost:8000/admin`.

## 🛡️ Roles & Permissions (Filament Shield)

This project uses `filament-shield` for handling permissions. To generate permissions for all existing resources and pages, run:
```bash
php artisan shield:generate --all
```
You can then assign the `super_admin` role to your user via the Filament Admin interface.

## ⚙️ Settings (Spatie Laravel Settings)

Global settings are managed via Spatie Settings. You can define new settings properties in `app/Settings/` and create their corresponding UI in `app/Filament/Pages/Customization.php`.

## 🤝 Contributing

Contributions are welcome! Feel free to open issues or submit pull requests.

## 📄 License

This project is open-sourced software licensed under the [MIT license](https://opensource.org/licenses/MIT).
