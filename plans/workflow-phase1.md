I’m going to inspect the current implementation plan and code entry points, then I’ll give you a concrete “Phase 1 now” execution sequence you can hand directly to an implementation agent.I’ll quickly read your workflow plan file and the key workflow backend files so the first implementation batch is precise and immediately executable.

Read [](file:///c%3A/Projects/coreman/workflow-implement.md#1-1), lines 1 to 260

Read [](file:///c%3A/Projects/coreman/src/platform/adapters/sqlite/server/src/db.ts#1-1), lines 1 to 320

Read [](file:///c%3A/Projects/coreman/src/platform/adapters/sqlite/server/src/routes/other.ts#1360-1360), lines 1360 to 1492

Current session is in read-only Ask mode, so I cannot write files directly. I can still start implementation operationally by giving you the exact first execution batch for an implementation agent.

Start here (Phase 1, backend foundation)
1. Add schema objects in db.ts:
1. Create table workflow_plugins
2. Create table workflow_bindings
3. Add indexes for platform and trigger lookup
4. Add migration-safe ALTER checks (same style already used in this file)

2. Create workflow core module files:
1. src/platform/adapters/sqlite/server/src/workflows/types.ts
2. src/platform/adapters/sqlite/server/src/workflows/discovery.ts
3. src/platform/adapters/sqlite/server/src/workflows/loader.ts
4. src/platform/adapters/sqlite/server/src/workflows/engine.ts

3. Add plugin/binding API routes:
1. src/platform/adapters/sqlite/server/src/routes/workflowPlugins.ts
2. Endpoints:
3. GET /api/workflow-plugins
4. POST /api/workflow-plugins/refresh
5. PATCH /api/workflow-plugins/:pluginKey/enabled
6. GET /api/workflow-bindings
7. POST /api/workflow-bindings
8. PATCH /api/workflow-bindings/:id
9. DELETE /api/workflow-bindings/:id

4. Register new routes in index.ts.

5. Integrate engine in other.ts:
1. On post-capture trigger, attempt plugin execution for event CORRESPONDENCE_CREATED
2. If no active binding or plugin unavailable, keep existing BASIC/EXTENDED flow as fallback
3. Preserve current audit behavior

First agent prompt to run now
1. Use this as-is with your implementation agent:
2. Implement Phase 1 backend foundation for workflow plugins in this repository.
3. Update db.ts with workflow_plugins and workflow_bindings tables, indexes, and migration-safe alter checks.
4. Create src/platform/adapters/sqlite/server/src/workflows/types.ts, src/platform/adapters/sqlite/server/src/workflows/discovery.ts, src/platform/adapters/sqlite/server/src/workflows/loader.ts, and src/platform/adapters/sqlite/server/src/workflows/engine.ts.
5. Add src/platform/adapters/sqlite/server/src/routes/workflowPlugins.ts with plugin catalog and binding CRUD endpoints.
6. Register routes in index.ts.
7. Integrate plugin-first execution with fallback in other.ts.
8. Keep compatibility: existing behavior must remain when no binding exists.
9. Add minimal tests for manifest validation and binding resolution if test harness exists.
10. Return a patch summary and any follow-up TODOs.

If you want, I will prepare Batch 2 immediately (Admin UI implementation in AdminFlowAgentsPage.tsx plus runtime assignment UX), in the same agent-ready format.