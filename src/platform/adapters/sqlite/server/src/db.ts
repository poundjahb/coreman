import Database from "better-sqlite3";
import path from "path";
import { fileURLToPath } from "url";
import fs from "fs";
import bcrypt from "bcryptjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dataDir = path.join(__dirname, "..", "data");
const dbPath = path.join(dataDir, "coreman.db");
const defaultAdminUserId = "admin@coreman.com";
const defaultAdminRecordId = "user-coreman-admin";

function toUniqueUserId(candidate: string, used: Set<string>): string {
  const normalized = candidate.trim().toLowerCase();
  const [localRaw, domainRaw] = normalized.includes("@")
    ? normalized.split("@", 2)
    : [normalized, "coreman.com"];

  const local = localRaw.length > 0 ? localRaw : "user";
  const domain = domainRaw.length > 0 ? domainRaw : "coreman.com";

  let attempt = `${local}@${domain}`;
  let suffix = 1;
  while (used.has(attempt)) {
    attempt = `${local}+${suffix}@${domain}`;
    suffix += 1;
  }
  used.add(attempt);
  return attempt;
}

function ensureDefaultAdminUser(db: Database.Database, passwordHash: string): void {
  const existingAdmin = db
    .prepare(
      `SELECT u.id
       FROM users u
       INNER JOIN user_roles ur ON ur.userId = u.id
       WHERE ur.roleCode = 'ADMIN'
       LIMIT 1`
    )
    .get() as { id: string } | undefined;

  if (existingAdmin) {
    return;
  }

  const branch = db
    .prepare("SELECT id FROM branches ORDER BY isActive DESC, code ASC LIMIT 1")
    .get() as { id: string } | undefined;
  let branchId = branch?.id;
  if (!branchId) {
    branchId = "branch-coreman-main";
    db.prepare("INSERT INTO branches (id, code, name, isActive) VALUES (?, ?, ?, 1)")
      .run(branchId, "CORE-HQ", "Coreman Headquarters");
  }

  const department = db
    .prepare("SELECT id FROM departments ORDER BY isActive DESC, code ASC LIMIT 1")
    .get() as { id: string } | undefined;
  let departmentId = department?.id;
  if (!departmentId) {
    departmentId = "department-coreman-admin";
    db.prepare("INSERT INTO departments (id, code, name, isActive) VALUES (?, ?, ?, 1)")
      .run(departmentId, "CORE-ADMIN", "Coreman Administration");
  }

  const existingDefaultUser = db
    .prepare("SELECT id FROM users WHERE LOWER(userId) = LOWER(?)")
    .get(defaultAdminUserId) as { id: string } | undefined;

  const adminId = existingDefaultUser?.id ?? defaultAdminRecordId;
  if (!existingDefaultUser) {
    db.prepare(
      `INSERT INTO users (id, userId, employeeCode, fullName, email, branchId, departmentId, isActive, canLogin, canOwnActions, passwordHash)
       VALUES (?, ?, ?, ?, ?, ?, ?, 1, 1, 1, ?)`
    ).run(
      adminId,
      defaultAdminUserId,
      "ADM-001",
      "Coreman Administrator",
      defaultAdminUserId,
      branchId,
      departmentId,
      passwordHash
    );
  } else {
    db.prepare("UPDATE users SET isActive = 1, canLogin = 1, passwordHash = ? WHERE id = ?")
      .run(passwordHash, adminId);
  }

  const adminRoles: string[] = [
    "ADMIN",
    "RECEPTIONIST",
    "RECIPIENT",
    "EXECUTIVE"
  ];
  const insertRole = db.prepare("INSERT OR IGNORE INTO user_roles (userId, roleCode) VALUES (?, ?)");
  for (const roleCode of adminRoles) {
    insertRole.run(adminId, roleCode);
  }
}

// Create data directory if it doesn't exist
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

