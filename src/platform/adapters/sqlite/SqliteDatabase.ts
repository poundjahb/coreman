import BetterSqlite3 from "better-sqlite3";
import type { Database } from "better-sqlite3";
import type { Branch, Department, AppUser } from "../../../domain/governance";
import type { ReferenceFormatConfig } from "../../../domain/reference";
import { getRuntimeSmtpConfig } from "../../../config/systemConfig";

const bootstrapBranch: Branch = {
  id: "branch-bootstrap-main",
  code: "MAIN",
  name: "Main Branch",
  isActive: true
};

const bootstrapDepartment: Department = {
  id: "department-bootstrap-admin",
  code: "ADMIN",
  name: "Administration",
  isActive: true
};

const bootstrapAdminUser: AppUser = {
  id: "user-bootstrap-admin",
  userId: "admin@coreman.com",
  employeeCode: "BOOT-001",
  fullName: "Bootstrap Administrator",
  email: "admin@coreman.com",
  branchId: bootstrapBranch.id,
  departmentId: bootstrapDepartment.id,
  isActive: true,
  canLogin: true,
  canOwnActions: true,
  roles: ["ADMIN", "RECEPTIONIST", "RECIPIENT", "EXECUTIVE"]
};

const bootstrapReferenceConfig: ReferenceFormatConfig = {
  id: "refcfg-bootstrap-global",
  scope: "GLOBAL",
  pattern: "{ORG}-{YYYY}{MM}-{SEQ6}",
  resetPolicy: "MONTHLY",
  isActive: true
};

export function openDatabase(dbPath: string): Database {
  const db = new BetterSqlite3(dbPath);
  db.pragma("journal_mode = WAL");
  db.pragma("foreign_keys = ON");
  initSchema(db);
  seedDatabase(db);
  return db;
}

function initSchema(db: Database): void {
  db.exec(`
    CREATE TABLE IF NOT EXISTS correspondences (
      id              TEXT PRIMARY KEY,
      reference       TEXT NOT NULL,
      senderReference TEXT,
      subject         TEXT NOT NULL,
      direction       TEXT NOT NULL,
      fromTo          TEXT NOT NULL,
      organisation    TEXT,
      correspondenceDate TEXT,
      branchId        TEXT NOT NULL,
      departmentId    TEXT,
      registeredById  TEXT NOT NULL,
      recipientId     TEXT,
      actionOwnerId   TEXT,
      status          TEXT NOT NULL,
      receivedDate    TEXT NOT NULL,
      dueDate         TEXT,
      createdAt       TEXT NOT NULL,
      updatedAt       TEXT NOT NULL,
      createById      TEXT,
      updateById      TEXT,
      summary         TEXT CHECK (summary IS NULL OR length(summary) <= 500)
    );

    CREATE TABLE IF NOT EXISTS users (
      id              TEXT PRIMARY KEY,
      userId          TEXT NOT NULL UNIQUE,
      employeeCode    TEXT NOT NULL,
      fullName        TEXT NOT NULL,
      email           TEXT NOT NULL,
      branchId        TEXT NOT NULL,
      departmentId    TEXT NOT NULL,
      isActive        INTEGER NOT NULL,
      canLogin        INTEGER NOT NULL,
      canOwnActions   INTEGER NOT NULL,
      roles           TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS branches (
      id       TEXT PRIMARY KEY,
      code     TEXT NOT NULL,
      name     TEXT NOT NULL,
      isActive INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS departments (
      id       TEXT PRIMARY KEY,
      code     TEXT NOT NULL,
      name     TEXT NOT NULL,
      isActive INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS reference_configs (
      id           TEXT PRIMARY KEY,
      scope        TEXT NOT NULL,
      branchId     TEXT,
      departmentId TEXT,
      pattern      TEXT NOT NULL,
      resetPolicy  TEXT NOT NULL,
      isActive     INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS sequences (
      key   TEXT PRIMARY KEY,
      value INTEGER NOT NULL DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS notifications (
      id               TEXT PRIMARY KEY,
      recipientId      TEXT NOT NULL,
      subject          TEXT NOT NULL,
      body             TEXT NOT NULL,
      correspondenceId TEXT,
      sentAt           TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS correspondence_audit_log (
      id               TEXT PRIMARY KEY,
      correspondenceId TEXT NOT NULL,
      eventType        TEXT NOT NULL,
      status           TEXT NOT NULL,
      payloadJson      TEXT,
      errorMessage     TEXT,
      createdAt        TEXT NOT NULL,
      createdById      TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS smtp_settings (
      id                  INTEGER PRIMARY KEY CHECK (id = 1),
      host                TEXT NOT NULL,
      port                INTEGER NOT NULL,
      secure              INTEGER NOT NULL,
      user                TEXT,
      pass                TEXT,
      fromAddress         TEXT NOT NULL,
      connectionTimeoutMs INTEGER NOT NULL,
      updatedAt           TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS correspondence_action_definitions (
      id                 TEXT PRIMARY KEY,
      code               TEXT NOT NULL UNIQUE,
      label              TEXT NOT NULL,
      description        TEXT,
      category           TEXT NOT NULL,
      requiresOwner      INTEGER NOT NULL,
      triggerMode        TEXT NOT NULL,
      workflowEnabled    INTEGER NOT NULL,
      workflowMethod     TEXT NOT NULL,
      workflowEndpointUrl TEXT,
      workflowTimeoutMs  INTEGER NOT NULL,
      authType           TEXT NOT NULL,
      authSecretRef      TEXT,
      payloadTemplate    TEXT,
      retryMaxAttempts   INTEGER NOT NULL,
      retryBackoffMs     INTEGER NOT NULL,
      defaultSlaDays     INTEGER,
      isActive           INTEGER NOT NULL,
      createdAt          TEXT NOT NULL,
      updatedAt          TEXT NOT NULL
    );
  `);

  ensureCorrespondenceColumns(db);
  ensureUserColumns(db);
  ensureCorrespondenceUserReferenceTriggers(db);
}

