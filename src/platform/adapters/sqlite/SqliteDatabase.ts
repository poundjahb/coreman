import BetterSqlite3 from "better-sqlite3";
import type { Database } from "better-sqlite3";
import {
  demoActionDefinitions,
  demoBranches,
  demoCorrespondences,
  demoDepartments,
  demoReferenceConfigs,
  demoUsers
} from "../../../application/modules/admin/seedData";

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
  ensureCorrespondenceUserReferenceTriggers(db);
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
    for (const branch of demoBranches) {
      insertBranch.run({ ...branch, isActive: branch.isActive ? 1 : 0 });
    }
  }

  if (!hasRows(db, "departments")) {
    const insertDepartment = db.prepare(
      `INSERT INTO departments (id, code, name, isActive)
       VALUES (@id, @code, @name, @isActive)`
    );
    for (const department of demoDepartments) {
      insertDepartment.run({ ...department, isActive: department.isActive ? 1 : 0 });
    }
  }

  if (!hasRows(db, "users")) {
    const insertUser = db.prepare(
      `INSERT INTO users
        (id, employeeCode, fullName, email, branchId, departmentId, isActive, canLogin, canOwnActions, roles)
       VALUES
        (@id, @employeeCode, @fullName, @email, @branchId, @departmentId, @isActive, @canLogin, @canOwnActions, @roles)`
    );
    for (const user of demoUsers) {
      insertUser.run({
        ...user,
        isActive: user.isActive ? 1 : 0,
        canLogin: user.canLogin ? 1 : 0,
        canOwnActions: user.canOwnActions ? 1 : 0,
        roles: JSON.stringify(user.roles)
      });
    }
  }

  if (!hasRows(db, "reference_configs")) {
    const insertConfig = db.prepare(
      `INSERT INTO reference_configs
        (id, scope, branchId, departmentId, pattern, resetPolicy, isActive)
       VALUES
        (@id, @scope, @branchId, @departmentId, @pattern, @resetPolicy, @isActive)`
    );
    for (const config of demoReferenceConfigs) {
      insertConfig.run({
        ...config,
        branchId: config.branchId ?? null,
        departmentId: config.departmentId ?? null,
        isActive: config.isActive ? 1 : 0
      });
    }
  }

  if (!hasRows(db, "correspondences")) {
    const insertCorrespondence = db.prepare(
      `INSERT INTO correspondences
        (id, reference, subject, direction, fromTo, organisation, correspondenceDate, branchId,
         departmentId, registeredById, recipientId, actionOwnerId, status, receivedDate,
         dueDate, createdAt, updatedAt, createById, updateById, summary)
       VALUES
        (@id, @reference, @subject, @direction, @fromTo, @organisation, @correspondenceDate,
         @branchId, @departmentId, @registeredById, @recipientId, @actionOwnerId, @status,
         @receivedDate, @dueDate, @createdAt, @updatedAt, @createById, @updateById, @summary)`
    );
    for (const correspondence of demoCorrespondences) {
      insertCorrespondence.run({
        ...correspondence,
        organisation: correspondence.organisation ?? null,
        correspondenceDate: correspondence.correspondenceDate
          ? correspondence.correspondenceDate.toISOString()
          : null,
        receivedDate: correspondence.receivedDate.toISOString(),
        dueDate: correspondence.dueDate ? correspondence.dueDate.toISOString() : null,
        createdAt: correspondence.createdAt.toISOString(),
        departmentId: correspondence.departmentId ?? null,
        recipientId: correspondence.recipientId ?? null,
        actionOwnerId: correspondence.actionOwnerId ?? null,
        updatedAt: correspondence.updatedAt.toISOString(),
        createById: correspondence.createBy.id,
        updateById: correspondence.updateBy.id,
        summary: correspondence.summary ?? null
      });
    }
  }

  if (!hasRows(db, "correspondence_action_definitions")) {
    const insertActionDefinition = db.prepare(
      `INSERT INTO correspondence_action_definitions
        (id, code, label, description, category, requiresOwner, triggerMode,
         workflowEnabled, workflowMethod, workflowEndpointUrl, workflowTimeoutMs,
         authType, authSecretRef, payloadTemplate, retryMaxAttempts, retryBackoffMs,
         defaultSlaDays, isActive, createdAt, updatedAt)
       VALUES
        (@id, @code, @label, @description, @category, @requiresOwner, @triggerMode,
         @workflowEnabled, @workflowMethod, @workflowEndpointUrl, @workflowTimeoutMs,
         @authType, @authSecretRef, @payloadTemplate, @retryMaxAttempts, @retryBackoffMs,
         @defaultSlaDays, @isActive, @createdAt, @updatedAt)`
    );

    for (const definition of demoActionDefinitions) {
      insertActionDefinition.run({
        ...definition,
        description: definition.description ?? null,
        requiresOwner: definition.requiresOwner ? 1 : 0,
        workflowEnabled: definition.workflowEnabled ? 1 : 0,
        workflowEndpointUrl: definition.workflowEndpointUrl ?? null,
        authSecretRef: definition.authSecretRef ?? null,
        payloadTemplate: definition.payloadTemplate ?? null,
        defaultSlaDays: definition.defaultSlaDays ?? null,
        isActive: definition.isActive ? 1 : 0,
        createdAt: definition.createdAt.toISOString(),
        updatedAt: definition.updatedAt.toISOString()
      });
    }
  }
}
