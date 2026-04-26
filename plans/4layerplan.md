# Four-Layer Architecture Refactoring Plan

## Architecture Overview

The application is structured into four explicit layers, each represented by a top-level folder under `src/`. Each layer has a single responsibility and may only depend on layers below it.

```
src/
  ui/            Layer 1 — Presentation (React components and page screens)
  application/   Layer 2 — Application Logic (use cases, services, auth)
  domain/        Layer 3 — Domain (entities, value objects, contracts)
  platform/      Layer 4 — Host Abstraction (adapter interfaces and implementations)
  config/        Cross-cutting configuration (shared by all layers)
```

### Layer 1 – UI (`src/ui/`)
Pure React presentation code. No business logic.
- `src/ui/components/` — shared UI components (KpiCard, DataRow, etc.)
- `src/ui/screens/` — page-level screen components routed by React Router
- `src/ui/screens/admin/` — admin page scaffolds
- `src/ui/mocks/` — static UI mock data for development and demo display

### Layer 2 – Application (`src/application/`)
Orchestrates domain logic and calls into the host adapter. No direct React imports.
- `src/application/auth/` — authentication mode guards and user validation
- `src/application/modules/admin/` — seed data for in-memory bootstrap
- `src/application/modules/intake/` — receptionist intake use case
- `src/application/services/` — pure domain-logic services (referenceEngine, accessControl)

### Layer 3 – Domain (`src/domain/`)
Plain TypeScript types and interfaces. No framework dependencies.
- `src/domain/correspondence.ts` — Correspondence entity, direction, status
- `src/domain/governance.ts` — AppUser, Branch, Department, SystemConfig, roles
- `src/domain/reference.ts` — reference format config, context, SequenceStore

### Layer 4 – Host Abstraction (`src/platform/`)
Repository and service contracts plus adapter implementations. Depends only on domain types.
- `src/platform/contracts/` — ICorrespondenceRepository, IUserRepository, IBranchRepository,
  IDepartmentRepository, IReferenceConfigRepository, INotificationService
- `src/platform/IHostAdapter.ts` — aggregated host adapter interface
- `src/platform/hostAdapterFactory.ts` — selects adapter from PlatformConfig
- `src/platform/adapters/inMemory/` — fully wired in-memory adapter
- `src/platform/adapters/dataverse/` — Dataverse adapter stub
- `src/platform/adapters/sqlite/` — SQLite adapter stub

---

## Files to Move

| Current path | New path |
|---|---|
| `src/components/*` | `src/ui/components/*` |
| `src/screens/*` | `src/ui/screens/*` |
| `src/mocks/*` | `src/ui/mocks/*` |
| `src/auth/*` | `src/application/auth/*` |
| `src/modules/*` | `src/application/modules/*` |
| `src/services/*` | `src/application/services/*` |

`src/domain/`, `src/platform/`, and `src/config/` are already correctly placed and are not moved.

---

## Import Path Changes After Move

### `src/App.tsx`
| Old import | New import |
|---|---|
| `"./services/accessControl"` | `"./application/services/accessControl"` |
| `"./modules/admin/seedData"` | `"./application/modules/admin/seedData"` |
| `"./components/AccessDeniedState"` | `"./ui/components/AccessDeniedState"` |
| `"./screens/..."` | `"./ui/screens/..."` |

### `src/ui/screens/*.tsx` (moved screens)
| Old import | New import |
|---|---|
| `"../components/..."` | `"../components/..."` (unchanged – both in `src/ui/`) |
| `"../mocks/uiData"` | `"../mocks/uiData"` (unchanged – both in `src/ui/`) |
| `"../auth/..."` | `"../../application/auth/..."` |
| `"../modules/..."` | `"../../application/modules/..."` |
| `"../services/..."` | `"../../application/services/..."` |
| `"../config/..."` | `"../../config/..."` |
| `"../domain/..."` | `"../../domain/..."` |

### `src/application/modules/intake/registerCorrespondence.ts` (moved module)
| Old import | New import |
|---|---|
| `"../../domain/..."` | `"../../../domain/..."` |
| `"../../services/..."` | `"../services/..."` (unchanged depth within application/) |

### `src/application/modules/admin/seedData.ts` (moved module)
| Old import | New import |
|---|---|
| `"../../domain/..."` | `"../../../domain/..."` |

### `src/application/services/referenceEngine.ts` (moved service)
| Old import | New import |
|---|---|
| `"../domain/..."` | `"../../domain/..."` |

### `src/application/services/accessControl.ts` (moved service)
| Old import | New import |
|---|---|
| `"../domain/..."` | `"../../domain/..."` |

### `src/application/auth/modeGuard.ts` (moved auth)
| Old import | New import |
|---|---|
| `"../domain/..."` | `"../../domain/..."` |

### `src/platform/adapters/inMemory/InMemoryHostAdapter.ts`
| Old import | New import |
|---|---|
| `"../../../services/referenceEngine"` | `"../../../application/services/referenceEngine"` |
| `"../../../modules/admin/seedData"` | `"../../../application/modules/admin/seedData"` |

---

## Implementation Steps

1. Create all new directories.
2. Move files (copy + delete) in dependency order: domain → application → ui.
3. Update all import paths file by file.
4. Verify TypeScript compilation with `npm run build` or `tsc --noEmit`.
5. Remove now-empty old directories.
6. Update `README.md` to reflect new structure.