function ensureUserColumns(db: Database): void {
  const columns = db.prepare("PRAGMA table_info(users)").all() as Array<{ name: string }>;
  const existing = new Set(columns.map((column) => column.name));

  if (!existing.has("userId")) {
    db.exec("ALTER TABLE users ADD COLUMN userId TEXT");
  }

  const rows = db.prepare("SELECT id, userId, email FROM users ORDER BY id").all() as Array<{
    id: string;
    userId?: string | null;
    email?: string | null;
  }>;
  const used = new Set<string>();
  const updateStmt = db.prepare("UPDATE users SET userId = ? WHERE id = ?");

  for (const row of rows) {
    const raw = (row.userId ?? row.email ?? `${row.id}@coreman.com`).trim().toLowerCase();
    const [localRaw, domainRaw] = raw.includes("@") ? raw.split("@", 2) : [raw, "coreman.com"];
    const local = localRaw.length > 0 ? localRaw : "user";
    const domain = domainRaw.length > 0 ? domainRaw : "coreman.com";
    let next = `${local}@${domain}`;
    let counter = 1;
    while (used.has(next)) {
      next = `${local}+${counter}@${domain}`;
      counter += 1;
    }
    used.add(next);
    updateStmt.run(next, row.id);
  }

  db.exec("CREATE UNIQUE INDEX IF NOT EXISTS users_userId_idx ON users (userId)");
}

function ensureCorrespondenceColumns(db: Database): void {
  const columns = db.prepare("PRAGMA table_info(correspondences)").all() as Array<{ name: string }>;
  const existing = new Set(columns.map((column) => column.name));

  if (!existing.has("fromTo")) {
    db.exec(`ALTER TABLE correspondences ADD COLUMN fromTo TEXT NOT NULL DEFAULT ''`);
  }

  if (!existing.has("organisation")) {
    db.exec(`ALTER TABLE correspondences ADD COLUMN organisation TEXT`);
  }

  if (!existing.has("correspondenceDate")) {
    db.exec(`ALTER TABLE correspondences ADD COLUMN correspondenceDate TEXT`);
  }

  if (!existing.has("createById")) {
    db.exec(`ALTER TABLE correspondences ADD COLUMN createById TEXT`);
    db.exec(`UPDATE correspondences SET createById = registeredById WHERE createById IS NULL OR createById = ''`);
  }

  if (!existing.has("updateById")) {
    db.exec(`ALTER TABLE correspondences ADD COLUMN updateById TEXT`);
    db.exec(`UPDATE correspondences SET updateById = registeredById WHERE updateById IS NULL OR updateById = ''`);
  }

  if (!existing.has("summary")) {
    db.exec(`ALTER TABLE correspondences ADD COLUMN summary TEXT`);
  }

  if (!existing.has("senderReference")) {
    db.exec(`ALTER TABLE correspondences ADD COLUMN senderReference TEXT`);
  }
}

