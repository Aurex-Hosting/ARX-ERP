# 📖 ARX-ERP Enterprise — REST API Documentation (v1)

Welcome to the **ARX-ERP Enterprise API (v1)** reference documentation. All API endpoints follow RESTful design patterns, accept JSON or `multipart/form-data` request payloads, and return standardized JSON responses.

---

## 📑 Table of Contents
1. [General Concepts & Authentication](#1-general-concepts--authentication)
2. [Authentication & Account Management](#2-authentication--account-management)
3. [Two-Factor Authentication (2FA)](#3-two-factor-authentication-2fa)
4. [User Profile & Media](#4-user-profile--media)
5. [Login History & Session Security](#5-login-history--session-security)
6. [Notifications & Emoji Reactions](#6-notifications--emoji-reactions)
7. [System Health, Navigation & Public Settings](#7-system-health-navigation--public-settings)
8. [Model Context Protocol (MCP) & AI Agent API](#8-model-context-protocol-mcp--ai-agent-api)
9. [Settings Management](#9-settings-management)
10. [Admin: User Management](#10-admin-user-management)
11. [Admin: Roles & Permissions (RBAC)](#11-admin-roles--permissions-rbac)
12. [Admin: Module Management](#12-admin-module-management)
13. [Admin: Themes, Branding & Quick Links](#13-admin-themes-branding--quick-links)
14. [Admin: Backup & Disaster Recovery](#14-admin-backup--disaster-recovery)

---

## 1. General Concepts & Authentication

### Base URL
```
https://your-domain.com/api/v1
```

### Authentication Header
Protected endpoints require a Sanctum Bearer token in the `Authorization` header:
```http
Authorization: Bearer <your_access_token>
Accept: application/json
```

### Standard Response Formats
- **Success (200 / 201)**:
  ```json
  {
    "message": "Action completed successfully",
    "data": { ... }
  }
  ```
- **Validation Error (422)**:
  ```json
  {
    "message": "The given data was invalid.",
    "errors": {
      "email": ["The email has already been taken."]
    }
  }
  ```
- **Unauthorized (401) / Forbidden (403)**:
  ```json
  {
    "message": "Unauthenticated."
  }
  ```

---

## 2. Authentication & Account Management

### Register Account
`POST /api/v1/auth/register`
- **Body**:
  ```json
  {
    "name": "John Doe",
    "email": "john@example.com",
    "password": "Password123!",
    "password_confirmation": "Password123!"
  }
  ```
- **Response (201)**:
  ```json
  {
    "message": "Registration successful.",
    "token": "1|sanctum_token_string...",
    "user": { "id": 1, "name": "John Doe", "email": "john@example.com" }
  }
  ```

### User Login
`POST /api/v1/auth/login`
- **Body**:
  ```json
  {
    "email": "john@example.com",
    "password": "Password123!"
  }
  ```
- **Response (200)**:
  ```json
  {
    "message": "Login successful.",
    "token": "2|sanctum_token_string...",
    "two_factor_required": false,
    "user": { "id": 1, "name": "John Doe", "is_super_admin": true }
  }
  ```

### Logout
`POST /api/v1/auth/logout` *(Auth Required)*
- Revokes current access token.

### Password Reset Request
`POST /api/v1/auth/forgot-password`
- **Body**: `{ "email": "john@example.com" }`

### Complete Password Reset
`POST /api/v1/auth/reset-password`
- **Body**:
  ```json
  {
    "token": "reset_token_string",
    "email": "john@example.com",
    "password": "NewPassword123!",
    "password_confirmation": "NewPassword123!"
  }
  ```

---

## 3. Two-Factor Authentication (2FA)

### Verify 2FA at Login
`POST /api/v1/auth/2fa/verify`
- **Body**:
  ```json
  {
    "two_factor_token": "temp_session_token",
    "code": "123456"
  }
  ```

### Setup 2FA
`GET /api/v1/auth/2fa/setup` *(Auth Required)*
- Returns QR code SVG, secret key, and emergency recovery codes.

### Confirm 2FA Activation
`POST /api/v1/auth/2fa/confirm` *(Auth Required)*
- **Body**: `{ "code": "123456" }`

### Disable 2FA
`POST /api/v1/auth/2fa/disable` *(Auth Required)*
- **Body**: `{ "password": "CurrentPassword123!" }`

---

## 4. User Profile & Media

### Get Current User Profile
`GET /api/v1/auth/profile` *(Auth Required)*

### Update Profile
`PUT /api/v1/auth/profile` *(Auth Required)*
- **Body**:
  ```json
  {
    "name": "Jane Doe",
    "phone": "+1234567890",
    "job_title": "Lead Architect",
    "bio": "Building scalable software."
  }
  ```

### Change Password
`PUT /api/v1/auth/password` *(Auth Required)*
- **Body**:
  ```json
  {
    "current_password": "OldPassword123!",
    "password": "NewPassword123!",
    "password_confirmation": "NewPassword123!"
  }
  ```

### Upload Profile Avatar / Banner
`POST /api/v1/auth/profile/avatar` *(Auth Required, multipart/form-data)*
- **File field**: `avatar` (Images up to 5MB: PNG, JPG, SVG, WEBP).

`POST /api/v1/auth/profile/banner` *(Auth Required, multipart/form-data)*
- **File field**: `banner` (Images up to 10MB).

---

## 5. Login History & Session Security

### Get User Login History
`GET /api/v1/auth/login-history` *(Auth Required)*
- Returns list of recent sessions, IP addresses, user agents, active status, and geographical indicators.

### Revoke Specific Session
`POST /api/v1/auth/login-history/{id}/revoke` *(Auth Required)*

### Revoke All Other Sessions
`POST /api/v1/auth/login-history/revoke-other` *(Auth Required)*

---

## 6. Notifications & Emoji Reactions

### List Notifications
`GET /api/v1/notifications` *(Auth Required)*
- **Query Params**: `per_page` (default: 15), `status` (`unread` or `all`), `category` (`system`, `login_alert`, `module`).

### Get Unread Count
`GET /api/v1/notifications/unread-count` *(Auth Required)*

### Mark Notification as Read
`POST /api/v1/notifications/{id}/read` *(Auth Required)*

### Mark All as Read
`POST /api/v1/notifications/mark-all-read` *(Auth Required)*

### React with Emoji
`POST /api/v1/notifications/{id}/react` *(Auth Required)*
- **Body**: `{ "emoji": "thumbs_up" }` (e.g., `fire`, `thumbs_up`, `smile`, `heart`).

### Delete Notification
`DELETE /api/v1/notifications/{id}` *(Auth Required)*

---

## 7. System Health, Navigation & Public Settings

### System Health
`GET /api/v1/health`
- Returns status of database connection, cache driver, storage writable state, memory consumption, and system timestamp.

### Public General Settings
`GET /api/v1/general-settings`
- Returns company branding, logo URLs, dark/light auth backgrounds, site titles, and header/login quick links.

### Active Theme Configuration
`GET /api/v1/theme/config`
- Returns color palettes, typography, UI scale, and custom CSS variables of active dashboard theme.

### Dynamic Navigation Tree
`GET /api/v1/navigation` *(Auth Required)*
- Returns filtered navigation tree conforming to user's assigned permissions and active module routes.

---

## 8. Model Context Protocol (MCP) & AI Agent API

### List Registered MCP Tools
`GET /api/v1/mcp/tools` *(Auth Required)*
- Returns tool definitions with JSON-schema parameter specifications.

### List MCP Resources
`GET /api/v1/mcp/resources` *(Auth Required)*
- Returns available system resource URIs and schemas.

### List MCP Prompts
`GET /api/v1/mcp/prompts` *(Auth Required)*
- Returns registered AI workflow prompts.

### Execute MCP Tool
`POST /api/v1/mcp/execute` *(Auth Required)*
- **Body**:
  ```json
  {
    "tool": "system_diagnostics",
    "parameters": {
      "include_logs": true
    }
  }
  ```

---

## 9. Settings Management

### Read Single Setting
`GET /api/v1/settings/{key}` *(Auth Required)*

### Read Setting Group
`GET /api/v1/settings/group/{group}` *(Auth Required)*

### Super-Admin Update Setting
`PUT /api/v1/admin/settings/{key}` *(Super-Admin / Permission Required)*
- **Body**:
  ```json
  {
    "value": "custom_value",
    "group": "system",
    "type": "string"
  }
  ```

---

## 10. Admin: User Management

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/v1/admin/users` | List users with pagination and search |
| `POST` | `/api/v1/admin/users` | Create user or AI Agent |
| `GET` | `/api/v1/admin/users/{id}` | View single user details |
| `PUT` | `/api/v1/admin/users/{id}` | Update user details & role assignments |
| `DELETE` | `/api/v1/admin/users/{id}` | Soft delete user |
| `GET` | `/api/v1/admin/users/trash` | List soft-deleted users in trash |
| `POST` | `/api/v1/admin/users/{id}/restore` | Restore soft-deleted user |
| `DELETE` | `/api/v1/admin/users/{id}/force` | Permanently delete user |
| `PUT` | `/api/v1/admin/users/{id}/toggle-status` | Toggle user active / suspended status |
| `POST` | `/api/v1/admin/users/{id}/disable-2fa` | Admin override to disable 2FA |
| `PUT` | `/api/v1/admin/users/{id}/password` | Admin reset password |

---

## 11. Admin: Roles & Permissions (RBAC)

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/v1/admin/roles` | List all roles with user counts |
| `POST` | `/api/v1/admin/roles` | Create new role with permissions |
| `GET` | `/api/v1/admin/roles/{id}` | Show role details and permissions |
| `PUT` | `/api/v1/admin/roles/{id}` | Update role details and permissions |
| `DELETE` | `/api/v1/admin/roles/{id}` | Delete custom role |
| `GET` | `/api/v1/admin/permissions` | List all available categorized permissions |

---

## 12. Admin: Module Management

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/v1/admin/modules` | List installed & discovered modules |
| `POST` | `/api/v1/admin/modules/create` | Create custom module metadata |
| `POST` | `/api/v1/admin/modules/generate-starter` | Generate starter scaffold module |
| `POST` | `/api/v1/admin/modules/upload` | Upload and unpack `.zip` module archive |
| `GET` | `/api/v1/admin/modules/{slug}/export` | Export module package as `.zip` archive |
| `POST` | `/api/v1/admin/modules/{slug}/install` | Run module migrations & seeders |
| `POST` | `/api/v1/admin/modules/{slug}/enable` | Enable module in system |
| `POST` | `/api/v1/admin/modules/{slug}/disable` | Disable module in system |
| `DELETE` | `/api/v1/admin/modules/{slug}` | Uninstall module and rollback schema |
| `DELETE` | `/api/v1/admin/modules/{slug}/disk` | Delete module files completely from disk |

---

## 13. Admin: Themes, Branding & Quick Links

### Fetch Themes Catalog
`GET /api/v1/admin/themes`
- **Query Params**: `area` (`dashboard` or `admin`).

### Activate Theme
`POST /api/v1/admin/themes/{slug}/activate`
- **Body**: `{ "area": "dashboard" }`

### Get General Branding Settings
`GET /api/v1/admin/theme/general-settings`

### Save General Branding & Quick Links
`POST /api/v1/admin/theme/general-settings` *(multipart/form-data)*
- **Fields**:
  - `company_name`: (string)
  - `copyright_text`: (string)
  - `site_title_dashboard`: (string)
  - `site_title_admin`: (string)
  - `logo_dark`: (file upload)
  - `logo_light`: (file upload)
  - `favicon`: (file upload)
  - `auth_bg_dark`: (file upload)
  - `auth_bg_light`: (file upload)
  - `remove_assets`: (comma-separated keys, e.g. `logo_dark,favicon`)
  - `quick_links_topbar`: (JSON string array of objects: `[{"id":"top_1","name":"Docs","url":"https://docs.example.com"}]`)
  - `quick_links_login`: (JSON string array of objects: `[{"id":"login_1","name":"Terms","url":"https://example.com/terms"}]`)

### Upload Single Branding Asset
`POST /api/v1/admin/theme/general-settings/upload` *(multipart/form-data)*
- **Fields**: `asset_type` (`logo_dark`, `logo_light`, `favicon`, `auth_bg_dark`, `auth_bg_light`), `file` (image).

### Remove Branding Asset
`DELETE /api/v1/admin/theme/general-settings/asset/{assetType}`

---

## 14. Admin: Backup & Disaster Recovery

### List Backups & Diagnostics
`GET /api/v1/admin/backups`
- Returns backup archive list, disk space stats, auto-backup status, and scheduled execution time.

### Create Manual Backup
`POST /api/v1/admin/backups`
- Creates full database snapshot & public storage backup `.zip`.

### Download Backup Archive
`GET /api/v1/admin/backups/{filename}/download`

### Delete Backup Archive
`DELETE /api/v1/admin/backups/{filename}`

### Configure Scheduled Auto-Backup
`POST /api/v1/admin/backups/schedule`
- **Body**:
  ```json
  {
    "enabled": true,
    "time": "02:30"
  }
  ```
