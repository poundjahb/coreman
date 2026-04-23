# Correspondence Management Backend API

Backend REST API server for the Correspondence Management application. Handles persistence of all data entities (branches, departments, users, correspondences, etc.) using SQLite.

## Architecture

- **Framework:** Express.js
- **Database:** SQLite 3
- **Language:** TypeScript
- **Port:** 3001

## Prerequisites

- Node.js LTS
- npm

## Installation

```powershell
cd src/platform/adapters/sqlite/server
npm install
```

## Development

Run with auto-reload on file changes:

```powershell
npm run dev
```

The server will start at `http://localhost:3001` and watch for changes.

## Production Build

```powershell
npm run build
npm start
```

## API Endpoints

### Branches
- `GET /api/branches` - List all branches
- `GET /api/branches/:id` - Get branch by ID
- `POST /api/branches` - Create/update branch
- `DELETE /api/branches/:id` - Delete branch

### Departments
- `GET /api/departments` - List all departments
- `GET /api/departments/:id` - Get department by ID
- `POST /api/departments` - Create/update department
- `DELETE /api/departments/:id` - Delete department

### Users
- `GET /api/users` - List all users
- `GET /api/users?branchId=xxx` - List users by branch
- `GET /api/users/:id` - Get user by ID
- `POST /api/users` - Create/update user
- `DELETE /api/users/:id` - Delete user

### Action Definitions
- `GET /api/action-definitions` - List all action definitions
- `GET /api/action-definitions/active` - List active action definitions
- `GET /api/action-definitions/:id` - Get action definition by ID
- `POST /api/action-definitions` - Create/update action definition
- `DELETE /api/action-definitions/:id` - Delete action definition

### Correspondences
- `GET /api/correspondences` - List all correspondences
- `GET /api/correspondences?branchId=xxx` - List by branch
- `GET /api/correspondences/:id` - Get correspondence by ID
- `POST /api/correspondences` - Create correspondence
- `PATCH /api/correspondences/:id` - Update correspondence

### Audit Log
- `GET /api/correspondence-audit-log?correspondenceId=xxx` - Get audit events
- `POST /api/correspondence-audit-log` - Create audit event

### Other
- `GET /health` - Health check
- `GET /api/reference-configs` - List reference configurations
- `GET /api/reference-configs/active` - List active reference configurations
- `GET /api/smtp-settings` - Get SMTP settings
- `PUT /api/smtp-settings` - Update SMTP settings
- `POST /api/smtp-settings/test` - Send test email
- `POST /api/notifications` - Send notification
- `POST /api/sequences/next` - Get next sequence number
- `POST /api/post-capture-workflow/execute` - Execute post-capture workflow

## Database

The database file is stored at `src/platform/adapters/sqlite/server/data/coreman.db` and is automatically initialized on first run with all required tables.

### Schema

- **branches** - Organization branches
- **departments** - Departments within branches
- **users** - Application users
- **user_roles** - User role assignments
- **correspondences** - Correspondence records
- **action_definitions** - Reusable correspondence actions
- **reference_configs** - Reference number generation configurations
- **correspondence_audit_log** - Audit trail for correspondences

## Starting the Full Application

From the project root:

```powershell
# Using the integrated startup script
.\scripts\start-backend.ps1

# Or run frontend and backend separately
# Terminal 1 (Backend):
cd src/platform/adapters/sqlite/server
npm run dev

# Terminal 2 (Frontend):
npm run dev
# Set VITE_API_BASE_URL=http://localhost:3001
# Set VITE_PLATFORM_TARGET=SERVER
```

## Troubleshooting

### Port 3001 already in use
Change the PORT environment variable:
```powershell
$env:PORT = 3002
npm run dev
```

### Database locked
The application uses WAL (Write-Ahead Logging) for better concurrency. If you encounter a locked database error:
1. Close all instances of the application
2. Delete `src/platform/adapters/sqlite/server/data/coreman.db-shm` and `src/platform/adapters/sqlite/server/data/coreman.db-wal`
3. Restart the server

### Missing database file
The database is created automatically on first run. If it's missing, simply restart the server.

## Development Notes

- All timestamps are stored in ISO 8601 format (UTC)
- Boolean values are stored as 0/1 in SQLite and converted to proper booleans in JSON responses
- Validation should be consistent with the frontend domain models
- CORS is enabled for localhost (configurable)