export function initializeDatabase(): Database.Database {
  const db = new Database(dbPath);
  db.pragma("journal_mode = WAL");
  db.pragma("foreign_keys = OFF");  // Disable for now to avoid constraint issues during development

  // Initialize schema
  db.exec(`
    CREATE TABLE IF NOT EXISTS branches (
      id TEXT PRIMARY KEY,
      code TEXT NOT NULL UNIQUE,
      name TEXT NOT NULL,
      isActive INTEGER NOT NULL DEFAULT 1
    );

    CREATE TABLE IF NOT EXISTS departments (
      id TEXT PRIMARY KEY,
      code TEXT NOT NULL UNIQUE,
      name TEXT NOT NULL,
      isActive INTEGER NOT NULL DEFAULT 1
    );

    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      userId TEXT NOT NULL UNIQUE,
      employeeCode TEXT NOT NULL UNIQUE,
      fullName TEXT NOT NULL,
      email TEXT NOT NULL,
      branchId TEXT NOT NULL,
      departmentId TEXT NOT NULL,
      isActive INTEGER NOT NULL DEFAULT 1,
      canLogin INTEGER NOT NULL DEFAULT 1,
      canOwnActions INTEGER NOT NULL DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS user_roles (
      userId TEXT NOT NULL,
      roleCode TEXT NOT NULL,
      PRIMARY KEY (userId, roleCode)
    );

    CREATE TABLE IF NOT EXISTS correspondences (
      id TEXT PRIMARY KEY,
      referenceNumber TEXT NOT NULL UNIQUE,
      senderReference TEXT,
      summary TEXT,
      fromTo TEXT NOT NULL DEFAULT '',
      organisation TEXT,
      branchId TEXT NOT NULL,
      departmentId TEXT,
      recipientId TEXT,
      direction TEXT NOT NULL,
      status TEXT NOT NULL,
      subject TEXT NOT NULL,
      correspondenceDate TEXT,
      receivedDate TEXT NOT NULL,
      dueDate TEXT,
      createdAt TEXT NOT NULL,
      updatedAt TEXT NOT NULL,
      attachmentFileName TEXT,
      attachmentRelativePath TEXT,
      attachmentMimeType TEXT,
      attachmentSizeBytes INTEGER,
      attachmentUploadedAt TEXT,
      createBy TEXT NOT NULL,
      updateBy TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS action_definitions (
      id TEXT PRIMARY KEY,
      code TEXT NOT NULL UNIQUE,
      label TEXT NOT NULL,
      description TEXT,
      category TEXT NOT NULL,
      requiresOwner INTEGER NOT NULL DEFAULT 0,
      triggerMode TEXT NOT NULL DEFAULT 'NONE',
      workflowEnabled INTEGER NOT NULL DEFAULT 0,
      workflowMethod TEXT DEFAULT 'POST',
      workflowEndpointUrl TEXT,
      workflowTimeoutMs INTEGER DEFAULT 10000,
      authType TEXT DEFAULT 'NONE',
      authSecretRef TEXT,
      payloadTemplate TEXT,
      retryMaxAttempts INTEGER DEFAULT 0,
      retryBackoffMs INTEGER DEFAULT 0,
      defaultSlaDays INTEGER,
      isActive INTEGER NOT NULL DEFAULT 1,
      createdAt TEXT NOT NULL,
      updatedAt TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS correspondence_task_assignments (
      id TEXT PRIMARY KEY,
      correspondenceId TEXT NOT NULL,
      actionDefinitionId TEXT NOT NULL,
      description TEXT,
      assigneeUserId TEXT NOT NULL,
      ccUserIdsJson TEXT NOT NULL DEFAULT '[]',
      deadline TEXT NOT NULL,
      status TEXT NOT NULL,
      createdAt TEXT NOT NULL,
      updatedAt TEXT NOT NULL,
      createdBy TEXT NOT NULL,
      updatedBy TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS reference_configs (
      id TEXT PRIMARY KEY,
      scope TEXT NOT NULL,
      formatString TEXT NOT NULL,
      nextSequence INTEGER NOT NULL DEFAULT 1,
      isActive INTEGER NOT NULL DEFAULT 1,
      UNIQUE(scope)
    );

    CREATE TABLE IF NOT EXISTS correspondence_audit_log (
      id TEXT PRIMARY KEY,
      correspondenceId TEXT NOT NULL,
      eventType TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'SUCCESS',
      payloadJson TEXT,
      errorMessage TEXT,
      details TEXT,
      createdAt TEXT NOT NULL,
      createdById TEXT,
      createdBy TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS notifications (
      id TEXT PRIMARY KEY,
      recipientId TEXT NOT NULL,
      subject TEXT NOT NULL,
      body TEXT NOT NULL,
      correspondenceId TEXT,
      sentAt TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS email_settings (
      id INTEGER PRIMARY KEY CHECK(id = 1),
      backendType TEXT NOT NULL DEFAULT 'SMTP',
      config TEXT NOT NULL,
      fromAddress TEXT NOT NULL,
      updatedAt TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS smtp_settings (
      id INTEGER PRIMARY KEY CHECK(id = 1),
      host TEXT NOT NULL,
      port INTEGER NOT NULL,
      secure INTEGER NOT NULL DEFAULT 0,
      user TEXT,
      pass TEXT,
      fromAddress TEXT NOT NULL,
      connectionTimeoutMs INTEGER NOT NULL,
      updatedAt TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS workflow_plugins (
      pluginKey TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      description TEXT NOT NULL,
      version TEXT NOT NULL,
      apiVersion TEXT NOT NULL,
      platformTarget TEXT NOT NULL,
      supportedTriggersJson TEXT NOT NULL,
      entryFile TEXT NOT NULL,
      sourcePath TEXT NOT NULL,
      checksum TEXT NOT NULL,
      isEnabled INTEGER NOT NULL DEFAULT 1,
      isValid INTEGER NOT NULL DEFAULT 1,
      validationErrorsJson TEXT,
      discoveredAt TEXT NOT NULL,
      updatedAt TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS workflow_bindings (
      id TEXT PRIMARY KEY,
      bindingType TEXT NOT NULL,
      triggerCode TEXT,
      actionDefinitionId TEXT,
      pluginKey TEXT NOT NULL,
      priority INTEGER NOT NULL DEFAULT 100,
      isActive INTEGER NOT NULL DEFAULT 1,
      createdBy TEXT NOT NULL,
      updatedBy TEXT NOT NULL,
      createdAt TEXT NOT NULL,
      updatedAt TEXT NOT NULL,
      CHECK (
        (bindingType = 'EVENT' AND triggerCode IS NOT NULL AND actionDefinitionId IS NULL)
        OR
        (bindingType = 'ACTION' AND actionDefinitionId IS NOT NULL AND triggerCode IS NULL)
      )
    );
  `);

  db.exec("CREATE INDEX IF NOT EXISTS idx_workflow_plugins_platform_enabled ON workflow_plugins (platformTarget, isEnabled)");
  db.exec("CREATE INDEX IF NOT EXISTS idx_workflow_bindings_type_active ON workflow_bindings (bindingType, isActive)");
  db.exec("CREATE INDEX IF NOT EXISTS idx_workflow_bindings_trigger ON workflow_bindings (triggerCode)");
  db.exec("CREATE INDEX IF NOT EXISTS idx_workflow_bindings_action ON workflow_bindings (actionDefinitionId)");

  const correspondenceColumns = db.prepare("PRAGMA table_info(correspondences)").all() as Array<{ name: string }>;
  const hasSenderReference = correspondenceColumns.some((column) => column.name === "senderReference");
  if (!hasSenderReference) {
    db.exec("ALTER TABLE correspondences ADD COLUMN senderReference TEXT");
  }

  const hasSummary = correspondenceColumns.some((column) => column.name === "summary");
  if (!hasSummary) {
    db.exec("ALTER TABLE correspondences ADD COLUMN summary TEXT");
  }

  const hasRecipientId = correspondenceColumns.some((column) => column.name === "recipientId");
  if (!hasRecipientId) {
    db.exec("ALTER TABLE correspondences ADD COLUMN recipientId TEXT");
  }

  const hasFromTo = correspondenceColumns.some((column) => column.name === "fromTo");
  if (!hasFromTo) {
    db.exec("ALTER TABLE correspondences ADD COLUMN fromTo TEXT NOT NULL DEFAULT ''");
  }

  const hasOrganisation = correspondenceColumns.some((column) => column.name === "organisation");
  if (!hasOrganisation) {
    db.exec("ALTER TABLE correspondences ADD COLUMN organisation TEXT");
  }

  const hasAttachmentFileName = correspondenceColumns.some((column) => column.name === "attachmentFileName");
  if (!hasAttachmentFileName) {
    db.exec("ALTER TABLE correspondences ADD COLUMN attachmentFileName TEXT");
  }

  const hasAttachmentRelativePath = correspondenceColumns.some((column) => column.name === "attachmentRelativePath");
  if (!hasAttachmentRelativePath) {
    db.exec("ALTER TABLE correspondences ADD COLUMN attachmentRelativePath TEXT");
  }

  const hasAttachmentMimeType = correspondenceColumns.some((column) => column.name === "attachmentMimeType");
  if (!hasAttachmentMimeType) {
    db.exec("ALTER TABLE correspondences ADD COLUMN attachmentMimeType TEXT");
  }

  const hasAttachmentSizeBytes = correspondenceColumns.some((column) => column.name === "attachmentSizeBytes");
  if (!hasAttachmentSizeBytes) {
    db.exec("ALTER TABLE correspondences ADD COLUMN attachmentSizeBytes INTEGER");
  }

  const hasAttachmentUploadedAt = correspondenceColumns.some((column) => column.name === "attachmentUploadedAt");
  if (!hasAttachmentUploadedAt) {
    db.exec("ALTER TABLE correspondences ADD COLUMN attachmentUploadedAt TEXT");
  }

  const assignmentColumns = db.prepare("PRAGMA table_info(correspondence_task_assignments)").all() as Array<{ name: string }>;
  const hasAssignmentDescription = assignmentColumns.some((column) => column.name === "description");
  if (!hasAssignmentDescription) {
    db.exec("ALTER TABLE correspondence_task_assignments ADD COLUMN description TEXT");
  }

  const auditColumns = db.prepare("PRAGMA table_info(correspondence_audit_log)").all() as Array<{ name: string }>;
  const hasAuditStatus = auditColumns.some((column) => column.name === "status");
  if (!hasAuditStatus) {
    db.exec("ALTER TABLE correspondence_audit_log ADD COLUMN status TEXT NOT NULL DEFAULT 'SUCCESS'");
  }

  const hasAuditPayload = auditColumns.some((column) => column.name === "payloadJson");
  if (!hasAuditPayload) {
    db.exec("ALTER TABLE correspondence_audit_log ADD COLUMN payloadJson TEXT");
  }

  const hasAuditError = auditColumns.some((column) => column.name === "errorMessage");
  if (!hasAuditError) {
    db.exec("ALTER TABLE correspondence_audit_log ADD COLUMN errorMessage TEXT");
  }

  const hasAuditCreatedById = auditColumns.some((column) => column.name === "createdById");
  if (!hasAuditCreatedById) {
    db.exec("ALTER TABLE correspondence_audit_log ADD COLUMN createdById TEXT");
  }

  const workflowPluginColumns = db.prepare("PRAGMA table_info(workflow_plugins)").all() as Array<{ name: string }>;
  if (!workflowPluginColumns.some((column) => column.name === "validationErrorsJson")) {
    db.exec("ALTER TABLE workflow_plugins ADD COLUMN validationErrorsJson TEXT");
  }

  const workflowBindingColumns = db.prepare("PRAGMA table_info(workflow_bindings)").all() as Array<{ name: string }>;
  if (!workflowBindingColumns.some((column) => column.name === "priority")) {
    db.exec("ALTER TABLE workflow_bindings ADD COLUMN priority INTEGER NOT NULL DEFAULT 100");
  }

  db.exec("UPDATE correspondence_audit_log SET createdById = createdBy WHERE createdById IS NULL");
  db.exec("UPDATE correspondence_audit_log SET payloadJson = details WHERE payloadJson IS NULL AND details IS NOT NULL");

  // --- Auth: passwordHash migration ---
  const userColumns = db.prepare("PRAGMA table_info(users)").all() as Array<{ name: string }>;
  const hasUserId = userColumns.some((col) => col.name === "userId");
  if (!hasUserId) {
    db.exec("ALTER TABLE users ADD COLUMN userId TEXT");
  }

  const usersForUserIdBackfill = db
    .prepare("SELECT id, userId, email FROM users ORDER BY id")
    .all() as Array<{ id: string; userId: string | null; email: string | null }>;
  const usedUserIds = new Set<string>();
  const updateUserIdStmt = db.prepare("UPDATE users SET userId = ? WHERE id = ?");
  for (const user of usersForUserIdBackfill) {
    const candidate = user.userId ?? user.email ?? `${user.id}@coreman.com`;
    const uniqueUserId = toUniqueUserId(candidate, usedUserIds);
    updateUserIdStmt.run(uniqueUserId, user.id);
  }
  db.exec("CREATE UNIQUE INDEX IF NOT EXISTS users_userId_idx ON users (userId)");

  const hasPasswordHash = userColumns.some((col) => col.name === "passwordHash");
  if (!hasPasswordHash) {
    db.exec("ALTER TABLE users ADD COLUMN passwordHash TEXT");
  }

  // Seed default password for users that have no hash yet.
  const defaultPassword = process.env.COREMAN_DEFAULT_PASSWORD ?? "coreman";
  const defaultHash = bcrypt.hashSync(defaultPassword, 10);
  db.prepare("UPDATE users SET passwordHash = ? WHERE passwordHash IS NULL").run(defaultHash);
  ensureDefaultAdminUser(db, defaultHash);

  // --- Session store table (connect-sqlite3 compatible) ---
  db.exec(`
    CREATE TABLE IF NOT EXISTS sessions (
      sid TEXT PRIMARY KEY NOT NULL,
      expired INTEGER NOT NULL,
      sess TEXT NOT NULL
    );
  `);

  const sessionColumns = db.prepare("PRAGMA table_info(sessions)").all() as Array<{ cid: number; name: string; type: string }>;
  const hasExpectedSessionSchema =
    sessionColumns.length === 3
    && sessionColumns[0]?.name === "sid"
    && sessionColumns[1]?.name === "expired"
    && sessionColumns[2]?.name === "sess";

  if (!hasExpectedSessionSchema) {
    // Existing data is session cache only; recreate to guarantee store compatibility.
    db.exec(`
      DROP TABLE IF EXISTS sessions;
      CREATE TABLE sessions (
        sid TEXT PRIMARY KEY NOT NULL,
        expired INTEGER NOT NULL,
        sess TEXT NOT NULL
      );
    `);
  }

  db.exec("CREATE INDEX IF NOT EXISTS sessions_expired_idx ON sessions (expired)");

  return db;
}
