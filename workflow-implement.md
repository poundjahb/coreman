
# Workflow Plugin Engine - Implementation Plan

## Goal
Implement a pluggable workflow execution engine where:
1. Workflow plugins are discovered from a dedicated folder at runtime.
2. Plugins are platform-aware (SERVER, POWERAPP).
3. Admin users can assign plugins to correspondence events and actions.
4. Plugins are discoverable by name and description.
5. Production does not require rebuilding the main app when adding/updating plugins.

---

## Scope and Principles

### In Scope
1. Plugin discovery and registry.
2. Plugin metadata validation.
3. Event/action binding model.
4. Runtime execution engine.
5. Admin UI for discovery and assignment.
6. Auditing and failure handling.
7. Packaging strategy: author in TS, compile to JS artifact, copy to production.

### Out of Scope (Phase 1)
1. Full sandboxing/VM isolation.
2. Remote plugin download.
3. Multi-tenant plugin permission policies.
4. Visual workflow designer.

---

## Current Integration Points (Existing)

1. Post-capture workflow trigger:
   - src/application/modules/intake/registerCorrespondence.ts
2. Workflow contract:
   - src/platform/contracts/IPostCaptureWorkflowService.ts
3. Action definition workflow fields:
   - src/domain/correspondenceAction.ts
4. Admin flow page placeholder:
   - src/ui/screens/admin/AdminFlowAgentsPage.tsx
5. Server execution endpoint:
   - src/platform/adapters/sqlite/server/src/routes/other.ts

---

## Target Architecture

### 1. Plugin Artifact (Production-Ready)
Each plugin is deployed as a folder containing:
1. plugin.json
2. index.mjs (compiled JS)

Example folder:
- plugins/SERVER/notify-owner/
  - plugin.json
  - index.mjs

### 2. Manifest Schema (plugin.json)
Required fields:
1. pluginKey: string (globally unique)
2. name: string
3. description: string
4. version: string
5. apiVersion: string (for compatibility)
6. platformTarget: "SERVER" | "POWERAPP"
7. supportedTriggers: string[] (event/action trigger codes)
8. entryFile: string (e.g., "index.mjs")
9. enabledByDefault: boolean

### 3. Runtime Module Contract
Compiled module must export:
1. metadata (normalized plugin metadata)
2. execute(context): Promise<PluginExecutionResult>

### 4. Binding Model
Two assignment types:
1. EVENT binding: eventCode -> pluginKey
2. ACTION binding: actionDefinitionId -> pluginKey

Priority rules:
1. Exact ACTION binding wins for action execution.
2. EVENT binding used for event-driven triggers.
3. If no binding exists, use fallback legacy behavior (Phase 1 compatibility).

---

## Data Model Changes (SQLite)

### Table: workflow_plugins
Columns:
1. pluginKey TEXT PRIMARY KEY
2. name TEXT NOT NULL
3. description TEXT NOT NULL
4. version TEXT NOT NULL
5. apiVersion TEXT NOT NULL
6. platformTarget TEXT NOT NULL
7. supportedTriggersJson TEXT NOT NULL
8. entryFile TEXT NOT NULL
9. sourcePath TEXT NOT NULL
10. checksum TEXT NOT NULL
11. isEnabled INTEGER NOT NULL DEFAULT 1
12. isValid INTEGER NOT NULL DEFAULT 1
13. validationErrorsJson TEXT
14. discoveredAt TEXT NOT NULL
15. updatedAt TEXT NOT NULL

### Table: workflow_bindings
Columns:
1. id TEXT PRIMARY KEY
2. bindingType TEXT NOT NULL ("EVENT" | "ACTION")
3. triggerCode TEXT
4. actionDefinitionId TEXT
5. pluginKey TEXT NOT NULL
6. priority INTEGER NOT NULL DEFAULT 100
7. isActive INTEGER NOT NULL DEFAULT 1
8. createdBy TEXT NOT NULL
9. updatedBy TEXT NOT NULL
10. createdAt TEXT NOT NULL
11. updatedAt TEXT NOT NULL

