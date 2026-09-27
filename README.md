<p align="center">
  <img src="public/defaults/logo-dark.svg" width="220" alt="ARX-ERP Logo" />
</p>

<h1 align="center">ARX-ERP Enterprise</h1>

<p align="center">
  <strong>Next-Generation Modular, AI-Native Enterprise Resource Planning Framework</strong>
</p>

<p align="center">
  <a href="https://github.com/itzsd0811"><img src="https://img.shields.io/badge/Author-itzsd-F43F5E?style=for-the-badge&logo=github&logoColor=white" alt="Author" /></a>
  <a href="version.json"><img src="https://img.shields.io/badge/Version-1.0.0-8B5CF6?style=for-the-badge" alt="Version" /></a>
  <a href="https://php.net"><img src="https://img.shields.io/badge/PHP-8.4-777BB4?style=for-the-badge&logo=php&logoColor=white" alt="PHP 8.4" /></a>
  <a href="https://laravel.com"><img src="https://img.shields.io/badge/Laravel-12.x-FF2D20?style=for-the-badge&logo=laravel&logoColor=white" alt="Laravel 12" /></a>
  <a href="https://react.dev"><img src="https://img.shields.io/badge/React-19-61DAFB?style=for-the-badge&logo=react&logoColor=black" alt="React 19" /></a>
  <a href="https://www.typescriptlang.org"><img src="https://img.shields.io/badge/TypeScript-5.x-3178C6?style=for-the-badge&logo=typescript&logoColor=white" alt="TypeScript" /></a>
  <a href="https://tailwindcss.com"><img src="https://img.shields.io/badge/TailwindCSS-v4-06B6D4?style=for-the-badge&logo=tailwindcss&logoColor=white" alt="Tailwind CSS" /></a>
  <a href="LICENSE"><img src="https://img.shields.io/badge/License-MIT-10B981?style=for-the-badge" alt="License MIT" /></a>
</p>

---

## 🌟 Overview

**ARX-ERP Enterprise** is a modern, modular, and AI-native ERP platform built for high scalability, rapid module development, and seamless autonomous AI agent workflows. It combines a rock-solid **Laravel 12 + PHP 8.4** backend with a high-performance **React 19 + TypeScript + Tailwind CSS** frontend architecture.

Featuring an extensible **Plugin Module Engine**, **Dual Theme Switching**, **Model Context Protocol (MCP)** server/client integration, and **Automated Disaster Recovery**, ARX-ERP is designed for businesses of any scale.

---

## 🚀 Key Features

### 🧩 1. Pluggable Module Architecture
- **Autonomous Plugin Modules**: Create, install, enable, disable, and export business modules without altering core application files.
- **Dynamic Routing & Navigation Tree**: Modules automatically register backend API endpoints and frontend navigation menu items with permission gates.
- **Scaffolding Generator**: Generate starter modules with full controller, model, migration, seeder, and UI boilerplate in seconds.
- **Isolated Storage & Migrations**: Modules maintain their own database schemas and dedicated asset storage.

### 🎨 2. Dual-Engine Theme System & Live Customizer
- **Independent Contexts**: Separate, independently customizable theme engines for the **Admin Portal** and the **Business Dashboard**.
- **Live Branding Customizer**: Configure application name, dynamic dark/light logos, favicons, site titles, and liquid glass login backgrounds.
- **Navigation Quick Links**: Configure header top bar and login page quick shortcuts with custom vector icons and `target="_blank"` tab handling.
- **Default Asset Fallbacks**: Built-in default assets ensure 1-click reset to pristine defaults.

### 🤖 3. Model Context Protocol (MCP) & AI Agent Integration
- **First-Class AI Agents**: Dedicated `ai_agent` user types with token authentication, granular tool execution permissions, and rate limiting.
- **MCP Server Suite**: Built-in endpoints exposing system tools (`/api/v1/mcp/tools`), dynamic resources (`/api/v1/mcp/resources`), and operational prompts (`/api/v1/mcp/prompts`).
- **Autonomous Tool Execution**: Audited and sandbox-ready tool execution engine for AI assistants and autonomous workflows.

