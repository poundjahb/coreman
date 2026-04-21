# Correspondence Management App

Initial implementation baseline for a Power Platform-oriented correspondence management application using TypeScript and Vite.

## Current Implementation Status

### Implemented now
- Project scaffold files for Vite + React + TypeScript.
- Foundation domain models for governance and user roles.
- Authentication mode exclusivity guard for APP and ENTRA modes.
- Explicit-user validation guard (registered, active, login-allowed).
- Access control helper functions.
- In-app configurable reference engine with scope precedence:
  - Branch + Department
  - Branch
  - Global
- Reference sequence rendering with token support:
  - ORG, BRANCH, DEPT, YYYY, YY, MM, DD, SEQn
- Intake module baseline that generates references in-app for receptionist flow.

### Implemented now (continued)
- **Platform Abstraction Layer (PAL) — Step 1 structural scaffold:**
  - `src/domain/correspondence.ts` — Correspondence domain entity with direction and status enums.
  - `src/platform/contracts/` — Repository and service contracts:
    - `ICorrespondenceRepository`, `IUserRepository`, `IBranchRepository`, `IDepartmentRepository`
    - `IReferenceConfigRepository`, `INotificationService`
  - `src/platform/IHostAdapter.ts` — Aggregated host adapter interface.
  - `src/platform/adapters/inMemory/` — Fully wired in-memory adapter backed by seed data.
  - `src/platform/adapters/dataverse/` — Dataverse adapter stub (raises not-implemented errors).
  - `src/platform/adapters/sqlite/` — SQLite adapter stub (raises not-implemented errors).
  - `src/platform/hostAdapterFactory.ts` — Factory that selects the adapter from `PlatformConfig`.
  - `src/config/systemConfig.ts` — Extended with `PlatformTarget` type and `platformConfig`.
- **Four-Layer Architecture — folder structure enforced:**
  - `src/ui/` (Layer 1) — React components (`src/ui/components/`), page screens (`src/ui/screens/`), and UI mock data (`src/ui/mocks/`).
  - `src/application/` (Layer 2) — Application logic: auth guards (`src/application/auth/`), domain use-case modules (`src/application/modules/`), and pure services (`src/application/services/`).
  - `src/domain/` (Layer 3) — Domain entities and value objects (unchanged).
  - `src/platform/` (Layer 4) — Host abstraction, repository contracts, and adapter implementations (unchanged).

### Not yet implemented
- Dataverse repository implementations (replace stubs).
- SQLite repository implementations (replace stubs).
- Power Automate flow triggers.
- Scheduler-based deadline monitoring flow integration.
- Complete action lifecycle UI and APIs.
- Dashboard modules.

## Phase Completion Criteria

### Phase 0 completion criteria
- Power Platform environment connectivity validated.
- Deployment identity and connector permissions validated.
- Baseline ALM deployment path to Dev/Test validated.

### Phase 1 completion criteria
- Only explicit active users can authenticate.
- Admin governance model and roles defined in domain model.
- Authentication mode exclusivity guard implemented.

### Phase 2 completion criteria
- In-app reference generation implemented with configurable precedence.
- Reference uniqueness strategy defined for atomic counter backend.
- Intake workflow persists correspondence and document attachments.

## Local Run Prerequisite
Node.js and npm are required but currently unavailable in this machine session. After installing Node LTS:

```powershell
npm install
cd .\scripts

# SQLITE (Electron + IPC)
.\start-sqlite.ps1

# IN_MEMORY (Vite web mode)
.\start-inmemory.ps1

# DATAVERSE (Vite web mode)
.\start-dataverse.ps1
```

Optional dispatcher scripts (default target is SQLITE):

```powershell
.\start.ps1 -Platform SQLITE
.\start.ps1 -Platform IN_MEMORY
.\start.ps1 -Platform DATAVERSE
```

Stop commands:

```powershell
.\stop-sqlite.ps1
.\stop-inmemory.ps1
.\stop-dataverse.ps1
```

The active platform is also exposed to the renderer with `VITE_PLATFORM_TARGET` and shown in the app header by a generated icon produced by each platform adapter.

## Next Implementation Target
- Implement Phase 2 persistence adapters (Dataverse repositories) and API contracts for app-triggered notification flows.