Constraints:
1. CHECK bindingType rules:
   - EVENT requires triggerCode, actionDefinitionId NULL
   - ACTION requires actionDefinitionId, triggerCode NULL
2. FOREIGN KEY pluginKey -> workflow_plugins(pluginKey)

Indexes:
1. idx_workflow_plugins_platform_enabled(platformTarget, isEnabled)
2. idx_workflow_bindings_type_active(bindingType, isActive)
3. idx_workflow_bindings_trigger(triggerCode)
4. idx_workflow_bindings_action(actionDefinitionId)

---

## Server Components to Add

### 1. Plugin Discovery Service
Responsibilities:
1. Scan plugins root folder by platform.
2. Read and validate plugin.json.
3. Verify entry file exists.
4. Upsert discovery records in workflow_plugins.
5. Mark invalid plugins with reason.

Suggested location:
- src/platform/adapters/sqlite/server/src/workflows/discovery.ts

### 2. Plugin Loader Service
Responsibilities:
1. Dynamically import compiled module from entry file.
2. Validate required exports.
3. Cache loaded modules by checksum/path.
4. Reload on explicit refresh.

Suggested location:
- src/platform/adapters/sqlite/server/src/workflows/loader.ts

### 3. Execution Engine
Responsibilities:
1. Resolve binding for trigger.
2. Resolve plugin metadata + module.
3. Build execution context with platform resources.
4. Execute with timeout.
5. Write audit logs for call/response/failure.

Suggested location:
- src/platform/adapters/sqlite/server/src/workflows/engine.ts

### 4. Resource Provider (Platform-Aware)
Expose limited safe resources:
1. audit.append(...)
2. notifications.send(...)
3. actionDefinitions.find(...)
4. correspondences.find(...)
5. config.get(...)
6. http.fetch(...) with timeout/allowlist (optional)

Suggested location:
- src/platform/adapters/sqlite/server/src/workflows/resources.ts

---

## API Endpoints to Add

### Discovery and Catalog
1. GET /api/workflow-plugins
2. POST /api/workflow-plugins/refresh
3. PATCH /api/workflow-plugins/:pluginKey/enabled

### Bindings
1. GET /api/workflow-bindings
2. POST /api/workflow-bindings
3. PATCH /api/workflow-bindings/:id
4. DELETE /api/workflow-bindings/:id

### Optional Diagnostics
1. GET /api/workflow-executions?correspondenceId=...
2. POST /api/workflow-executions/test

---

## UI Changes (Admin)

### Admin Flow and Agents Page
Replace placeholder with:
1. Summary cards:
   - Discovered Plugins
   - Active Bindings
   - Recent Failures
2. Plugin table:
   - Name, Description, Version, Platform, Valid, Enabled
3. Binding management:
   - Tab EVENT: bind event codes to plugin
   - Tab ACTION: bind action definitions to plugin
4. Refresh action:
   - Trigger plugin folder rescan
5. Validation display:
   - Show invalid plugin reasons

Target file:
- src/ui/screens/admin/AdminFlowAgentsPage.tsx

### Reuse Existing Admin Actions Catalog
1. Keep action definition CRUD unchanged.
2. ACTION bindings reference existing actionDefinitionId.

---

## Trigger Integration

### Post-Capture Event
In post-capture endpoint logic:
1. Build trigger request for event code CORRESPONDENCE_CREATED.
2. Call workflow engine executeByEvent(...).
3. Preserve existing notification fallback until migration complete.

### Assignment/Event Integration
Where assignment workflow currently runs:
1. Map to event code ASSIGNMENT_CREATED or action trigger.
2. Delegate to workflow engine.
3. Keep current behavior as fallback if no active binding.

---

## Compatibility and Migration

### Phase 1
1. Add plugin registry + bindings + admin UI.
2. Keep legacy mode BASIC/EXTENDED operational.
3. Engine executes only when binding exists.

### Phase 2
1. Migrate post-capture to plugin-first.
2. Migrate assignment workflow to plugin-first.
3. Reduce legacy branches after rollout validation.

---

## Build and Deployment Strategy