function ensureCorrespondenceUserReferenceTriggers(db: Database): void {
  db.exec(`
    CREATE TRIGGER IF NOT EXISTS correspondences_registered_by_fk_insert
    BEFORE INSERT ON correspondences
    FOR EACH ROW
    WHEN (SELECT id FROM users WHERE id = NEW.registeredById) IS NULL
    BEGIN
      SELECT RAISE(ABORT, 'registeredById must reference users.id');
    END;

    CREATE TRIGGER IF NOT EXISTS correspondences_registered_by_fk_update
    BEFORE UPDATE OF registeredById ON correspondences
    FOR EACH ROW
    WHEN (SELECT id FROM users WHERE id = NEW.registeredById) IS NULL
    BEGIN
      SELECT RAISE(ABORT, 'registeredById must reference users.id');
    END;

    CREATE TRIGGER IF NOT EXISTS correspondences_recipient_fk_insert
    BEFORE INSERT ON correspondences
    FOR EACH ROW
    WHEN NEW.recipientId IS NOT NULL AND (SELECT id FROM users WHERE id = NEW.recipientId) IS NULL
    BEGIN
      SELECT RAISE(ABORT, 'recipientId must reference users.id');
    END;

    CREATE TRIGGER IF NOT EXISTS correspondences_recipient_fk_update
    BEFORE UPDATE OF recipientId ON correspondences
    FOR EACH ROW
    WHEN NEW.recipientId IS NOT NULL AND (SELECT id FROM users WHERE id = NEW.recipientId) IS NULL
    BEGIN
      SELECT RAISE(ABORT, 'recipientId must reference users.id');
    END;

    CREATE TRIGGER IF NOT EXISTS correspondences_action_owner_fk_insert
    BEFORE INSERT ON correspondences
    FOR EACH ROW
    WHEN NEW.actionOwnerId IS NOT NULL AND (SELECT id FROM users WHERE id = NEW.actionOwnerId) IS NULL
    BEGIN
      SELECT RAISE(ABORT, 'actionOwnerId must reference users.id');
    END;

    CREATE TRIGGER IF NOT EXISTS correspondences_action_owner_fk_update
    BEFORE UPDATE OF actionOwnerId ON correspondences
    FOR EACH ROW
    WHEN NEW.actionOwnerId IS NOT NULL AND (SELECT id FROM users WHERE id = NEW.actionOwnerId) IS NULL
    BEGIN
      SELECT RAISE(ABORT, 'actionOwnerId must reference users.id');
    END;

    CREATE TRIGGER IF NOT EXISTS correspondences_create_by_fk_insert
    BEFORE INSERT ON correspondences
    FOR EACH ROW
    WHEN NEW.createById IS NULL OR NEW.createById = '' OR (SELECT id FROM users WHERE id = NEW.createById) IS NULL
    BEGIN
      SELECT RAISE(ABORT, 'createById must reference users.id');
    END;

    CREATE TRIGGER IF NOT EXISTS correspondences_create_by_fk_update
    BEFORE UPDATE OF createById ON correspondences
    FOR EACH ROW
    WHEN NEW.createById IS NOT NULL AND NEW.createById != '' AND (SELECT id FROM users WHERE id = NEW.createById) IS NULL
    BEGIN
      SELECT RAISE(ABORT, 'createById must reference users.id');
    END;

    CREATE TRIGGER IF NOT EXISTS correspondences_update_by_fk_insert
    BEFORE INSERT ON correspondences
    FOR EACH ROW
    WHEN NEW.updateById IS NULL OR NEW.updateById = '' OR (SELECT id FROM users WHERE id = NEW.updateById) IS NULL
    BEGIN
      SELECT RAISE(ABORT, 'updateById must reference users.id');
    END;

    CREATE TRIGGER IF NOT EXISTS correspondences_update_by_fk_update
    BEFORE UPDATE OF updateById ON correspondences
    FOR EACH ROW
    WHEN NEW.updateById IS NOT NULL AND NEW.updateById != '' AND (SELECT id FROM users WHERE id = NEW.updateById) IS NULL
    BEGIN
      SELECT RAISE(ABORT, 'updateById must reference users.id');
    END;

    CREATE TRIGGER IF NOT EXISTS correspondences_summary_len_insert
    BEFORE INSERT ON correspondences
    FOR EACH ROW
    WHEN NEW.summary IS NOT NULL AND length(NEW.summary) > 500
    BEGIN
      SELECT RAISE(ABORT, 'summary length must be <= 500');
    END;

    CREATE TRIGGER IF NOT EXISTS correspondences_summary_len_update
    BEFORE UPDATE OF summary ON correspondences
    FOR EACH ROW
    WHEN NEW.summary IS NOT NULL AND length(NEW.summary) > 500
    BEGIN
      SELECT RAISE(ABORT, 'summary length must be <= 500');
    END;
  `);
}

