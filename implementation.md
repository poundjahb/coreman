## Plan: Platform-Driven Post-Capture Workflow

Implement a platform-owned post-capture orchestration that runs immediately after correspondence save and chooses either basic or extended workflow from global config. Keep UI and intake application flow unchanged while introducing explicit workflow/audit contracts in the platform layer so each target (SQLite, In-memory, Dataverse/PowerApp) handles execution details transparently.

**Steps**
1. Phase 1 - Contracts and configuration foundations.
2. Add a global workflow mode config in src/config/systemConfig.ts with values BASIC and EXTENDED, and expose a safe accessor used by runtime code.
3. Introduce platform contracts for post-capture orchestration and auditing under src/platform/contracts/ (for example: IPostCaptureWorkflowService and ICorrespondenceAuditLogRepository), including event types for AGENT_CALL, AGENT_RESPONSE, NOTIFICATION_SENT, WORKFLOW_FAILURE, and POWERFLOW_CALL/POWERFLOW_RESPONSE.
4. Extend src/platform/IHostAdapter.ts to include new platform-owned capabilities (workflow service + audit log repository) while preserving existing API usage.
5. Phase 2 - Application orchestration integration.
6. Update src/application/modules/intake/registerCorrespondence.ts to call the new hostAdapter post-capture workflow service after correspondence persistence, passing correspondence, actor, and mode from global config, with no workflow branching in UI/application logic. This step depends on 2-4.
7. Apply your selected failure policy: if post-capture workflow fails, keep registration success and write failure audit event(s), then return IntakeResult as usual. This step depends on 6.
8. Phase 3 - SQLite implementation (real integrations).
9. Extend src/platform/adapters/sqlite/SqliteDatabase.ts schema with a correspondence_audit_log table (id, correspondenceId, eventType, status, payloadJson, errorMessage, createdAt, createdById). Add non-breaking migration guards similar to existing ensure* patterns. This step depends on 3.
10. Implement SQLite audit repository and workflow service in src/platform/adapters/sqlite/ that execute mode-specific flows:
11. BASIC: compose default mail, send through SMTP transport, then log NOTIFICATION_SENT.
12. EXTENDED: call agent via HTTP with scanned/digital content + metadata, log AGENT_CALL and AGENT_RESPONSE (raw JSON only per your decision), send recipient email (SMTP), then log NOTIFICATION_SENT.
13. Ensure each external call logs success/failure status and payload snapshot for traceability.
14. Wire these services in src/platform/adapters/sqlite/SqliteHostAdapter.ts and expose corresponding IPC channels in electron/main.ts and electron/preload.ts if renderer must invoke any new platform methods directly. This step depends on 10-13.
15. Phase 4 - In-memory implementation (simulation).
16. Add in-memory audit store and in-memory post-capture workflow service in src/platform/adapters/inMemory/.
17. BASIC: simulate notification + append one audit event.
18. EXTENDED: simulate agent call, simulated agent response, simulated notification, and append three audit events.
19. Wire into src/platform/adapters/inMemory/InMemoryHostAdapter.ts. This step can run in parallel with Phase 3 after contracts are merged.
20. Phase 5 - Dataverse/PowerApp pathway.
21. Implement Dataverse workflow service to call a PowerFlow endpoint for both basic and extended modes and record call/response events in the same audit contract semantics.
22. If full Dataverse repositories remain unimplemented, keep current notImplemented behavior for unrelated repository operations and explicitly document that capture+workflow in DATAVERSE target requires repository implementation as a separate scope item.
23. Phase 6 - Email and agent payload standards.
24. Define default mail template builder in platform workflow implementation (subject/body defaults and interpolation fields).
25. Define extended agent request/response DTOs in platform contract types, storing raw response JSON and also minimal extracted fields needed for notification composition at runtime.
26. Phase 7 - Tests and verification.
27. Expand tests/registerCorrespondenceInHost.test.ts to cover:
28. BASIC mode: correspondence saved, notification sent, notification audit logged.
29. EXTENDED mode: agent call/response/notification all logged in order and registration still succeeds.
30. Failure policy: simulated SMTP/HTTP failure logs WORKFLOW_FAILURE while correspondence remains persisted.
31. Add SQLite-focused integration tests (or adapter tests) to validate schema migration and persisted audit rows for both modes.
32. Add adapter unit tests for in-memory simulation counters/log payloads.

