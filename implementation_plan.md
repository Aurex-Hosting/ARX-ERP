# ARX-ERP — API-First Fully Customizable ERP Platform

> **By [ItzSD](https://github.com/itzsd0811)** • Self-Hosted • Single-Tenant • AI-Ready

A modular, API-first ERP core architecture built on **Laravel** (PHP), inspired by Pterodactyl Panel. The core is untouchable — all customization happens through **Modules**, **Themes**, and **Hooks**. AI agents and LLMs are first-class citizens via built-in **MCP (Model Context Protocol)** support.

---

## Vision & Philosophy

| Principle | Description |
|:---|:---|
| **API-First** | Every feature is an API endpoint first. The UI is just one consumer. |
| **Core Immutability** | The core ships as a protected foundation. Developers extend — never modify — it. |
| **Module Ecosystem** | Business features plug in as self-contained modules. The core has zero business logic. |
| **Theme System** | The frontend is fully decoupled and themeable. Any framework can consume the API. |
| **AI-Native** | AI agents authenticate, call tools, and interact via MCP. First-class, not bolted on. |
| **Self-Hosted** | Single-tenant, self-hosted. You own your data and your instance. |

---

## Technology Stack

| Layer | Technology | Rationale |
|:---|:---|:---|
| **Backend Framework** | Laravel 12.x (PHP 8.3+) | Service container, event system, Eloquent ORM, massive ecosystem |
| **API Standard** | RESTful JSON API + OpenAPI 3.1 | Industry standard, auto-docs, client generation |
| **Authentication** | Laravel Sanctum | API tokens with scoped abilities for Users & AI Agents |
| **Authorization** | Spatie Laravel Permission + Custom Policy Layer | Dynamic RBAC, module-registered permissions |
| **Module System** | Custom Module Loader | Full lifecycle control: discover → install → enable → disable → uninstall |
| **Database** | PostgreSQL 16+ | JSON/JSONB columns, advanced indexing, Row-Level Security capable |
| **Cache / Queue** | Redis | Sessions, cache, queue driver, broadcasting backend |
| **Real-Time** | Laravel Reverb (WebSockets) | Live dashboard updates, notifications |
| **AI Integration** | MCP PHP SDK (`mcp/sdk`) | Expose ERP as MCP tools/resources for LLM agents |
| **Frontend (Default)** | React 19 + TypeScript + Tailwind CSS 4 + Vite | Full SPA consuming the API, modern DX |
| **API Documentation** | Scramble (auto-gen OpenAPI) | Zero-maintenance docs from code annotations |
| **Containerization** | Docker + Docker Compose *(optional)* | Available for those who want it; native local dev fully supported |
| **Debugging** | Laravel Telescope + Debugbar | Request inspection, query profiling, exception tracking |

> [!NOTE]
> **Docker is optional.** The app runs on any local PHP 8.3 + PostgreSQL + Redis setup. Docker Compose is provided as a convenience, not a requirement.

---

## Core Roles

| Role | Purpose | Capabilities |
|:---|:---|:---|
| **Super-Admin** | Platform owner / system administrator | Full access to everything — modules, settings, users, audit logs, AI config |
| **User** | Standard application user | Access determined by assigned permissions (modules grant specific permissions) |
| **AI-Agent** | Machine-to-machine identity for LLMs/bots | Scoped API token with explicit tool permissions, all actions audit-logged, supports human-in-the-loop approval for destructive operations |

---

## High-Level Architecture

ARX-ERP has **two distinct application areas** — like Pterodactyl's Panel vs Admin:

| Area | URL | Who | Purpose | Example Modules |
|:---|:---|:---|:---|:---|
| **Dashboard** | `/` | All authenticated users | Business operations — the main app users interact with | Economy, CRM, Invoicing, POS, HR |
| **Admin** | `/admin` | Super-Admin only | System configuration & platform management | AWS S3 Config, Backup Manager, SMTP Setup, Module Store |

> [!IMPORTANT]
> **Permission-gated Dashboard**: Even though all users can access the Dashboard area, each module's pages and sidebar items are **only visible if the user has that module's `.view` permission**. No permission = not in sidebar, not routable, API returns 403.

```
┌──────────────────────────────────────────────────────────────────────────────┐
│                            CLIENTS / CONSUMERS                               │
│                                                                              │
│  ┌───────────────┐  ┌───────────────┐  ┌─────────────┐  ┌───────────────┐   │
│  │ Dashboard SPA │  │ Admin SPA     │  │ Third-Party  │  │ LLM / AI      │   │
│  │ (React)       │  │ (React)       │  │ Integrations │  │ Agent (MCP)   │   │
│  │ User-facing   │  │ Super-Admin   │  │ Mobile, etc. │  │               │   │
│  └───────┬───────┘  └───────┬───────┘  └──────┬───────┘  └───────┬───────┘  │
└──────────┼──────────────────┼─────────────────┼───────────────────┼──────────┘
           │                  │                 │                   │
           │ /api/v1/*        │ /api/v1/admin/* │ REST API          │ MCP (JSON-RPC)
           ▼                  ▼                 ▼                   ▼
┌──────────────────────────────────────────────────────────────────────────────┐
│                           API GATEWAY LAYER                                  │
│                                                                              │
│  ┌─────────────┐  ┌──────────────┐  ┌──────────────┐  ┌──────────────────┐  │
│  │ Rate Limiter │  │ Auth Guard   │  │ Permission   │  │ API Versioning   │  │
│  │ (per-token)  │  │ (Sanctum)    │  │ Middleware   │  │ Router (v1)      │  │
│  └─────────────┘  └──────────────┘  └──────────────┘  └──────────────────┘  │
│  ┌─────────────┐  ┌──────────────┐  ┌──────────────┐                        │
│  │ JSON Response│  │ Request      │  │ Area Router  │  ← routes to           │
│  │ Formatter   │  │ Validator    │  │ (dash/admin) │    correct area         │
│  └─────────────┘  └──────────────┘  └──────────────┘                        │
└───────────────────────────────┬──────────────────────────────────────────────┘
                                │
        ┌───────────────────────┼───────────────────────┐
        ▼                       ▼                       ▼
┌───────────────┐  ┌──────────────────────────────┐  ┌─────────────────────┐
│  CORE SYSTEM  │  │  MODULE LAYER (Extensible)   │  │  AI / MCP LAYER     │
│  (Protected)  │  │                              │  │  (Agent Gateway)    │
│               │  │  modules/                    │  │                     │
│ • Auth Engine │  │  ├── dashboard/              │  │ • MCP Server        │
│ • RBAC Engine │  │  │   ├── ContactsCRM/        │  │ • Tool Registry     │
│ • Module Mgr  │  │  │   ├── Inventory/          │  │ • Resource Registry │
│ • Theme Mgr   │  │  │   ├── Economy/            │  │ • Prompt Templates  │
│ • Hook System │  │  │   └── ...                 │  │ • Tool Gateway      │
│ • Event Bus   │  │  ├── admin/                  │  │   (RBAC + Audit)    │
│ • Settings    │  │  │   ├── AwsBucket/          │  │ • Human-in-the-Loop │
│ • Audit Log   │  │  │   ├── BackupManager/      │  │   Approval Queue    │
│ • Notify Svc  │  │  │   ├── SmtpConfig/         │  │                     │
│ • File Store  │  │  │   └── ...                 │  │  Modules register   │
│ • Debug Tools │  │  └── shared/                 │  │  their own MCP      │
│               │  │      └── Notifications/      │  │  tools & resources  │
│               │  │                              │  │                     │
│               │  │  Each module declares:       │  │                     │
│               │  │  "area": "dashboard"|"admin" │  │                     │
│               │  │         |"both"              │  │                     │
│               │  │                              │  │                     │
│               │  │  + Permissions, Hooks,       │  │                     │
│               │  │    Events, Menu, MCP Tools   │  │                     │
└───────┬───────┘  └──────────────┬───────────────┘  └──────────┬──────────┘
        │                         │                             │
        └─────────────────────────┼─────────────────────────────┘
                                  ▼
┌──────────────────────────────────────────────────────────────────────────────┐
│                              DATA LAYER                                      │
│                                                                              │
│  ┌──────────────┐  ┌──────────┐  ┌────────────┐  ┌───────────────────────┐  │
│  │ PostgreSQL   │  │  Redis   │  │  Local /   │  │  Laravel Telescope    │  │
│  │ 16+          │  │  Cache   │  │  S3 File   │  │  (Debug/Monitor)      │  │
│  │              │  │  Queue   │  │  Storage   │  │                       │  │
│  └──────────────┘  └──────────┘  └────────────┘  └───────────────────────┘  │
└──────────────────────────────────────────────────────────────────────────────┘
```

### Dashboard vs Admin — How Modules & Themes Are Scoped

```
┌─────────────────────────────────────────────────────────────────────┐
│                      MODULE & THEME SCOPING                         │
│                                                                     │
│  ┌─────────────────────────────────────────────────────────────┐    │
│  │  DASHBOARD AREA (/ )                                        │    │
│  │                                                             │    │
│  │  Theme:   themes/dashboard/default/  (React SPA)            │    │
│  │  Modules: modules/dashboard/*                               │    │
│  │                                                             │    │
│  │  ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────────────┐  │    │
│  │  │ Economy │ │ CRM     │ │ Invoice │ │ ...dev modules  │  │    │
│  │  │ module  │ │ module  │ │ module  │ │                 │  │    │
│  │  └─────────┘ └─────────┘ └─────────┘ └─────────────────┘  │    │
│  │                                                             │    │
│  │  Sidebar: Only shows modules user has {module}.view perm   │    │
│  │  Pages:   403 if user lacks permission, route not exposed   │    │
│  └─────────────────────────────────────────────────────────────┘    │
│                                                                     │
│  ┌─────────────────────────────────────────────────────────────┐    │
│  │  ADMIN AREA (/admin)                    Super-Admin Only    │    │
│  │                                                             │    │
│  │  Theme:   themes/admin/default/  (React SPA)                │    │
│  │  Modules: modules/admin/*                                   │    │
│  │                                                             │    │
│  │  ┌─────────┐ ┌─────────┐ ┌──────────┐ ┌────────────────┐  │    │
│  │  │ AWS S3  │ │ Backup  │ │ SMTP     │ │ ...dev modules │  │    │
│  │  │ Config  │ │ Manager │ │ Setup    │ │                │  │    │
│  │  └─────────┘ └─────────┘ └──────────┘ └────────────────┘  │    │
│  │                                                             │    │
│  │  Core admin pages always present:                           │    │
│  │  Users, Roles, Modules, Themes, Settings, Audit, AI, Health│    │
│  └─────────────────────────────────────────────────────────────┘    │
│                                                                     │
│  ┌─────────────────────────────────────────────────────────────┐    │
│  │  SHARED MODULES (area: "both")                              │    │
│  │  Loaded into both areas. E.g.: Notifications, File Manager  │    │
│  └─────────────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────────────┘
```

---

## AI / MCP Integration Architecture

ARX-ERP treats AI agents as first-class authenticated users. The platform exposes itself as an **MCP Server**, so any LLM client (Claude, Gemini, ChatGPT, custom agents) can interact with the ERP through the standardized Model Context Protocol.

### How It Works

```
┌─────────────────┐       JSON-RPC / HTTP        ┌──────────────────────┐
│   LLM Client    │ ◄──────────────────────────► │  ARX-ERP MCP Server  │
│  (Claude, etc.) │      MCP Protocol             │                      │
└─────────────────┘                               │  ┌────────────────┐  │
                                                  │  │ Tool Registry  │  │
                                                  │  │ ├── Core Tools │  │
                                                  │  │ └── Module     │  │
                                                  │  │     Tools      │  │
                                                  │  ├────────────────┤  │
                                                  │  │ Resources      │  │
                                                  │  │ ├── Schema     │  │
                                                  │  │ ├── Docs       │  │
                                                  │  │ └── Module     │  │
                                                  │  │     Resources  │  │
                                                  │  ├────────────────┤  │
                                                  │  │ Prompts        │  │
                                                  │  │ (Templates)    │  │
                                                  │  ├────────────────┤  │
                                                  │  │ Tool Gateway   │  │
                                                  │  │ ├── RBAC Check │  │
                                                  │  │ ├── Audit Log  │  │
                                                  │  │ ├── Rate Limit │  │
                                                  │  │ └── HITL Queue │  │
                                                  │  └────────────────┘  │
                                                  └──────────────────────┘
```

### Core MCP Tools (Built-In)

| Tool | Description | Requires Approval |
|:---|:---|:---|
| `arx.users.list` | List all users with filters | No |
| `arx.users.get` | Get user details | No |
| `arx.users.create` | Create a new user | **Yes (HITL)** |
| `arx.users.update` | Update user profile | **Yes (HITL)** |
| `arx.settings.get` | Read system settings | No |
| `arx.settings.update` | Modify system settings | **Yes (HITL)** |
| `arx.modules.list` | List installed modules | No |
| `arx.modules.status` | Check module health | No |
| `arx.audit.query` | Search audit logs | No |

### Module MCP Registration

Modules register their own MCP tools via their ServiceProvider:

```php
// modules/Inventory/Providers/InventoryServiceProvider.php

public function bootMcpTools(McpRegistry $registry): void
{
    $registry->tool('inventory.stock.check', StockCheckTool::class);
    $registry->tool('inventory.stock.adjust', StockAdjustTool::class, requiresApproval: true);
    $registry->resource('inventory://products', ProductListResource::class);
    $registry->prompt('inventory.reorder_analysis', ReorderAnalysisPrompt::class);
}
```

---

## Project Directory Structure

```
arx-erp/
├── app/
│   ├── Core/                              # ★ PROTECTED CORE — never modified by modules
│   │   ├── Console/                       # Core Artisan commands
│   │   │   ├── ModuleMakeCommand.php
│   │   │   ├── ModuleInstallCommand.php
│   │   │   ├── ModuleEnableCommand.php
│   │   │   ├── ModuleDisableCommand.php
│   │   │   ├── ModuleListCommand.php
│   │   │   └── SetupCommand.php           # Initial setup wizard
│   │   │
│   │   ├── Contracts/                     # Interfaces all modules/themes MUST implement
│   │   │   ├── ModuleInterface.php
│   │   │   ├── ThemeInterface.php
│   │   │   ├── HookableInterface.php
│   │   │   ├── WidgetInterface.php
│   │   │   ├── MenuContributorInterface.php
│   │   │   ├── ReportGeneratorInterface.php
│   │   │   ├── ImportExportInterface.php
│   │   │   └── McpToolInterface.php       # Contract for MCP tool definitions
│   │   │
│   │   ├── Events/                        # Core domain events
│   │   │   ├── Auth/
│   │   │   │   ├── UserLoggedIn.php
│   │   │   │   ├── UserLoggedOut.php
│   │   │   │   └── UserRegistered.php
│   │   │   ├── Module/
│   │   │   │   ├── ModuleInstalled.php
│   │   │   │   ├── ModuleEnabled.php
│   │   │   │   └── ModuleDisabled.php
│   │   │   └── System/
│   │   │       └── SettingChanged.php
│   │   │
│   │   ├── Exceptions/
│   │   │   ├── Handler.php                # Global exception → JSON API response
│   │   │   ├── ModuleException.php
│   │   │   ├── AuthenticationException.php
│   │   │   └── AuthorizationException.php
│   │   │
│   │   ├── Http/
│   │   │   ├── Controllers/
│   │   │   │   ├── Api/V1/
│   │   │   │   │   ├── AuthController.php
│   │   │   │   │   ├── UserController.php
│   │   │   │   │   ├── RoleController.php
│   │   │   │   │   ├── PermissionController.php
│   │   │   │   │   ├── ModuleController.php
│   │   │   │   │   ├── ThemeController.php
│   │   │   │   │   ├── SettingController.php
│   │   │   │   │   ├── AuditLogController.php
│   │   │   │   │   ├── NavigationController.php  # Returns permission-filtered menu
│   │   │   │   │   ├── McpToolController.php
│   │   │   │   │   └── SystemHealthController.php
│   │   │   │   ├── DashboardSpaController.php    # Serves Dashboard SPA (/)
│   │   │   │   └── AdminSpaController.php        # Serves Admin SPA (/admin)
│   │   │   │
│   │   │   ├── Middleware/
│   │   │   │   ├── ForceJsonResponse.php  # Always return JSON from API
│   │   │   │   ├── CheckPermission.php    # Dynamic permission gate
│   │   │   │   ├── CheckModuleAccess.php  # Verify user can access this module's routes
│   │   │   │   ├── RequireSuperAdmin.php  # Gate for admin area
│   │   │   │   ├── AuditRequest.php       # Log every mutating request
│   │   │   │   ├── RateLimitByToken.php   # Per-token rate limiting
│   │   │   │   ├── IdentifyAiAgent.php    # Tag requests from AI-Agent role
│   │   │   │   └── HumanApprovalGate.php  # Block AI actions requiring approval
│   │   │   │
│   │   │   ├── Requests/                  # Form request validation
│   │   │   └── Resources/                 # API Resources (JSON transformers)
│   │   │       ├── UserResource.php
│   │   │       ├── RoleResource.php
│   │   │       ├── ModuleResource.php
│   │   │       ├── SettingResource.php
│   │   │       └── AuditLogResource.php
│   │   │
│   │   ├── Models/
│   │   │   ├── User.php
│   │   │   ├── Role.php                   # Extended from Spatie
│   │   │   ├── Permission.php             # Extended from Spatie
│   │   │   ├── Setting.php
│   │   │   ├── AuditLog.php
│   │   │   ├── ApiToken.php               # AI-Agent token management
│   │   │   └── PendingApproval.php        # HITL approval queue
│   │   │
│   │   ├── Providers/
│   │   │   ├── CoreServiceProvider.php
│   │   │   ├── EventServiceProvider.php
│   │   │   ├── RouteServiceProvider.php
│   │   │   ├── ModuleServiceProvider.php  # Boot-time module discovery
│   │   │   └── McpServiceProvider.php     # MCP server registration
│   │   │
│   │   ├── Services/
│   │   │   ├── ModuleManager.php          # Module lifecycle management
│   │   │   ├── ThemeManager.php           # Theme discovery & switching (per-area)
│   │   │   ├── HookManager.php            # Filters & Actions (WordPress-style)
│   │   │   ├── NavigationBuilder.php      # Build permission-filtered menus per area
│   │   │   ├── PermissionEngine.php       # Dynamic permission registration
│   │   │   ├── SettingsManager.php        # System & User level settings
│   │   │   ├── AuditService.php           # Mutation logging with diff tracking
│   │   │   ├── NotificationService.php    # Email, in-app, push notifications
│   │   │   └── Mcp/
│   │   │       ├── McpServer.php          # MCP server implementation
│   │   │       ├── McpRegistry.php        # Tool/Resource/Prompt registry
│   │   │       ├── ToolGateway.php        # RBAC + Audit + Rate limit for AI
│   │   │       └── ApprovalManager.php    # Human-in-the-loop queue
│   │   │
│   │   └── Traits/
│   │       ├── Auditable.php              # Auto-log create/update/delete
│   │       ├── HasPermissions.php         # Permission helper methods
│   │       └── Filterable.php             # Dynamic query filtering
│   │
│   └── Http/
│       └── Kernel.php
│
├── modules/                               # ★ ALL MODULES — ORGANIZED BY AREA
│   ├── dashboard/                         # Modules for the Dashboard (user-facing)
│   │   └── .gitkeep
│   ├── admin/                             # Modules for the Admin panel (super-admin)
│   │   └── .gitkeep
│   └── shared/                            # Modules loaded into BOTH areas
│       └── .gitkeep
│
├── themes/                                # ★ ALL THEMES — SEPARATE PER AREA
│   ├── dashboard/                         # Dashboard themes
│   │   └── default/                       # Default Dashboard React SPA
│   │       ├── theme.json
│   │       ├── src/
│   │       │   ├── App.tsx
│   │       │   ├── main.tsx
│   │       │   ├── api/                   # API client (auto-gen from OpenAPI)
│   │       │   │   ├── client.ts          # Axios instance with Sanctum auth
│   │       │   │   └── endpoints/
│   │       │   ├── components/
│   │       │   │   ├── ui/                # Reusable UI primitives
│   │       │   │   ├── layout/
│   │       │   │   │   ├── DashboardLayout.tsx
│   │       │   │   │   ├── AuthLayout.tsx
│   │       │   │   │   ├── Sidebar.tsx    # Permission-filtered module nav
│   │       │   │   │   └── Header.tsx
│   │       │   │   └── widgets/           # Dynamic widget renderer
│   │       │   ├── pages/
│   │       │   │   ├── auth/
│   │       │   │   │   ├── Login.tsx
│   │       │   │   │   ├── Register.tsx
│   │       │   │   │   └── ForgotPassword.tsx
│   │       │   │   ├── Dashboard.tsx      # Widget grid (modules inject)
│   │       │   │   ├── Profile.tsx
│   │       │   │   └── Notifications.tsx
│   │       │   ├── hooks/
│   │       │   ├── store/
│   │       │   ├── router/                # Module pages auto-registered
│   │       │   └── types/
│   │       ├── public/
│   │       ├── tailwind.config.ts
│   │       ├── vite.config.ts
│   │       ├── tsconfig.json
│   │       └── package.json
│   │
│   └── admin/                             # Admin themes
│       └── default/                       # Default Admin React SPA
│           ├── theme.json
│           ├── src/
│           │   ├── App.tsx
│           │   ├── main.tsx
│           │   ├── api/
│           │   ├── components/
│           │   │   ├── ui/
│           │   │   ├── layout/
│           │   │   │   ├── AdminLayout.tsx
│           │   │   │   ├── AdminSidebar.tsx
│           │   │   │   └── AdminHeader.tsx
│           │   │   └── widgets/
│           │   ├── pages/
│           │   │   ├── Overview.tsx        # Admin dashboard / system overview
│           │   │   ├── Users.tsx
│           │   │   ├── Roles.tsx
│           │   │   ├── Modules.tsx         # Install/Enable/Disable UI (both areas)
│           │   │   ├── Themes.tsx          # Manage themes for both areas
│           │   │   ├── Settings.tsx        # Tabbed: system + admin module settings
│           │   │   ├── AuditLogs.tsx
│           │   │   ├── AiAgents.tsx        # Manage AI agent tokens
│           │   │   ├── Approvals.tsx       # HITL approval queue
│           │   │   ├── SystemHealth.tsx
│           │   │   └── DevTools.tsx        # Hook registry, event log, debug
│           │   ├── hooks/
│           │   ├── store/
│           │   ├── router/
│           │   └── types/
│           ├── public/
│           ├── tailwind.config.ts
│           ├── vite.config.ts
│           ├── tsconfig.json
│           └── package.json
│
├── stubs/                                 # ★ MODULE/THEME SCAFFOLDING TEMPLATES
│   ├── module/
│   │   ├── module.json.stub
│   │   ├── ServiceProvider.php.stub
│   │   ├── Controller.php.stub
│   │   ├── Model.php.stub
│   │   ├── Migration.php.stub
│   │   ├── ApiRoutes.php.stub
│   │   ├── McpTool.php.stub
│   │   └── Test.php.stub
│   └── theme/
│       ├── theme.json.stub
│       └── react/                         # React theme starter template
│           ├── src/
│           ├── vite.config.ts.stub
│           └── package.json.stub
│
├── config/
│   ├── app.php
│   ├── arx.php                            # ARX-ERP config (areas, module/theme paths, branding)
│   ├── modules.php                        # Module system behavior
│   ├── mcp.php                            # MCP server configuration
│   └── audit.php                          # Audit logging config
│
├── database/
│   ├── migrations/                        # Core-only migrations
│   └── seeders/
│       └── CoreSeeder.php                 # Seed Super-Admin, default roles, settings
│
├── routes/
│   ├── api.php                            # Core API routes (/api/v1/...)
│   ├── web.php                            # SPA entry points (/ → dashboard, /admin → admin)
│   └── channels.php                       # WebSocket broadcast channels
│
├── docs/                                  # Developer documentation
│   ├── getting-started.md
│   ├── module-development.md
│   ├── theme-development.md
│   ├── hook-reference.md
│   ├── event-reference.md
│   ├── mcp-integration.md
│   └── api-reference.md                   # (auto-generated)
│
├── storage/
├── tests/
│   ├── Feature/
│   │   ├── Auth/
│   │   ├── Module/
│   │   ├── Hook/
│   │   ├── Mcp/
│   │   └── Audit/
│   └── Unit/
│
├── docker/                                # ★ OPTIONAL — for Docker users
│   ├── Dockerfile
│   ├── nginx.conf
│   └── php.ini
│
├── docker-compose.yml                     # Optional
├── .env.example
├── composer.json
├── artisan
└── README.md
```

---

## Module Structure (What Developers Create)

When a developer runs `php artisan module:make ContactsCRM --area=dashboard`, they get:

```
modules/dashboard/ContactsCRM/
├── module.json                    # Module manifest (area, identity, deps, permissions, menu, MCP)
├── Config/
│   └── config.php                 # Module-specific config
├── Console/
│   └── Commands/
├── Database/
│   ├── Migrations/
│   ├── Seeders/
│   └── Factories/
├── Http/
│   ├── Controllers/
│   │   └── ContactController.php
│   ├── Middleware/
│   ├── Requests/
│   └── Resources/
├── Models/
│   └── Contact.php
├── Providers/
│   └── ContactsCRMServiceProvider.php    # Boot: register routes, hooks, events, MCP tools
├── Routes/
│   └── api.php                    # /api/v1/contacts/...
├── Services/
├── Events/
├── Listeners/
├── Mcp/                           # MCP tool definitions for this module
│   ├── ContactSearchTool.php
│   └── ContactListResource.php
├── Tests/
│   ├── Feature/
│   └── Unit/
└── Resources/
    └── assets/
```

### module.json Manifest

```json
{
  "name": "Contacts CRM",
  "slug": "contacts-crm",
  "namespace": "Modules\\Dashboard\\ContactsCRM",
  "version": "1.0.0",
  "description": "Manage companies, contacts, and relationships",
  "area": "dashboard",
  "author": {
    "name": "Developer Name",
    "url": "https://github.com/developer"
  },
  "core_version": ">=1.0.0",
  "dependencies": [],
  "permissions": [
    "contacts.view",
    "contacts.create",
    "contacts.edit",
    "contacts.delete",
    "contacts.export"
  ],
  "menu": {
    "label": "Contacts",
    "icon": "users",
    "position": 10,
    "children": [
      { "label": "All Contacts", "route": "/contacts" },
      { "label": "Companies", "route": "/contacts/companies" }
    ]
  },
  "settings": {
    "contacts_per_page": {
      "type": "integer",
      "default": 25,
      "label": "Contacts Per Page"
    }
  },
  "mcp": {
    "tools": [
      {
        "name": "contacts.search",
        "description": "Search contacts by name, email, or company",
        "requires_approval": false
      },
      {
        "name": "contacts.create",
        "description": "Create a new contact record",
        "requires_approval": true
      }
    ],
    "resources": [
      {
        "uri": "contacts://list",
        "description": "List of all contacts"
      }
    ]
  }
}
```

> [!NOTE]
> **The `area` field** is the key differentiator:
> - `"area": "dashboard"` → placed in `modules/dashboard/`, menu items appear in Dashboard sidebar, routes under `/api/v1/...`
> - `"area": "admin"` → placed in `modules/admin/`, menu items appear in Admin sidebar, routes under `/api/v1/admin/...`
> - `"area": "both"` → placed in `modules/shared/`, loaded into both areas

### theme.json Manifest (Area-Scoped)

```json
{
  "name": "ARX Dashboard Default",
  "slug": "default",
  "area": "dashboard",
  "version": "1.0.0",
  "engine": "react",
  "author": { "name": "ItzSD", "url": "https://github.com/itzsd0811" },
  "core_version": ">=1.0.0",
  "entry": "dist/index.html",
  "config": {
    "primary_color": "#4F46E5",
    "accent_color": "#7C3AED",
    "logo_url": null,
    "sidebar_style": "expanded",
    "dark_mode": true
  }
}
```

> [!TIP]
> Themes are **independently swappable per area**. You can run a custom dark theme on the Dashboard while keeping the default theme on Admin, or vice versa.

---

## Implementation Phases

### Phase 1 — Core Foundation (Weeks 1–3)

> **Goal**: A bulletproof Laravel app with authentication, authorization, API scaffolding, module loader, hook system, event bus, settings, audit logging, and debugging tools. Zero business logic.

---

#### 1.1 Project Bootstrapping
- [ ] Initialize Laravel 12.x project (`laravel new arx-erp`)
- [ ] Configure for **PostgreSQL** in `.env.example` and `config/database.php`
- [ ] Set up Redis for cache + queue + sessions
- [ ] Configure API-first defaults:
  - Force JSON responses on all `/api/*` routes
  - API versioning: `/api/v1/...`
  - CORS configuration for SPA
  - Rate limiting (60 req/min default, configurable per-token)
- [ ] Create `config/arx.php` (module paths, theme paths, branding)
- [ ] **Docker Compose** (optional): PHP 8.3-FPM + Nginx + PostgreSQL 16 + Redis
- [ ] **Native setup** docs: PHP 8.3 + Composer + PostgreSQL + Redis (no Docker needed)

#### 1.2 Authentication System
- [ ] Install & configure **Laravel Sanctum**
- [ ] API Endpoints:
  - `POST   /api/v1/auth/register` — user registration
  - `POST   /api/v1/auth/login` — returns Sanctum token
  - `POST   /api/v1/auth/logout` — revoke current token
  - `GET    /api/v1/auth/user` — authenticated user profile
  - `POST   /api/v1/auth/forgot-password`
  - `POST   /api/v1/auth/reset-password`
  - `PUT    /api/v1/auth/profile` — update own profile
  - `POST   /api/v1/auth/2fa/enable` — enable 2FA
  - `POST   /api/v1/auth/2fa/verify` — verify 2FA code
- [ ] **Token scoping**: tokens carry abilities like `['users.view', 'settings.read']`
- [ ] **AI-Agent tokens**: long-lived tokens tagged with `role: ai-agent`, auto-audited
- [ ] Token management API:
  - `GET    /api/v1/auth/tokens` — list active tokens
  - `POST   /api/v1/auth/tokens` — create new token (with scopes)
  - `DELETE /api/v1/auth/tokens/{id}` — revoke token

#### 1.3 Authorization Engine (RBAC)
- [ ] Install **Spatie Laravel Permission**
- [ ] Core roles seeded: `super-admin`, `user`, `ai-agent`
- [ ] Core permissions seeded:
  - `users.*` (view, create, edit, delete)
  - `roles.*` (view, create, edit, delete)
  - `modules.*` (view, install, enable, disable, uninstall)
  - `themes.*` (view, activate)
  - `settings.*` (view, update)
  - `audit-logs.view`
  - `ai-agents.*` (view, create, manage)
- [ ] **Dynamic permission registration**: modules declare permissions in `module.json`, Core registers them on install
- [ ] Super-Admin bypasses all permission checks
- [ ] API endpoints for role/permission management:
  - `GET/POST/PUT/DELETE /api/v1/admin/roles`
  - `GET                 /api/v1/admin/permissions`
  - `POST                /api/v1/admin/roles/{id}/permissions`
  - `GET/POST/PUT/DELETE /api/v1/admin/users`

#### 1.4 Module System (Heart of the Platform)
- [ ] `ModuleInterface` contract:
  ```php
  interface ModuleInterface {
      public function getName(): string;
      public function getSlug(): string;
      public function getArea(): string;       // 'dashboard' | 'admin' | 'both'
      public function getVersion(): string;
      public function getDependencies(): array;
      public function getPermissions(): array;
      public function getMenuItems(): array;
      public function getSettings(): array;
      public function getMcpTools(): array;
  }
  ```
- [ ] `AbstractModuleServiceProvider` base class with lifecycle hooks:
  - `register()` — bind services
  - `boot()` — register routes, hooks, events, MCP tools
  - `install()` — run migrations, seed data
  - `uninstall()` — rollback migrations, clean up
- [ ] `ModuleManager` service:
  - `discover(?string $area = null)` — scan `modules/{dashboard,admin,shared}/` for valid manifests
  - `install(string $slug)` — validate deps → run migrations → register permissions → seed → enable
  - `enable(string $slug)` / `disable(string $slug)` — toggle without data loss
  - `uninstall(string $slug)` — rollback migrations → remove permissions → clean files
  - `getDependencyTree()` — resolve and validate inter-module dependencies
  - `getModuleStatus()` — returns installed/enabled/disabled/error state
  - `getModulesByArea(string $area)` — filter modules by dashboard/admin/shared
- [ ] Module state stored in DB (`modules` table: slug, area, version, status, installed_at, etc.)
- [ ] Artisan commands:
  - `php artisan module:make {name} --area=dashboard` — scaffold in correct area directory
  - `php artisan module:make {name} --area=admin`
  - `php artisan module:make {name} --area=both`
  - `php artisan module:install {slug}`
  - `php artisan module:enable {slug}` / `module:disable {slug}`
  - `php artisan module:uninstall {slug}`
  - `php artisan module:list` — table of all modules with status & area
  - `php artisan module:list --area=dashboard` — filter by area
  - `php artisan module:make-controller {module} {name}`
  - `php artisan module:make-model {module} {name} --migration`
- [ ] Module API endpoints:
  - `GET    /api/v1/admin/modules` — list all modules (filterable by `?area=dashboard`)
  - `POST   /api/v1/admin/modules/{slug}/install`
  - `POST   /api/v1/admin/modules/{slug}/enable`
  - `POST   /api/v1/admin/modules/{slug}/disable`
  - `DELETE /api/v1/admin/modules/{slug}` — uninstall
- [ ] **Route registration by area**:
  - Dashboard modules register routes under `/api/v1/{module-prefix}/...`
  - Admin modules register routes under `/api/v1/admin/{module-prefix}/...`
  - Shared modules register routes in both prefixes

#### 1.5 Hook System (WordPress-Style Extensibility)
- [ ] `HookManager` service:
  ```php
  // Actions — fire and forget
  HookManager::registerAction('user.created', [MyModule::class, 'onUserCreated'], priority: 10);
  HookManager::doAction('user.created', $user);

  // Filters — transform values
  HookManager::registerFilter('dashboard.widgets', [MyModule::class, 'addWidgets'], priority: 10);
  $widgets = HookManager::applyFilters('dashboard.widgets', $defaultWidgets);
  ```
- [ ] Core hook points:
  - **Auth**: `user.registered`, `user.logged_in`, `user.logged_out`
  - **Users**: `user.creating`, `user.created`, `user.updating`, `user.updated`, `user.deleting`, `user.deleted`
  - **Modules**: `module.installing`, `module.installed`, `module.enabling`, `module.enabled`, `module.disabling`, `module.disabled`
  - **Dashboard UI Filters**: `dashboard.widgets`, `dashboard.navigation.menu`, `dashboard.settings.tabs`, `dashboard.toolbar`
  - **Admin UI Filters**: `admin.widgets`, `admin.navigation.menu`, `admin.settings.tabs`, `admin.toolbar`
  - **Data Filters**: `api.response.users`, `api.pagination.default`
- [ ] Hooks registered in module ServiceProvider `boot()` method
- [ ] Hook registry API: `GET /api/v1/admin/hooks` — list all registered hooks (debugging)

#### 1.6 Event System
- [ ] Core events (classes in `app/Core/Events/`):
  - `UserRegistered`, `UserUpdated`, `UserDeleted`
  - `ModuleInstalled`, `ModuleEnabled`, `ModuleDisabled`
  - `SettingChanged`
  - `AiToolExecuted`, `ApprovalRequested`, `ApprovalGranted`, `ApprovalDenied`
- [ ] Modules register listeners in their own `EventServiceProvider`
- [ ] Auto-discovery of module event listeners
- [ ] Support queued listeners (async via Redis)

#### 1.7 Settings Manager
- [ ] Hierarchical: **System** → **User** (most specific wins)
- [ ] Settings stored in `settings` table: `key`, `value` (JSON), `group`, `type`, `scope`
- [ ] Modules register settings via `module.json`
- [ ] Cached in Redis, invalidated on change
- [ ] API endpoints:
  - `GET  /api/v1/settings` — all settings for current scope
  - `PUT  /api/v1/settings` — bulk update
  - `GET  /api/v1/settings/{key}`
  - `PUT  /api/v1/settings/{key}`
  - `GET  /api/v1/admin/settings/groups` — grouped settings for admin UI

#### 1.8 Audit Logging
- [ ] `Auditable` trait — attach to any model for automatic logging
- [ ] Captures: `user_id`, `user_type` (user/ai-agent), `action` (create/update/delete), `model_type`, `model_id`, `old_values`, `new_values`, `ip_address`, `user_agent`, `metadata` (JSONB), `created_at`
- [ ] **AI-Agent audit**: all AI tool executions are logged with the full tool call payload
- [ ] `AuditRequest` middleware — logs every `POST/PUT/PATCH/DELETE` request
- [ ] API: `GET /api/v1/admin/audit-logs` with filtering:
  - Filter by user, action, model type, date range, AI-agent-only
  - Full-text search on metadata
  - Pagination + export

#### 1.9 Debugging & Monitoring
- [ ] Install **Laravel Telescope** (dev/staging only):
  - Request monitoring
  - Query profiling (slow query alerts)
  - Exception tracking
  - Queue job monitoring
  - Event monitoring
  - Mail previews
- [ ] Health check endpoint: `GET /api/v1/health`
  ```json
  {
    "status": "healthy",
    "version": "1.0.0",
    "checks": {
      "database": "ok",
      "redis": "ok",
      "storage": "ok",
      "queue": "ok"
    },
    "modules_loaded": 3,
    "uptime_seconds": 86400
  }
  ```
- [ ] Structured JSON logging (queryable via any log aggregator)

---

### Phase 2 — Theme Engine & Dual-Area Frontend (Weeks 4–5)

> **Goal**: Theme system with per-area switching + two default React SPAs (Dashboard + Admin), each independently themeable.

#### 2.1 Theme Engine (Backend — Area-Aware)
- [ ] `ThemeManager` service (manages themes **per area**):
  - `discover(string $area)` — scan `themes/{dashboard,admin}/` for `theme.json` manifests
  - `activate(string $area, string $slug)` — activate a theme for a specific area
  - `getActive(string $area)` — get active theme for dashboard or admin
  - `getConfig(string $area)` — return active theme's config (colors, logo, etc.)
  - `getAssetPath(string $area, string $file)` — resolve asset URLs per area
- [ ] Theme state stored in `settings` table: `theme.dashboard.active` and `theme.admin.active`
- [ ] Theme API:
  - `GET  /api/v1/admin/themes?area=dashboard` — list dashboard themes
  - `GET  /api/v1/admin/themes?area=admin` — list admin themes
  - `POST /api/v1/admin/themes/{slug}/activate` — body: `{ "area": "dashboard" }`
  - `GET  /api/v1/theme/config?area=dashboard` — public, returns active dashboard theme config
  - `GET  /api/v1/theme/config?area=admin` — public, returns active admin theme config
- [ ] SPA serving:
  - `GET /` → serves active dashboard theme's `entry` file
  - `GET /admin` → serves active admin theme's `entry` file
  - `GET /api/*` → API routes (never serves theme HTML)

#### 2.2 Navigation API (Permission-Filtered)
- [ ] `NavigationController` endpoint:
  - `GET /api/v1/navigation?area=dashboard` — returns sidebar menu for current user
  - `GET /api/v1/navigation?area=admin` — returns admin sidebar menu
- [ ] `NavigationBuilder` service:
  - Collects menu items from all enabled modules in the requested area
  - **Filters out** any menu item where the user lacks `{module}.view` permission
  - Returns only the items the current user is allowed to see
  - Sorted by `position` defined in each module's `module.json`
- [ ] Response shape:
  ```json
  {
    "area": "dashboard",
    "items": [
      {
        "label": "Contacts",
        "icon": "users",
        "route": "/contacts",
        "module": "contacts-crm",
        "children": [
          { "label": "All Contacts", "route": "/contacts" },
          { "label": "Companies", "route": "/contacts/companies" }
        ]
      }
    ]
  }
  ```

#### 2.3 Default Dashboard SPA (`themes/dashboard/default/`)

The user-facing application. All content is permission-gated.

- [ ] **Auth pages**: Login, Register, Forgot Password
- [ ] **Dashboard home**: Dynamic widget grid — widgets contributed by dashboard modules via `dashboard.widgets` hook. Only widgets from modules the user has permission for are shown.
- [ ] **Profile**: User account settings, password change, 2FA setup
- [ ] **Notifications**: In-app notification center
- [ ] **Module pages**: Auto-registered from enabled dashboard modules. If user navigates to a module route they lack permission for → redirect to 403 page.
- [ ] **Sidebar**: Rendered from `/api/v1/navigation?area=dashboard` — only shows modules the user has access to

#### 2.4 Default Admin SPA (`themes/admin/default/`)

The system administration panel. Super-Admin only — entire area gated.

- [ ] **System Overview**: Admin dashboard with system stats, health, recent activity
- [ ] **Users**: CRUD with role assignment, token management
- [ ] **Roles & Permissions**: Visual permission matrix (all module permissions visible)
- [ ] **Modules**: Install/Enable/Disable UI — shows **all modules across both areas** with area badges
- [ ] **Themes**: Manage themes for Dashboard and Admin separately
- [ ] **Settings**: Tabbed interface (system settings + module-contributed tabs from admin modules)
- [ ] **Audit Logs**: Searchable/filterable log viewer with user vs AI-agent distinction
- [ ] **AI Agents**: Create/manage AI-Agent tokens with scope editor
- [ ] **Approval Queue**: Review & approve/deny pending AI actions (HITL)
- [ ] **System Health**: Live system status dashboard (DB, Redis, Queue, Modules)
- [ ] **Developer Tools**: Hook registry, event log, active modules tree (debug info)
- [ ] **Admin module pages**: Auto-registered from enabled admin modules (e.g., AWS S3 Config page)

#### 2.5 Shared Frontend Stack (Both SPAs)
- [ ] React 19 + TypeScript + Vite
- [ ] Tailwind CSS 4 for styling
- [ ] React Router v7 for routing
- [ ] TanStack Query for server state / data fetching
- [ ] Zustand for client-side state
- [ ] Axios with Sanctum token interceptor
- [ ] Auto-generated API client from OpenAPI spec
- [ ] Dark mode support (stored in theme config)
- [ ] Toast notifications (sonner)
- [ ] `@arx/ui` shared component library (can be a local npm workspace package used by both SPAs)

---

### Phase 3 — AI / MCP Integration Layer (Week 6–7)

> **Goal**: ARX-ERP is an MCP server. Any LLM can connect to it and interact as an authenticated AI Agent.

#### 3.1 MCP Server
- [ ] Install `mcp/sdk` (official PHP MCP SDK)
- [ ] Create `McpServer` — implements MCP protocol over STDIO and HTTP/SSE transports
- [ ] `McpRegistry` — central registry where Core and Modules register:
  - **Tools**: callable functions the LLM can execute
  - **Resources**: data the LLM can read
  - **Prompts**: reusable prompt templates
- [ ] Core tools registered automatically (users, settings, audit, modules)
- [ ] Module tools registered via `bootMcpTools()` in their ServiceProvider

#### 3.2 Tool Gateway (Security for AI)
- [ ] `ToolGateway` middleware layer between MCP and actual execution:
  - **Authentication**: validate AI-Agent Sanctum token
  - **Authorization**: check token scopes against tool's required permissions
  - **Rate Limiting**: per-agent rate limits
  - **Audit Logging**: every tool call logged with full input/output
  - **Schema Validation**: validate LLM output matches tool's parameter schema
- [ ] All tool executions return structured JSON the LLM can parse

#### 3.3 Human-in-the-Loop (HITL) Approval System
- [ ] Tools can be marked `requires_approval: true` in `module.json`
- [ ] When AI calls a protected tool:
  1. Action is queued in `pending_approvals` table
  2. WebSocket notification sent to admins
  3. Admin reviews in Approval Queue UI → Approve / Deny
  4. Result returned to AI agent
- [ ] `PendingApproval` model: `agent_id`, `tool_name`, `parameters`, `status`, `reviewed_by`, `reviewed_at`
- [ ] API:
  - `GET  /api/v1/admin/approvals` — list pending
  - `POST /api/v1/admin/approvals/{id}/approve`
  - `POST /api/v1/admin/approvals/{id}/deny`

#### 3.4 MCP Module Interface
- [ ] Modules can register MCP tools without touching core:
  ```php
  class InventoryServiceProvider extends AbstractModuleServiceProvider
  {
      public function bootMcpTools(McpRegistry $registry): void
      {
          $registry->tool(
              name: 'inventory.stock.check',
              handler: StockCheckTool::class,
              description: 'Check stock levels for a product',
              parameters: ['product_id' => 'integer'],
              requiresApproval: false
          );
      }
  }
  ```
- [ ] MCP tool discovery: `GET /api/v1/mcp/tools` — list all available tools (for introspection)
- [ ] MCP resource discovery: `GET /api/v1/mcp/resources`

---

### Phase 4 — Developer Tooling & Documentation (Week 8)

> **Goal**: Everything a third-party developer needs to build modules and themes.

#### 4.1 Module & Theme Scaffolding CLI
- [ ] `php artisan module:make {name} --area=dashboard` — full scaffold from stubs
- [ ] `php artisan module:make {name} --area=admin`
- [ ] `php artisan module:make {name} --area=both`
- [ ] `php artisan module:make-controller {module} {name}`
- [ ] `php artisan module:make-model {module} {name} --migration`
- [ ] `php artisan module:make-event {module} {name}`
- [ ] `php artisan module:make-mcp-tool {module} {name}`
- [ ] `php artisan module:make-test {module} {name}`
- [ ] `php artisan module:test {slug}` — run only that module's tests
- [ ] `php artisan module:validate {slug}` — validate `module.json`, check deps, verify area placement
- [ ] `php artisan theme:make {name} --area=dashboard` — scaffold a new dashboard theme
- [ ] `php artisan theme:make {name} --area=admin` — scaffold a new admin theme

#### 4.2 API Documentation
- [ ] Integrate **Scramble** for auto-generated OpenAPI spec from code
- [ ] Module routes auto-appear in the spec
- [ ] Interactive docs at `/api/docs` (Swagger UI)
- [ ] Exportable OpenAPI JSON for frontend client generation

#### 4.3 Developer Docs (`docs/`)
- [ ] Getting Started (install, configure, first run)
- [ ] Module Development Guide (lifecycle, hooks, events, MCP tools)
- [ ] Theme Development Guide (theme.json, asset pipeline, API client)
- [ ] Hook Reference (all core hooks with signatures)
- [ ] Event Reference (all core events with payloads)
- [ ] MCP Integration Guide (registering tools, resources, prompts)
- [ ] Contributing Guide

---

### Phase 5 — Production Readiness (Weeks 9–10)

> **Goal**: Performance, security, CI/CD, and battle-tested stability.

#### 5.1 Performance
- [ ] Laravel Octane with FrankenPHP (optional high-perf mode)
- [ ] Redis caching: permissions, module registry, settings, theme config
- [ ] Database optimization: proper indexes on all foreign keys, PostgreSQL JSONB indexes
- [ ] API response caching with ETags
- [ ] Eager loading enforcement (prevent N+1 queries)
- [ ] Queue worker configuration for async jobs

#### 5.2 Security Hardening
- [ ] CSRF protection (SPA double-submit cookie)
- [ ] XSS prevention (all API responses escaped, CSP headers)
- [ ] SQL injection: Eloquent parameterized queries (enforce, no raw queries in modules)
- [ ] Rate limiting: per-token + per-IP + per-endpoint
- [ ] API token encryption at rest
- [ ] Secrets management via `.env` (never in DB)
- [ ] HTTPS enforcement in production
- [ ] Dependency vulnerability scanning (Composer audit + npm audit)

#### 5.3 CI/CD Pipeline (GitHub Actions)
- [ ] On push / PR:
  - `composer install` + `php artisan test` (PHPUnit/Pest)
  - `composer run phpstan` (static analysis, level 8)
  - `composer run pint` (Laravel code style)
  - `npm ci && npm run build` (frontend build)
  - `npm run lint` + `npm run typecheck` (ESLint + TypeScript)
- [ ] On merge to `main`:
  - Build production Docker image (optional)
  - Run full test suite
  - Tag release

#### 5.4 Testing Strategy
- [ ] **Core unit tests**: Services, Managers, Traits
- [ ] **Core feature tests**: every API endpoint (auth, CRUD, permissions)
- [ ] **Module isolation tests**: each module testable with `php artisan module:test {slug}`
- [ ] **Hook/Event integration tests**: verify module hooks fire correctly
- [ ] **MCP tests**: verify tool registration, execution, RBAC, HITL flow
- [ ] **Frontend**: Vitest (unit) + Playwright (E2E)
- [ ] **Target**: 80%+ code coverage on core

---

## Verification Plan

### Automated Tests
```bash
# Core backend tests
php artisan test

# Specific module tests
php artisan module:test contacts-crm

# Static analysis
./vendor/bin/phpstan analyse --level=8

# Code style
./vendor/bin/pint --test

# Frontend tests
cd themes/default && npm run test
cd themes/default && npm run e2e

# Full CI suite
composer run ci   # (alias for all backend checks)
```

### Manual Verification Checklist
- [ ] Fresh install via `composer install` + `php artisan setup` (no Docker)
- [ ] Fresh install via `docker compose up` (Docker path)
- [ ] Register first Super-Admin via API
- [ ] Create a dashboard module: `php artisan module:make TestModule --area=dashboard`
- [ ] Create an admin module: `php artisan module:make AwsConfig --area=admin`
- [ ] Install / Enable / Disable / Uninstall modules via API and Admin UI
- [ ] Verify dashboard module's menu items appear in Dashboard sidebar only
- [ ] Verify admin module's menu items appear in Admin sidebar only
- [ ] Verify a User without `testmodule.view` permission does NOT see it in Dashboard sidebar
- [ ] Verify a User with `testmodule.view` permission DOES see it in Dashboard sidebar
- [ ] Verify the module's permissions appear in role editor
- [ ] Verify hooks: dashboard module adds a widget to Dashboard, not Admin
- [ ] Create an AI-Agent token with scoped permissions
- [ ] Connect an MCP client and execute a read tool
- [ ] Execute a write tool → verify HITL approval flow
- [ ] Verify all mutations appear in audit logs with correct user/agent attribution
- [ ] Switch Dashboard theme and verify the Dashboard SPA loads correctly
- [ ] Switch Admin theme independently and verify Admin SPA loads correctly
- [ ] Verify health endpoint returns all green