function hasRows(db: Database, tableName: string): boolean {
  const row = db.prepare(`SELECT COUNT(1) as count FROM ${tableName}`).get() as { count: number };
  return row.count > 0;
}

function seedDatabase(db: Database): void {
  if (!hasRows(db, "branches")) {
    const insertBranch = db.prepare(
      `INSERT INTO branches (id, code, name, isActive)
       VALUES (@id, @code, @name, @isActive)`
    );
    insertBranch.run({ ...bootstrapBranch, isActive: 1 });
  }

  if (!hasRows(db, "departments")) {
    const insertDepartment = db.prepare(
      `INSERT INTO departments (id, code, name, isActive)
       VALUES (@id, @code, @name, @isActive)`
    );
    insertDepartment.run({ ...bootstrapDepartment, isActive: 1 });
  }

  if (!hasRows(db, "users")) {
    const insertUser = db.prepare(
      `INSERT INTO users
        (id, userId, employeeCode, fullName, email, branchId, departmentId, isActive, canLogin, canOwnActions, roles)
       VALUES
        (@id, @userId, @employeeCode, @fullName, @email, @branchId, @departmentId, @isActive, @canLogin, @canOwnActions, @roles)`
    );
    insertUser.run({
      ...bootstrapAdminUser,
      isActive: 1,
      canLogin: 1,
      canOwnActions: 1,
      roles: JSON.stringify(bootstrapAdminUser.roles)
    });
  }

  if (!hasRows(db, "reference_configs")) {
    const insertConfig = db.prepare(
      `INSERT INTO reference_configs
        (id, scope, branchId, departmentId, pattern, resetPolicy, isActive)
       VALUES
        (@id, @scope, @branchId, @departmentId, @pattern, @resetPolicy, @isActive)`
    );
    insertConfig.run({
      ...bootstrapReferenceConfig,
      branchId: null,
      departmentId: null,
      isActive: 1
    });
  }

  if (!hasRows(db, "smtp_settings")) {
    const smtpConfig = getRuntimeSmtpConfig();
    const insertSmtpSettings = db.prepare(
      `INSERT INTO smtp_settings
        (id, host, port, secure, user, pass, fromAddress, connectionTimeoutMs, updatedAt)
       VALUES
        (1, @host, @port, @secure, @user, @pass, @fromAddress, @connectionTimeoutMs, @updatedAt)`
    );
    insertSmtpSettings.run({
      host: smtpConfig.host,
      port: smtpConfig.port,
      secure: smtpConfig.secure ? 1 : 0,
      user: smtpConfig.user ?? null,
      pass: smtpConfig.pass ?? null,
      fromAddress: smtpConfig.fromAddress,
      connectionTimeoutMs: smtpConfig.connectionTimeoutMs,
      updatedAt: new Date().toISOString()
    });
  }
}