### Authoring (Dev)
1. Plugins authored in TypeScript in separate plugin SDK/project.
2. Build command compiles plugin to ESM JS artifact.

Artifact output:
1. plugin.json
2. index.mjs

### Production Deploy
1. Copy plugin folder into configured plugin root.
2. Call /api/workflow-plugins/refresh (or use Admin refresh button).
3. Assign plugin through admin bindings.
4. No rebuild of main production app required.

---

## Config

Add server env settings:
1. COREMAN_WORKFLOW_PLUGIN_ROOT (default: ./plugins)
2. COREMAN_WORKFLOW_PLATFORM_TARGET (default: SERVER)
3. COREMAN_WORKFLOW_PLUGIN_TIMEOUT_MS (default: 15000)
4. COREMAN_WORKFLOW_STRICT_MODE (default: false)
5. COREMAN_WORKFLOW_ALLOWED_API_VERSION (default: 1.x)

---

## Security and Reliability Guardrails

1. Validate manifest and exports before enabling.
2. Enforce execution timeout.
3. Catch and audit all plugin exceptions.
4. Keep allowlist of exposed resources (no raw DB object in plugin context).
5. Optional checksum verification on artifact.
6. Disable plugin automatically after repeated failures (optional Phase 2).

---

## Observability

For each plugin run, log:
1. pluginKey
2. trigger type/code
3. correspondenceId
4. actorId
5. start/end timestamp
6. durationMs
7. status (SUCCESS/FAILED/SKIPPED)
8. error summary (if failed)

Persist in:
1. existing audit log with structured payload
2. optional dedicated workflow_execution_log table (Phase 2)

---

## Testing Plan

### Unit Tests
1. Manifest validation.
2. Binding resolution precedence.
3. Loader export validation.
4. Timeout behavior.
5. Error handling and audit emission.

### Integration Tests
1. Discovery from plugin folder.
2. Refresh endpoint updates catalog.
3. Event trigger executes assigned plugin.
4. Action trigger executes assigned plugin.
5. Invalid plugin is listed but not executable.

### Manual UAT
1. Drop new plugin artifact in folder.
2. Refresh from admin.
3. Bind plugin to event/action.
4. Trigger correspondence flow.
5. Confirm audit/result visibility.

---

## Step-by-Step Implementation Actions

1. Add DB schema changes for workflow_plugins and workflow_bindings.
2. Add repository helpers for plugin catalog and bindings.
3. Implement discovery service.
4. Implement dynamic module loader with cache.
5. Implement workflow execution engine with timeout + auditing.
6. Add API routes for plugins and bindings.
7. Integrate engine into post-capture and assignment trigger points.
8. Replace AdminFlowAgentsPage placeholder with real UI.
9. Add refresh and binding forms in admin UI.
10. Add tests (unit + integration) for discovery/load/execute/bind.
11. Validate backward compatibility with existing BASIC/EXTENDED flow.
12. Document deploy runbook for plugin artifact copy + refresh.

---

## Agent Task Breakdown (Reusable Prompts)

### Prompt A: DB + Backend Foundations
Implement schema, repositories, discovery service, loader, and core workflow engine with tests.

### Prompt B: API Layer
Implement /api/workflow-plugins and /api/workflow-bindings endpoints with validation and error handling.

### Prompt C: Runtime Integration
Wire engine into post-capture and assignment workflows with legacy fallback behavior.

### Prompt D: Admin UI
Implement plugin catalog, refresh action, and event/action binding management in AdminFlowAgentsPage.

### Prompt E: Quality
Add unit/integration tests and verify no regression in existing correspondence flows.

---

## Definition of Done

1. Admin can refresh and see discovered plugins (name + description).
2. Admin can assign plugin to correspondence events and actions.
3. Engine executes assigned plugin at runtime and records audit.
4. New compiled plugin artifact can be copied to production and activated without rebuilding the app.
5. Existing workflows still function when no plugin binding is configured.
6. Core paths are covered by automated tests.
```

If you want, I can also generate a second file draft as “agent-ready tasks” with strict acceptance criteria per task so implementation agents can execute one phase at a time.