### 🔒 4. Enterprise Security & Access Control (RBAC)
- **Granular RBAC**: Deeply integrated Spatie-backed permission matrix with super-admin hierarchies and domain-scoped permission gates.
- **Two-Factor Authentication (2FA)**: Time-based OTP (TOTP) setup with QR code generator, emergency recovery codes, and verification enforcement.
- **Audit Logging & Retention**: Comprehensive, tamper-evident audit trails with configurable automated daily retention pruning.
- **Active Session Management**: Track login history, IP addresses, user agents, suspicious login alerts, and one-click remote session revocation.

### 💾 5. Disaster Recovery & Automated Backups
- **Scheduled Auto-Backups**: Configurable daily backup time (`HH:MM`) driven by an active background task scheduler.
- **Instant Snapshots**: One-click full-system backup generation (`.zip`) combining database state and public assets.
- **System Health Diagnostics**: Real-time server resource monitoring, disk space metrics, and database latency telemetry.

---

## 🏗️ Architectural Overview

```
ARX-ERP/
├── app/
│   ├── Core/
│   │   ├── Console/Commands/        # CLI utilities (AutoBackup, PurgeAuditLogs, etc.)
│   │   ├── Http/Controllers/Api/V1/ # REST API V1 Controllers
│   │   ├── Models/                  # Core Eloquent Models (User, Setting, AuditLog, Module, etc.)
│   │   ├── Providers/               # Core, Theme, and Module Service Providers
│   │   └── Services/                # BackupManager, SettingsManager, ModuleManager, etc.
├── modules/                         # Pluggable modular extensions
├── themes/
│   ├── admin/default/               # React 19 + TypeScript + Vite Admin Portal Theme
│   └── dashboard/default/           # React 19 + TypeScript + Vite Business Dashboard Theme
├── routes/
│   ├── api.php                      # Sanctum & MCP API Routes
│   └── console.php                  # Scheduled Cron Tasks
└── public/
    └── defaults/                    # Permanent default branding assets
```

---

## 🛠️ Quick Start & Installation

### Prerequisites
- **PHP 8.4+** with `pdo_sqlite`, `pdo_mysql`, `mbstring`, `xml`, `ctype`, `zip`, `gd` extensions
- **Composer 2.x**
- **Node.js 20+** & **npm**

### Step-by-Step Setup

```bash
# 1. Clone the repository
git clone https://github.com/itzsd0811/ERP-V2.git
cd ERP-V2

# 2. Install PHP Dependencies
composer install

# 3. Configure Environment
cp .env.example .env
php artisan key:generate

# 4. Run Migrations and Seed Database
php artisan migrate --seed

# 5. Link Public Storage
php artisan storage:link

# 6. Install & Build Themes
# Admin Theme:
cd themes/admin/default && npm install && npm run build && cd ../../..

# Dashboard Theme:
cd themes/dashboard/default && npm install && npm run build && cd ../../..

# 7. Start Development Server
php artisan serve
```

---

## 🧪 Testing & Code Quality

ARX-ERP maintains 100% test coverage across core services, RBAC, settings, backups, and module life cycles:

```bash
# Run PHPUnit test suite
php artisan test --compact

# Format code with Laravel Pint
vendor/bin/pint --format agent
```

---

## 🚢 Continuous Deployment & Releases

This repository includes automated GitHub Actions workflows in [`.github/workflows/release.yml`](.github/workflows/release.yml):
- **Version Tracking**: Reads version specification from [`version.json`](version.json).
- **Automated Packaging**: Compiles frontend assets, optimizes composer packages, strips dev files, and creates a clean production `.zip` distribution.
- **GitHub Releases**: Automatically publishes or updates releases with [`release-note.md`](release-note.md) upon every push.

---

## 📚 REST API Documentation

Comprehensive endpoint specifications, authentication guides, parameter definitions, and response schemas are available in the [**API Documentation Guide**](docs/API.md).

---

## 📄 License

This project is open-sourced software licensed under the [MIT License](LICENSE).

---

## 👨‍💻 Author & Credits

Developed with ❤️ by **itzsd**
- GitHub: [@itzsd0811](https://github.com/itzsd0811)
- Repository: [github.com/itzsd0811/ERP-V2](https://github.com/itzsd0811/ERP-V2)
