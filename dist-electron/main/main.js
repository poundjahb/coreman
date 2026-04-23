import { app, BrowserWindow, ipcMain } from "electron";
import fs from "fs";
import path from "path";
import BetterSqlite3 from "better-sqlite3";
import { randomUUID } from "crypto";
import nodemailer from "nodemailer";
import __cjs_mod__ from "node:module";
const __filename = import.meta.filename;
const __dirname = import.meta.dirname;
const require2 = __cjs_mod__.createRequire(import.meta.url);
const __vite_import_meta_env__ = { "BASE_URL": "/", "DEV": true, "MODE": "development", "PROD": false, "SSR": true, "VITE_PLATFORM_TARGET": "SQLITE" };
function readEnvValue(key) {
  if (typeof process !== "undefined") {
    const processValue = process.env?.[key];
    if (typeof processValue === "string" && processValue.length > 0) {
      return processValue;
    }
  }
  if (typeof import.meta !== "undefined") {
    const env = __vite_import_meta_env__;
    const viteValue = env?.[`VITE_${key}`];
    if (typeof viteValue === "string" && viteValue.length > 0) {
      return viteValue;
    }
  }
  return void 0;
}
function parsePort(rawValue, fallback) {
  if (!rawValue) {
    return fallback;
  }
  const parsed = Number.parseInt(rawValue, 10);
  if (Number.isNaN(parsed) || parsed <= 0) {
    return fallback;
  }
  return parsed;
}
function parseBoolean(rawValue, fallback) {
  if (!rawValue) {
    return fallback;
  }
  const normalized = rawValue.trim().toLowerCase();
  if (normalized === "true" || normalized === "1" || normalized === "yes") {
    return true;
  }
  if (normalized === "false" || normalized === "0" || normalized === "no") {
    return false;
  }
  return fallback;
}
function getRuntimeSmtpConfig() {
  return {
    host: readEnvValue("SMTP_HOST") ?? "127.0.0.1",
    port: parsePort(readEnvValue("SMTP_PORT"), 1025),
    secure: parseBoolean(readEnvValue("SMTP_SECURE"), false),
    user: readEnvValue("SMTP_USER"),
    pass: readEnvValue("SMTP_PASS"),
    fromAddress: readEnvValue("SMTP_FROM") ?? "noreply@bank.local",
    connectionTimeoutMs: parsePort(readEnvValue("SMTP_CONNECTION_TIMEOUT_MS"), 3e3)
  };
}
const bootstrapBranch = {
  id: "branch-bootstrap-main",
  code: "MAIN",
  name: "Main Branch",
  isActive: true
};
const bootstrapDepartment = {
  id: "department-bootstrap-admin",
  code: "ADMIN",
  name: "Administration",
  isActive: true
};
const bootstrapAdminUser = {
  id: "user-bootstrap-admin",
  employeeCode: "BOOT-001",
  fullName: "Bootstrap Administrator",
  email: "bootstrap.admin@local",
  branchId: bootstrapBranch.id,
  departmentId: bootstrapDepartment.id,
  isActive: true,
  canLogin: true,
  canOwnActions: true,
  roles: ["ADMIN", "RECEPTIONIST", "RECIPIENT", "ACTION_OWNER", "COPIED_VIEWER", "DASHBOARD_VIEWER"]
};
const bootstrapReferenceConfig = {
  id: "refcfg-bootstrap-global",
  scope: "GLOBAL",
  pattern: "{ORG}-{YYYY}{MM}-{SEQ6}",
  resetPolicy: "MONTHLY",
  isActive: true
};
function openDatabase(dbPath) {
  const db = new BetterSqlite3(dbPath);
  db.pragma("journal_mode = WAL");
  db.pragma("foreign_keys = ON");
  initSchema(db);
  seedDatabase(db);
  return db;
}
function initSchema(db) {
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
function ensureCorrespondenceColumns(db) {
  const columns = db.prepare("PRAGMA table_info(correspondences)").all();
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
function ensureCorrespondenceUserReferenceTriggers(db) {
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
function hasRows(db, tableName) {
  const row = db.prepare(`SELECT COUNT(1) as count FROM ${tableName}`).get();
  return row.count > 0;
}
function seedDatabase(db) {
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
        (id, employeeCode, fullName, email, branchId, departmentId, isActive, canLogin, canOwnActions, roles)
       VALUES
        (@id, @employeeCode, @fullName, @email, @branchId, @departmentId, @isActive, @canLogin, @canOwnActions, @roles)`
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
}
function parseUser(row) {
  return {
    id: row.id,
    employeeCode: row.employeeCode,
    fullName: row.fullName,
    email: row.email,
    branchId: row.branchId,
    departmentId: row.departmentId,
    isActive: row.isActive === 1,
    canLogin: row.canLogin === 1,
    canOwnActions: row.canOwnActions === 1,
    roles: JSON.parse(row.roles)
  };
}
function getUserMap(db) {
  const rows = db.prepare("SELECT * FROM users").all();
  return new Map(rows.map((row) => {
    const user = parseUser(row);
    return [user.id, user];
  }));
}
function resolveAuditUser(userId, fallbackId, usersById) {
  const resolvedId = userId && userId.length > 0 ? userId : fallbackId;
  const user = usersById.get(resolvedId);
  if (!user) {
    throw new Error(`Audit user '${resolvedId}' was not found.`);
  }
  return user;
}
function toRow(correspondence) {
  return {
    ...correspondence,
    createById: correspondence.createBy.id,
    updateById: correspondence.updateBy.id,
    correspondenceDate: correspondence.correspondenceDate ? correspondence.correspondenceDate.toISOString() : null,
    receivedDate: correspondence.receivedDate.toISOString(),
    dueDate: correspondence.dueDate ? correspondence.dueDate.toISOString() : null,
    createdAt: correspondence.createdAt.toISOString(),
    updatedAt: correspondence.updatedAt.toISOString()
  };
}
function fromRow(row, usersById) {
  return {
    ...row,
    correspondenceDate: row.correspondenceDate ? new Date(row.correspondenceDate) : void 0,
    receivedDate: new Date(row.receivedDate),
    dueDate: row.dueDate ? new Date(row.dueDate) : void 0,
    createdAt: new Date(row.createdAt),
    updatedAt: new Date(row.updatedAt),
    createBy: resolveAuditUser(row.createById, row.registeredById, usersById),
    updateBy: resolveAuditUser(row.updateById, row.registeredById, usersById)
  };
}
class SqliteCorrespondenceRepository {
  constructor(db) {
    this.db = db;
  }
  async findById(id) {
    const row = this.db.prepare("SELECT * FROM correspondences WHERE id = ?").get(id);
    if (!row) {
      return null;
    }
    const usersById = getUserMap(this.db);
    return fromRow(row, usersById);
  }
  async findAll() {
    const rows = this.db.prepare("SELECT * FROM correspondences").all();
    const usersById = getUserMap(this.db);
    return rows.map((row) => fromRow(row, usersById));
  }
  async findByBranch(branchId) {
    const rows = this.db.prepare("SELECT * FROM correspondences WHERE branchId = ?").all(branchId);
    const usersById = getUserMap(this.db);
    return rows.map((row) => fromRow(row, usersById));
  }
  async save(correspondence) {
    if (correspondence.summary && correspondence.summary.length > 500) {
      throw new Error("Summary cannot exceed 500 characters.");
    }
    this.db.prepare(
      `INSERT OR REPLACE INTO correspondences
          (id, reference, subject, direction, fromTo, organisation, correspondenceDate, branchId,
           departmentId, registeredById, recipientId, actionOwnerId, status, receivedDate,
           dueDate, createdAt, updatedAt, createById, updateById, summary)
         VALUES
          (@id, @reference, @subject, @direction, @fromTo, @organisation, @correspondenceDate,
           @branchId, @departmentId, @registeredById, @recipientId, @actionOwnerId, @status,
           @receivedDate, @dueDate, @createdAt, @updatedAt, @createById, @updateById, @summary)`
    ).run(toRow(correspondence));
  }
  async update(id, changes) {
    if (changes.summary && changes.summary.length > 500) {
      throw new Error("Summary cannot exceed 500 characters.");
    }
    const existing = await this.findById(id);
    if (!existing) {
      return;
    }
    const { createBy, updateBy, ...restChanges } = changes;
    const effectiveUpdateBy = updateBy ?? existing.updateBy;
    const updatePayload = {
      ...restChanges,
      createById: createBy ? createBy.id : void 0,
      updateById: effectiveUpdateBy.id,
      correspondenceDate: changes.correspondenceDate ? changes.correspondenceDate.toISOString() : changes.correspondenceDate === void 0 ? void 0 : null,
      receivedDate: changes.receivedDate ? changes.receivedDate.toISOString() : void 0,
      dueDate: changes.dueDate ? changes.dueDate.toISOString() : changes.dueDate === void 0 ? void 0 : null,
      createdAt: changes.createdAt ? changes.createdAt.toISOString() : void 0,
      updatedAt: (/* @__PURE__ */ new Date()).toISOString()
    };
    const sets = Object.keys(updatePayload).filter((k) => updatePayload[k] !== void 0).map((k) => `${k} = @${k}`).join(", ");
    if (!sets) {
      return;
    }
    this.db.prepare(`UPDATE correspondences SET ${sets} WHERE id = @id`).run({ ...updatePayload, id });
  }
}
function rowToUser(row) {
  return {
    ...row,
    isActive: Boolean(row["isActive"]),
    canLogin: Boolean(row["canLogin"]),
    canOwnActions: Boolean(row["canOwnActions"]),
    roles: JSON.parse(row["roles"])
  };
}
class SqliteUserRepository {
  constructor(db) {
    this.db = db;
  }
  async findById(id) {
    const row = this.db.prepare("SELECT * FROM users WHERE id = ?").get(id);
    return row ? rowToUser(row) : null;
  }
  async findAll() {
    return this.db.prepare("SELECT * FROM users").all().map(rowToUser);
  }
  async findByBranch(branchId) {
    return this.db.prepare("SELECT * FROM users WHERE branchId = ?").all(branchId).map(rowToUser);
  }
  async save(user) {
    this.db.prepare(
      `INSERT OR REPLACE INTO users
        (id, employeeCode, fullName, email, branchId, departmentId, isActive, canLogin, canOwnActions, roles)
       VALUES
        (@id, @employeeCode, @fullName, @email, @branchId, @departmentId, @isActive, @canLogin, @canOwnActions, @roles)`
    ).run({
      ...user,
      isActive: user.isActive ? 1 : 0,
      canLogin: user.canLogin ? 1 : 0,
      canOwnActions: user.canOwnActions ? 1 : 0,
      roles: JSON.stringify(user.roles)
    });
  }
  async delete(id) {
    this.db.prepare("DELETE FROM users WHERE id = ?").run(id);
  }
}
function rowToBranch(row) {
  return { ...row, isActive: Boolean(row["isActive"]) };
}
class SqliteBranchRepository {
  constructor(db) {
    this.db = db;
  }
  async findById(id) {
    const row = this.db.prepare("SELECT * FROM branches WHERE id = ?").get(id);
    return row ? rowToBranch(row) : null;
  }
  async findAll() {
    return this.db.prepare("SELECT * FROM branches").all().map(rowToBranch);
  }
  async save(branch) {
    this.db.prepare(
      `INSERT OR REPLACE INTO branches (id, code, name, isActive)
       VALUES (@id, @code, @name, @isActive)`
    ).run({
      ...branch,
      isActive: branch.isActive ? 1 : 0
    });
  }
  async delete(id) {
    this.db.prepare("DELETE FROM branches WHERE id = ?").run(id);
  }
}
function rowToDepartment(row) {
  return { ...row, isActive: Boolean(row["isActive"]) };
}
class SqliteDepartmentRepository {
  constructor(db) {
    this.db = db;
  }
  async findById(id) {
    const row = this.db.prepare("SELECT * FROM departments WHERE id = ?").get(id);
    return row ? rowToDepartment(row) : null;
  }
  async findAll() {
    return this.db.prepare("SELECT * FROM departments").all().map(
      rowToDepartment
    );
  }
  async save(department) {
    this.db.prepare(
      `INSERT OR REPLACE INTO departments (id, code, name, isActive)
       VALUES (@id, @code, @name, @isActive)`
    ).run({
      ...department,
      isActive: department.isActive ? 1 : 0
    });
  }
  async delete(id) {
    this.db.prepare("DELETE FROM departments WHERE id = ?").run(id);
  }
}
function rowToConfig$1(row) {
  return { ...row, isActive: Boolean(row["isActive"]) };
}
class SqliteReferenceConfigRepository {
  constructor(db) {
    this.db = db;
  }
  async findAll() {
    return this.db.prepare("SELECT * FROM reference_configs").all().map(rowToConfig$1);
  }
  async findActive() {
    return this.db.prepare("SELECT * FROM reference_configs WHERE isActive = 1").all().map(rowToConfig$1);
  }
}
class NodemailerSqliteMailer {
  constructor(config) {
    this.config = config;
    this.transport = nodemailer.createTransport({
      host: config.host,
      port: config.port,
      secure: config.secure,
      auth: config.user && config.pass ? {
        user: config.user,
        pass: config.pass
      } : void 0,
      connectionTimeout: config.connectionTimeoutMs,
      greetingTimeout: config.connectionTimeoutMs,
      socketTimeout: config.connectionTimeoutMs
    });
  }
  transport;
  async send(message) {
    await this.transport.sendMail({
      from: this.config.fromAddress,
      to: message.to,
      subject: message.subject,
      text: message.text
    });
  }
}
class SqliteNotificationService {
  constructor(db, smtpSettingsService) {
    this.db = db;
    this.smtpSettingsService = smtpSettingsService;
  }
  async send(payload) {
    this.db.prepare(
      `INSERT INTO notifications (id, recipientId, subject, body, correspondenceId, sentAt)
         VALUES (@id, @recipientId, @subject, @body, @correspondenceId, @sentAt)`
    ).run({
      id: randomUUID(),
      recipientId: payload.recipientId,
      subject: payload.subject,
      body: payload.body,
      correspondenceId: payload.correspondenceId ?? null,
      sentAt: (/* @__PURE__ */ new Date()).toISOString()
    });
    const row = this.db.prepare("SELECT email FROM users WHERE id = ?").get(payload.recipientId);
    const recipientEmail = row?.email;
    if (!recipientEmail) {
      return;
    }
    const config = await this.smtpSettingsService.getConfig();
    const mailer = new NodemailerSqliteMailer(config);
    await mailer.send({
      to: recipientEmail,
      subject: payload.subject,
      text: payload.body
    });
  }
}
class SqliteSequenceStore {
  constructor(db) {
    this.db = db;
  }
  next(key) {
    this.db.prepare(
      `INSERT INTO sequences (key, value) VALUES (?, 1)
         ON CONFLICT(key) DO UPDATE SET value = value + 1`
    ).run(key);
    const row = this.db.prepare("SELECT value FROM sequences WHERE key = ?").get(key);
    return row.value;
  }
}
function buildPlatformIndicator(input) {
  const { target, label, initials, backgroundColor, textColor = "#ffffff" } = input;
  const svg = [
    '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 16 16" role="img" aria-label="platform">',
    '<rect x="0.5" y="0.5" width="15" height="15" rx="4" fill="' + backgroundColor + '"/>',
    '<text x="8" y="11" text-anchor="middle" font-family="Segoe UI, Arial, sans-serif" font-size="7" font-weight="700" fill="' + textColor + '">' + initials + "</text>",
    "</svg>"
  ].join("");
  return {
    target,
    label,
    iconDataUrl: "data:image/svg+xml," + encodeURIComponent(svg)
  };
}
function toEvent(row) {
  return {
    id: row.id,
    correspondenceId: row.correspondenceId,
    eventType: row.eventType,
    status: row.status,
    payloadJson: row.payloadJson ?? void 0,
    errorMessage: row.errorMessage ?? void 0,
    createdAt: new Date(row.createdAt),
    createdById: row.createdById
  };
}
class SqliteCorrespondenceAuditLogRepository {
  constructor(db) {
    this.db = db;
  }
  async append(event) {
    const createdAtIso = (/* @__PURE__ */ new Date()).toISOString();
    const id = randomUUID();
    this.db.prepare(
      `INSERT INTO correspondence_audit_log
       (id, correspondenceId, eventType, status, payloadJson, errorMessage, createdAt, createdById)
       VALUES
       (@id, @correspondenceId, @eventType, @status, @payloadJson, @errorMessage, @createdAt, @createdById)`
    ).run({
      id,
      correspondenceId: event.correspondenceId,
      eventType: event.eventType,
      status: event.status,
      payloadJson: event.payloadJson ?? null,
      errorMessage: event.errorMessage ?? null,
      createdAt: createdAtIso,
      createdById: event.createdById
    });
    return {
      id,
      correspondenceId: event.correspondenceId,
      eventType: event.eventType,
      status: event.status,
      payloadJson: event.payloadJson,
      errorMessage: event.errorMessage,
      createdAt: new Date(createdAtIso),
      createdById: event.createdById
    };
  }
  async findByCorrespondence(correspondenceId) {
    const rows = this.db.prepare(
      `SELECT id, correspondenceId, eventType, status, payloadJson, errorMessage, createdAt, createdById
       FROM correspondence_audit_log
       WHERE correspondenceId = ?
       ORDER BY createdAt ASC`
    ).all(correspondenceId);
    return rows.map(toEvent);
  }
}
class SqlitePostCaptureWorkflowService {
  constructor(notifications, auditLog) {
    this.notifications = notifications;
    this.auditLog = auditLog;
  }
  async execute(command) {
    if (command.mode === "BASIC") {
      await this.executeBasic(command);
      return;
    }
    await this.executeExtended(command);
  }
  async executeBasic(command) {
    const recipientId = this.resolveRecipientId(command);
    const subject = `Correspondence ${command.correspondence.reference} received`;
    const body = [
      "A new correspondence has been captured and assigned.",
      `Reference: ${command.correspondence.reference}`,
      `Subject: ${command.correspondence.subject}`
    ].join("\n");
    await this.notifications.send({
      recipientId,
      subject,
      body,
      correspondenceId: command.correspondence.id
    });
    await this.auditLog.append({
      correspondenceId: command.correspondence.id,
      eventType: "NOTIFICATION_SENT",
      status: "SUCCESS",
      payloadJson: JSON.stringify({ mode: command.mode, recipientId, subject }),
      createdById: command.actor.id
    });
  }
  async executeExtended(command) {
    await this.auditLog.append({
      correspondenceId: command.correspondence.id,
      eventType: "AGENT_CALL",
      status: "SUCCESS",
      payloadJson: JSON.stringify({
        reference: command.correspondence.reference,
        metadata: command.context?.metadata ?? {},
        hasDigitalContent: Boolean(command.context?.digitalContent)
      }),
      createdById: command.actor.id
    });
    const simulatedResponse = this.buildSimulatedAgentResponse(command);
    await this.auditLog.append({
      correspondenceId: command.correspondence.id,
      eventType: "AGENT_RESPONSE",
      status: "SUCCESS",
      payloadJson: JSON.stringify(simulatedResponse),
      createdById: command.actor.id
    });
    const recipientId = this.resolveRecipientId(command);
    await this.notifications.send({
      recipientId,
      subject: simulatedResponse.mail.subject,
      body: simulatedResponse.mail.body,
      correspondenceId: command.correspondence.id
    });
    await this.auditLog.append({
      correspondenceId: command.correspondence.id,
      eventType: "NOTIFICATION_SENT",
      status: "SUCCESS",
      payloadJson: JSON.stringify({ mode: "EXTENDED", recipientId, subject: simulatedResponse.mail.subject }),
      createdById: command.actor.id
    });
  }
  resolveRecipientId(command) {
    return command.correspondence.recipientId ?? command.correspondence.actionOwnerId ?? command.actor.id;
  }
  buildSimulatedAgentResponse(command) {
    return {
      summary: `Automated summary for ${command.correspondence.reference}`,
      suggestedAction: "Assign to action owner and acknowledge sender",
      ownerId: command.correspondence.actionOwnerId,
      deadline: command.correspondence.dueDate?.toISOString() ?? new Date(Date.now() + 3 * 24 * 3600 * 1e3).toISOString(),
      confidenceScore: 0.84,
      mail: {
        subject: `Action required: ${command.correspondence.reference}`,
        body: [
          "The correspondence has been analyzed by the simulated agent.",
          `Summary: Automated summary for ${command.correspondence.reference}`,
          "Suggested action: Assign to action owner and acknowledge sender"
        ].join("\n")
      }
    };
  }
}
function rowToConfig(row) {
  return {
    host: row.host,
    port: row.port,
    secure: row.secure === 1,
    user: row.user ?? void 0,
    pass: row.pass ?? void 0,
    fromAddress: row.fromAddress,
    connectionTimeoutMs: row.connectionTimeoutMs
  };
}
class SqliteSmtpSettingsService {
  constructor(db, fallbackConfig = getRuntimeSmtpConfig()) {
    this.db = db;
    this.fallbackConfig = fallbackConfig;
  }
  async getConfig() {
    const row = this.db.prepare(
      `SELECT host, port, secure, user, pass, fromAddress, connectionTimeoutMs
         FROM smtp_settings
         WHERE id = 1`
    ).get();
    if (!row) {
      return { ...this.fallbackConfig };
    }
    return rowToConfig(row);
  }
  async saveConfig(config) {
    this.db.prepare(
      `INSERT INTO smtp_settings
          (id, host, port, secure, user, pass, fromAddress, connectionTimeoutMs, updatedAt)
         VALUES
          (1, @host, @port, @secure, @user, @pass, @fromAddress, @connectionTimeoutMs, @updatedAt)
         ON CONFLICT(id)
         DO UPDATE SET
           host = excluded.host,
           port = excluded.port,
           secure = excluded.secure,
           user = excluded.user,
           pass = excluded.pass,
           fromAddress = excluded.fromAddress,
           connectionTimeoutMs = excluded.connectionTimeoutMs,
           updatedAt = excluded.updatedAt`
    ).run({
      host: config.host,
      port: config.port,
      secure: config.secure ? 1 : 0,
      user: config.user ?? null,
      pass: config.pass ?? null,
      fromAddress: config.fromAddress,
      connectionTimeoutMs: config.connectionTimeoutMs,
      updatedAt: (/* @__PURE__ */ new Date()).toISOString()
    });
  }
  async sendTestEmail(command) {
    const subject = command.subject ?? "SMTP Test Email";
    const body = command.body ?? "SMTP configuration test completed successfully.";
    await new NodemailerSqliteMailer(command.config).send({
      to: command.to,
      subject,
      text: body
    });
  }
}
function rowToDefinition(row) {
  return {
    id: row["id"],
    code: row["code"],
    label: row["label"],
    description: row["description"] ?? void 0,
    category: row["category"],
    requiresOwner: Boolean(row["requiresOwner"]),
    triggerMode: row["triggerMode"],
    workflowEnabled: Boolean(row["workflowEnabled"]),
    workflowMethod: row["workflowMethod"],
    workflowEndpointUrl: row["workflowEndpointUrl"] ?? void 0,
    workflowTimeoutMs: Number(row["workflowTimeoutMs"]),
    authType: row["authType"],
    authSecretRef: row["authSecretRef"] ?? void 0,
    payloadTemplate: row["payloadTemplate"] ?? void 0,
    retryMaxAttempts: Number(row["retryMaxAttempts"]),
    retryBackoffMs: Number(row["retryBackoffMs"]),
    defaultSlaDays: row["defaultSlaDays"] === null ? void 0 : Number(row["defaultSlaDays"]),
    isActive: Boolean(row["isActive"]),
    createdAt: new Date(row["createdAt"]),
    updatedAt: new Date(row["updatedAt"])
  };
}
class SqliteCorrespondenceActionDefinitionRepository {
  constructor(db) {
    this.db = db;
  }
  async findById(id) {
    const row = this.db.prepare("SELECT * FROM correspondence_action_definitions WHERE id = ?").get(id);
    return row ? rowToDefinition(row) : null;
  }
  async findAll() {
    return this.db.prepare("SELECT * FROM correspondence_action_definitions ORDER BY code").all().map(rowToDefinition);
  }
  async findActive() {
    return this.db.prepare("SELECT * FROM correspondence_action_definitions WHERE isActive = 1 ORDER BY code").all().map(rowToDefinition);
  }
  async save(definition) {
    this.db.prepare(
      `INSERT INTO correspondence_action_definitions (
          id, code, label, description, category, requiresOwner, triggerMode,
          workflowEnabled, workflowMethod, workflowEndpointUrl, workflowTimeoutMs,
          authType, authSecretRef, payloadTemplate, retryMaxAttempts, retryBackoffMs,
          defaultSlaDays, isActive, createdAt, updatedAt
        ) VALUES (
          @id, @code, @label, @description, @category, @requiresOwner, @triggerMode,
          @workflowEnabled, @workflowMethod, @workflowEndpointUrl, @workflowTimeoutMs,
          @authType, @authSecretRef, @payloadTemplate, @retryMaxAttempts, @retryBackoffMs,
          @defaultSlaDays, @isActive, @createdAt, @updatedAt
        )
        ON CONFLICT(id) DO UPDATE SET
          code = excluded.code,
          label = excluded.label,
          description = excluded.description,
          category = excluded.category,
          requiresOwner = excluded.requiresOwner,
          triggerMode = excluded.triggerMode,
          workflowEnabled = excluded.workflowEnabled,
          workflowMethod = excluded.workflowMethod,
          workflowEndpointUrl = excluded.workflowEndpointUrl,
          workflowTimeoutMs = excluded.workflowTimeoutMs,
          authType = excluded.authType,
          authSecretRef = excluded.authSecretRef,
          payloadTemplate = excluded.payloadTemplate,
          retryMaxAttempts = excluded.retryMaxAttempts,
          retryBackoffMs = excluded.retryBackoffMs,
          defaultSlaDays = excluded.defaultSlaDays,
          isActive = excluded.isActive,
          updatedAt = excluded.updatedAt`
    ).run({
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
  async delete(id) {
    this.db.prepare("DELETE FROM correspondence_action_definitions WHERE id = ?").run(id);
  }
}
const sqliteMainProcessPlatformIndicator = buildPlatformIndicator({
  target: "SQLITE",
  label: "SQLite (Main)",
  initials: "SQ",
  backgroundColor: "#5742d6"
});
function createSqliteHostAdapter(dbPath, options = {}) {
  const db = openDatabase(dbPath);
  const smtpSettings = new SqliteSmtpSettingsService(db, options.smtpConfig ?? getRuntimeSmtpConfig());
  const notifications = new SqliteNotificationService(db, smtpSettings);
  const correspondenceAuditLog = new SqliteCorrespondenceAuditLogRepository(db);
  return {
    platform: sqliteMainProcessPlatformIndicator,
    correspondences: new SqliteCorrespondenceRepository(db),
    users: new SqliteUserRepository(db),
    branches: new SqliteBranchRepository(db),
    departments: new SqliteDepartmentRepository(db),
    actionDefinitions: new SqliteCorrespondenceActionDefinitionRepository(db),
    referenceConfigs: new SqliteReferenceConfigRepository(db),
    smtpSettings,
    notifications,
    correspondenceAuditLog,
    postCaptureWorkflow: new SqlitePostCaptureWorkflowService(notifications, correspondenceAuditLog),
    sequenceStore: new SqliteSequenceStore(db)
  };
}
let adapter;
function configureStoragePaths() {
  if (process.platform !== "win32") {
    return;
  }
  const localAppData = process.env["LOCALAPPDATA"];
  if (!localAppData) {
    return;
  }
  const baseDir = path.join(localAppData, "Correspondance Management");
  const userDataDir = path.join(baseDir, "userData");
  const sessionDataDir = path.join(baseDir, "sessionData");
  const cacheDir = path.join(baseDir, "cache");
  fs.mkdirSync(userDataDir, { recursive: true });
  fs.mkdirSync(sessionDataDir, { recursive: true });
  fs.mkdirSync(cacheDir, { recursive: true });
  app.setPath("userData", userDataDir);
  app.setPath("sessionData", sessionDataDir);
  app.setPath("cache", cacheDir);
  app.commandLine.appendSwitch("disk-cache-dir", cacheDir);
}
configureStoragePaths();
function createWindow() {
  const win = new BrowserWindow({
    width: 1280,
    height: 800,
    webPreferences: {
      preload: path.join(__dirname, "../preload/preload.mjs"),
      contextIsolation: true,
      nodeIntegration: false
    }
  });
  if (!app.isPackaged && process.env["ELECTRON_RENDERER_URL"]) {
    win.loadURL(process.env["ELECTRON_RENDERER_URL"]);
  } else {
    win.loadFile(path.join(__dirname, "../../dist/index.html"));
  }
}
function registerIpcHandlers() {
  ipcMain.handle(
    "correspondences:findById",
    (_e, id) => adapter.correspondences.findById(id)
  );
  ipcMain.handle("correspondences:findAll", () => adapter.correspondences.findAll());
  ipcMain.handle(
    "correspondences:findByBranch",
    (_e, branchId) => adapter.correspondences.findByBranch(branchId)
  );
  ipcMain.handle(
    "correspondences:save",
    (_e, c) => adapter.correspondences.save(c)
  );
  ipcMain.handle(
    "correspondences:update",
    (_e, id, changes) => adapter.correspondences.update(id, changes)
  );
  ipcMain.handle("users:findById", (_e, id) => adapter.users.findById(id));
  ipcMain.handle("users:findAll", () => adapter.users.findAll());
  ipcMain.handle(
    "users:findByBranch",
    (_e, branchId) => adapter.users.findByBranch(branchId)
  );
  ipcMain.handle("users:save", (_e, user) => adapter.users.save(user));
  ipcMain.handle("users:delete", (_e, id) => adapter.users.delete(id));
  ipcMain.handle("branches:findById", (_e, id) => adapter.branches.findById(id));
  ipcMain.handle("branches:findAll", () => adapter.branches.findAll());
  ipcMain.handle("branches:save", (_e, branch) => adapter.branches.save(branch));
  ipcMain.handle("branches:delete", (_e, id) => adapter.branches.delete(id));
  ipcMain.handle("departments:findById", (_e, id) => adapter.departments.findById(id));
  ipcMain.handle("departments:findAll", () => adapter.departments.findAll());
  ipcMain.handle(
    "departments:save",
    (_e, department) => adapter.departments.save(department)
  );
  ipcMain.handle("departments:delete", (_e, id) => adapter.departments.delete(id));
  ipcMain.handle("referenceConfigs:findAll", () => adapter.referenceConfigs.findAll());
  ipcMain.handle("referenceConfigs:findActive", () => adapter.referenceConfigs.findActive());
  ipcMain.handle(
    "actionDefinitions:findById",
    (_e, id) => adapter.actionDefinitions.findById(id)
  );
  ipcMain.handle("actionDefinitions:findAll", () => adapter.actionDefinitions.findAll());
  ipcMain.handle("actionDefinitions:findActive", () => adapter.actionDefinitions.findActive());
  ipcMain.handle(
    "actionDefinitions:save",
    (_e, definition) => adapter.actionDefinitions.save(definition)
  );
  ipcMain.handle("actionDefinitions:delete", (_e, id) => adapter.actionDefinitions.delete(id));
  ipcMain.handle(
    "notifications:send",
    (_e, payload) => adapter.notifications.send(payload)
  );
  ipcMain.handle("smtpSettings:getConfig", () => adapter.smtpSettings.getConfig());
  ipcMain.handle(
    "smtpSettings:saveConfig",
    (_e, config) => adapter.smtpSettings.saveConfig(config)
  );
  ipcMain.handle(
    "smtpSettings:sendTestEmail",
    (_e, command) => adapter.smtpSettings.sendTestEmail(command)
  );
  ipcMain.handle(
    "correspondenceAuditLog:append",
    (_e, event) => adapter.correspondenceAuditLog.append(event)
  );
  ipcMain.handle(
    "correspondenceAuditLog:findByCorrespondence",
    (_e, correspondenceId) => adapter.correspondenceAuditLog.findByCorrespondence(correspondenceId)
  );
  ipcMain.handle(
    "postCaptureWorkflow:execute",
    (_e, command) => adapter.postCaptureWorkflow.execute(command)
  );
  ipcMain.handle(
    "sequenceStore:next",
    (_e, key) => Promise.resolve(adapter.sequenceStore.next(key))
  );
}
app.whenReady().then(() => {
  const dbPath = path.join(app.getPath("userData"), "coreman.db");
  adapter = createSqliteHostAdapter(dbPath);
  registerIpcHandlers();
  createWindow();
  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});
app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});
