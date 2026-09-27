# 🚀 ARX-ERP Enterprise v1.0.0 — Official Production Release

Welcome to the initial stable release of **ARX-ERP Enterprise**, an enterprise-grade, modular, and AI-native ERP foundation built on **Laravel 12**, **PHP 8.4**, **React 19**, **TypeScript**, and **Tailwind CSS**.

---

## ✨ Key Highlights & Features

### 🏢 Modular Architecture & Dynamic Plugin Engine
- **Independent Plugin Modules**: Pluggable architecture allowing modules to register dynamic API endpoints, front-end navigation nodes, migrations, models, seeders, and isolated file storage.
- **Visual Module Lifecycle**: Complete Module Manager with install, enable, disable, starter scaffolding generator, upload, export, and disk cleanup capabilities.
- **Dynamic Navigation Tree**: Real-time hierarchical navigation builder reflecting enabled module menus, permission gates, and badge counts.

### 🎨 Dual Theme System & Live Customizer
- **Decoupled Themes**: Independent themes for **Admin Portal** and **Business Dashboard** with live switching between active themes.
- **Branding & Asset Manager**: Full control over company name, dynamic site titles, dark/light logos, favicon, and liquid glass login backgrounds.
- **Top Bar & Login Quick Links**: Configurable quick shortcuts and navigation links rendered in the top header and login pages with custom SVG/PNG icons and new-tab support.
- **Default Asset Fallbacks**: Built-in default vector logos and high-resolution background assets for 1-click reset to defaults.

### 🤖 AI Agent & MCP (Model Context Protocol) Suite
- **MCP Server & Client Engine**: Standardized Model Context Protocol integration exposing system tools, resources, and custom prompts for autonomous AI agents.
- **AI Agent RBAC & Permissions**: First-class AI agent actors with granular permissions, rate limits, token authentication, and execution isolation.
- **Real-Time Task & Tool Execution**: Audited tool dispatching and automated workflow hooks.

### 🔒 Enterprise Security & Access Control (RBAC)
- **Granular Permissions & Roles**: Spatie-backed permission system with Super-Admin hierarchy and categorized permission matrices.
- **Two-Factor Authentication (2FA)**: Time-based OTP (TOTP) with QR code generator, confirmation validation, emergency recovery codes, and status endpoints.
- **Audit Logging & Retention**: Automated tamper-proof audit trails for all system mutations, user actions, and security events with automated daily retention pruning.
- **Active Session & Login History**: GeoIP metadata, device tracking, suspicious alert detection, and single/all remote session revocation.

### 💾 Automated Disaster Recovery & Backup System
- **Scheduled Auto-Backups**: Configurable daily backup time (`HH:MM`) with active background cron monitor and status indicators.
- **Instant Snapshots**: One-click database and application storage backup generation (`.zip`) with instant download, restore verification, and deletion.
- **System Health Diagnostics**: Real-time memory consumption, disk usage, database latency, and service availability monitors.

---

## 📦 What's Included in this Package
- Pre-compiled production frontends for **Admin Portal** and **Dashboard**.
- Full Laravel 12 backend with complete Eloquent models, API v1 controllers, migrations, and database seeders.
- Default branding assets and starter database setup.
- 100% PHPUnit test suite coverage (90/90 passing tests).

---

## 🛠️ Quick Installation

```bash
# 1. Extract production zip
unzip arx-erp-v1.0.0.zip -d /var/www/arx-erp
cd /var/www/arx-erp

# 2. Configure Environment
cp .env.example .env
php artisan key:generate

# 3. Run Migrations & Seeders
php artisan migrate --seed --force

# 4. Create Public Storage Symlink
php artisan storage:link

# 5. Start Application
php artisan serve
```

---

## 👤 Author & Credits
- Created and Maintained by **itzsd** ([@itzsd0811](https://github.com/itzsd0811))
- Open-source under the **MIT License**.