**Relevant files**
- c:/Users/HabibPoundja/OneDrive - HbTech/Documents/correspondance management/src/application/modules/intake/registerCorrespondence.ts — call platform post-capture service after save, enforce non-blocking failure policy.
- c:/Users/HabibPoundja/OneDrive - HbTech/Documents/correspondance management/src/config/systemConfig.ts — add workflow mode config.
- c:/Users/HabibPoundja/OneDrive - HbTech/Documents/correspondance management/src/platform/IHostAdapter.ts — add workflow/audit capabilities.
- c:/Users/HabibPoundja/OneDrive - HbTech/Documents/correspondance management/src/platform/contracts/INotificationService.ts — keep notification interface; optionally extend payload metadata fields.
- c:/Users/HabibPoundja/OneDrive - HbTech/Documents/correspondance management/src/platform/contracts/ (new files) — post-capture workflow and audit log contracts/types.
- c:/Users/HabibPoundja/OneDrive - HbTech/Documents/correspondance management/src/platform/adapters/sqlite/SqliteDatabase.ts — add audit schema + migration guards.
- c:/Users/HabibPoundja/OneDrive - HbTech/Documents/correspondance management/src/platform/adapters/sqlite/SqliteHostAdapter.ts — wire SQLite workflow/audit services.
- c:/Users/HabibPoundja/OneDrive - HbTech/Documents/correspondance management/src/platform/adapters/sqlite/ (new services) — SMTP sender, HTTP agent client, workflow orchestrator, audit repository.
- c:/Users/HabibPoundja/OneDrive - HbTech/Documents/correspondance management/src/platform/adapters/inMemory/InMemoryHostAdapter.ts — wire simulation workflow/audit services.
- c:/Users/HabibPoundja/OneDrive - HbTech/Documents/correspondance management/src/platform/adapters/inMemory/ (new services) — simulated workflow + in-memory audit.
- c:/Users/HabibPoundja/OneDrive - HbTech/Documents/correspondance management/src/platform/adapters/dataverse/dataverseHostAdapter.ts — add PowerFlow-backed workflow service integration surface.
- c:/Users/HabibPoundja/OneDrive - HbTech/Documents/correspondance management/electron/main.ts — register any new IPC handlers used by SQLite workflow utilities.
- c:/Users/HabibPoundja/OneDrive - HbTech/Documents/correspondance management/electron/preload.ts — expose matching bridge methods if needed.
- c:/Users/HabibPoundja/OneDrive - HbTech/Documents/correspondance management/tests/registerCorrespondenceInHost.test.ts — expand behavior tests for both modes + failure policy.

**Verification**
1. Run TypeScript build/tests for the current project and ensure no compile regressions after interface expansion.
2. Run intake tests in both BASIC and EXTENDED mode toggles and verify same IntakeResult behavior from UI path.
3. In SQLite mode, register incoming correspondence and verify expected audit rows:
4. BASIC: 1 notification event (plus failure event only if simulated fault).
5. EXTENDED: AGENT_CALL, AGENT_RESPONSE, NOTIFICATION_SENT (and optional WORKFLOW_FAILURE on fault).
6. In In-memory mode, assert simulated workflow arrays/logs capture equivalent event sequence.
7. Smoke-check receptionist UI to confirm no new branching or controls are required for workflow selection.

**Decisions**
- Workflow setting location: global app config.
- Failure policy: registration succeeds even when post-capture workflow fails; failures are audited.
- Agent response persistence: store raw response JSON only.
- In scope: platform-transparent post-capture workflow, mode switch, platform-specific execution, audit events, and tests.
- Out of scope: full Dataverse repository implementation for end-to-end capture persistence (unless prioritized as separate workstream).

**Further Considerations**
1. Recommendation: add an optional retry mechanism for failed SMTP/HTTP operations in SQLite (deferred queue) to avoid manual recovery.
2. Recommendation: add correlationId across AGENT_CALL, AGENT_RESPONSE, and NOTIFICATION_SENT events for easier traceability in audit views.
3. Recommendation: define timeout and fallback behavior for agent HTTP calls (for example, fallback to basic notification content when agent times out).