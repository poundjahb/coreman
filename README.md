# Correspondence Management App

Correspondence Management is a React + TypeScript application built with Vite and a host-adapter architecture.
In day-to-day development, the app runs in SERVER mode with a Node/Express backend and SQLite persistence.

## Current Status

### Implemented
- Role-aware UI flows for receptionist, recipient/action owner, dashboard viewer, and admin users.
- Four-layer structure:
  - `src/ui` for screens/components
  - `src/application` for use cases/services
  - `src/domain` for entities and rules
  - `src/platform` for adapters/contracts
- Runtime platform targeting (`SERVER`, `SQLITE`, `IN_MEMORY`, `DATAVERSE`) via `VITE_PLATFORM_TARGET`.
- Host adapter factory and runtime adapter wiring.
- In-app reference generation with precedence (branch+department, branch, global) and tokenized sequences.
- Startup bootstrap of core records (branch/department/admin user) when needed.
- Correspondence registration and repository-backed listing/search/history/dashboard views.
- Attachment upload (single-file MVP) at registration time in SERVER+SQLite mode.
- Attachment storage and metadata persistence in SQLite server mode.
- Attachment download endpoint and inline preview endpoint.
- Correspondence details drawer with attachment actions:
  - PDF files: open in large modal viewer.
  - Non-PDF files: download.
- PDF preview with pagination and zoom controls (zoom in/out/reset).

### Not Yet Implemented / Partial
- Dataverse adapter operations are still stubbed and raise not-implemented errors.
- Electron main/preload packaging is not the active runtime path for current dev flow.
- Advanced task queue backend integration is still pending.

## Runtime Modes

- `SERVER`: Frontend (Vite) + backend API.
- `SQLITE`: Convenience launcher that runs SERVER mode with SQLite provider env.
- `IN_MEMORY`: Frontend using in-memory adapter.
- `DATAVERSE`: Frontend using Dataverse adapter stubs.

## Local Development (Windows)

Prerequisites:
- Node.js LTS
- npm

Install dependencies from repository root:

```powershell
npm install
```

Recommended run command (from `scripts`):

```powershell
cd .\scripts
.\start-sqlite.ps1
```

This starts:
- Frontend: http://localhost:5173
- Backend: http://localhost:3001

Other launchers:

```powershell
cd .\scripts

.\start-server.ps1
.\start-inmemory.ps1
.\start-dataverse.ps1

# Dispatcher
.\start.ps1 -Platform SERVER
.\start.ps1 -Platform SQLITE
.\start.ps1 -Platform IN_MEMORY
.\start.ps1 -Platform DATAVERSE
```

Stop scripts:

```powershell
cd .\scripts

.\stop-server.ps1
.\stop-sqlite.ps1
.\stop-inmemory.ps1
.\stop-dataverse.ps1
```

## Notes on Attachments and PDF Preview

- Upload constraints currently enforced in SQLite server route layer:
  - single file
  - max size 10 MB
  - allowed MIME types: PDF, PNG, JPEG, TIFF
- Files are stored under the SQLite server data folder and linked via correspondence metadata.
- Preview route serves inline content for supported PDF rendering in the modal viewer.

## Testing and Build

From repository root:

```powershell
npm test
npm run build
```
