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

### Not yet implemented
- Dataverse integration and persistence.
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
npm run dev
```

## Next Implementation Target
- Implement Phase 2 persistence adapters (Dataverse repositories) and API contracts for app-triggered notification flows.
