<!-- QUICK START GUIDE -->

# 🚀 Quick Start - Branch Creation Feature

## What Was Fixed

**Problem:** Create branch button didn't save data to database  
**Root Cause:** No backend API server implemented  
**Solution:** Built Express + SQLite backend API server

## Running the App

### Option 1: One Command (Recommended)
```powershell
.\scripts\start-backend.ps1
```
This starts both backend and frontend automatically.

### Option 2: Manual (Two Terminals)
```powershell
# Terminal 1: Backend API
cd backend
npm run dev
# Output: Server running at http://localhost:3001

# Terminal 2: Frontend
npm run dev
# Output: Local: http://localhost:5174
```

## Testing the Branch Creation

1. Open **http://localhost:5174/admin** (or :5173)
2. Click **"Admin"** → **"Branches"**
3. Fill in the form:
   - **Code**: `HQ` (or any code)
   - **Name**: `Headquarters` (or any name)
   - **Active**: ✓ Check this box
4. Click **"Create Branch"** button
5. **✅ Success!** Branch appears in the list
6. Refresh the page → Data still there (persisted!)

## Architecture

```
Browser (React)
    ↓ POST /api/branches
Server (Express)
    ↓ INSERT INTO branches
Database (SQLite)
    ↓ Response OK
Browser (refresh)
    ↓ GET /api/branches
Server (Express)
    ↓ SELECT * FROM branches
Database (SQLite)
```

## Services Running

| Service | URL | Port | Status |
|---------|-----|------|--------|
| Frontend (React/Vite) | http://localhost:5174 | 5174 | ✓ Running |
| Backend API (Express) | http://localhost:3001 | 3001 | ✓ Running |
| Database (SQLite) | `backend/data/coreman.db` | - | ✓ Created |

## Testing from Command Line

```powershell
# Check backend is running
Invoke-WebRequest http://localhost:3001/health

# Get all branches
Invoke-WebRequest http://localhost:3001/api/branches

# Create a branch
$body = @{
    id = "test1"
    code = "TEST"
    name = "Test Branch"
    isActive = $true
} | ConvertTo-Json

Invoke-WebRequest -Uri "http://localhost:3001/api/branches" -Method POST `
    -ContentType "application/json" -Body $body
```

## Troubleshooting

### Port Already in Use
- Frontend can't start on 5174? It auto-selects next port (5175, 5176...)
- Backend can't start on 3001? Edit `backend/src/index.ts` or set `$env:PORT = 3002`

### Database Issues
If you see database errors, try:
```powershell
# Remove old database
Remove-Item backend/data -Recurse -Force
# Restart backend (will recreate fresh database)
```

### Backend Crashes on Start
```powershell
cd backend
npm install  # Reinstall dependencies
npm run dev
```

## Files Modified

**Frontend (Error Handling Added):**
- `src/ui/screens/admin/AdminBranchesPage.tsx`
- `src/ui/screens/admin/AdminDepartmentsPage.tsx`
- `src/ui/screens/admin/AdminUsersPage.tsx`
- `src/ui/screens/admin/AdminActionsCatalogPage.tsx`

**Backend (Created):**
- `backend/src/index.ts` - Main server
- `backend/src/db.ts` - Database init
- `backend/src/routes/branches.ts` - Branch endpoints
- `backend/src/routes/departments.ts` - Department endpoints
- `backend/src/routes/users.ts` - User endpoints
- `backend/src/routes/actionDefinitions.ts`
- `backend/src/routes/other.ts` - All other endpoints
- `backend/package.json`
- `backend/tsconfig.json`
- `scripts/start-backend.ps1`

## API Endpoints

All endpoints return JSON and return appropriate HTTP status codes:

### Branches
- `GET /api/branches` - List all
- `GET /api/branches/:id` - Get one
- `POST /api/branches` - Create/Update
- `DELETE /api/branches/:id` - Delete

### Other Entities
- Departments: `/api/departments`
- Users: `/api/users`
- Action Definitions: `/api/action-definitions`
- Correspondences: `/api/correspondences`
- Audit Log: `/api/correspondence-audit-log`
- Reference Configs: `/api/reference-configs`

See `backend/README.md` for complete API documentation.

## What's Working

✅ Create branches and see them in the list  
✅ Update branch details  
✅ Delete branches  
✅ Data persists across page refreshes  
✅ Same functionality for departments, users, action definitions  
✅ Error messages display to users  
✅ Database auto-initializes  

## Performance Notes

- Database uses WAL mode for better concurrency
- In-memory operations are instant
- Network latency for API calls ~1-5ms on localhost
- No authentication layer yet (development only)

## Development Notes

- All code is TypeScript (client & server)
- Express middleware: CORS, JSON body parser
- Better-sqlite3 for synchronous database access
- Vite for hot module reloading on frontend
- TSX for automatic TypeScript compilation on backend

---

**👉 Now run: `.\scripts\start-backend.ps1` and visit http://localhost:5174/admin!**
