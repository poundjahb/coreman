import { app, BrowserWindow, ipcMain } from "electron";
import path from "path";
import BetterSqlite3 from "better-sqlite3";
import { randomUUID } from "crypto";
import __cjs_mod__ from "node:module";
const __filename = import.meta.filename;
const __dirname = import.meta.dirname;
const require2 = __cjs_mod__.createRequire(import.meta.url);
const ALL_ROLE_CODES = [
  "ADMIN",
  "RECEPTIONIST",
  "RECIPIENT",
  "ACTION_OWNER",
  "COPIED_VIEWER",
  "DASHBOARD_VIEWER"
];
const demoBranches = [
  { id: "b-001", code: "HQ", name: "Headquarters", isActive: true },
  { id: "b-002", code: "BRN-02", name: "Branch 02", isActive: true }
];
const demoDepartments = [
  { id: "d-001", code: "OPS", name: "Operations", isActive: true },
  { id: "d-002", code: "FIN", name: "Finance", isActive: true }
];
const demoUsers = [
  {
    id: "u-001",
    employeeCode: "EMP-001",
    fullName: "Reception User",
    email: "reception@bank.local",
    branchId: "b-001",
    departmentId: "d-001",
    isActive: true,
    canLogin: true,
    canOwnActions: false,
    roles: ["RECEPTIONIST"]
  },
  {
    id: "u-002",
    employeeCode: "EMP-002",
    fullName: "Action Owner",
    email: "owner@bank.local",
    branchId: "b-001",
    departmentId: "d-001",
    isActive: true,
    canLogin: true,
    canOwnActions: true,
    roles: ["ACTION_OWNER"]
  },
  {
    id: "u-003",
    employeeCode: "EMP-003",
    fullName: "Recipient User",
    email: "recipient@bank.local",
    branchId: "b-002",
    departmentId: "d-002",
    isActive: true,
    canLogin: true,
    canOwnActions: false,
    roles: ["RECIPIENT"]
  },
  {
    id: "u-004",
    employeeCode: "EMP-000",
    fullName: "Default Super Admin",
    email: "superadmin@bank.local",
    branchId: "b-001",
    departmentId: "d-001",
    isActive: true,
    canLogin: true,
    canOwnActions: true,
    roles: [...ALL_ROLE_CODES]
  },
  {
    id: "u-005",
    employeeCode: "EMP-005",
    fullName: "Executive Viewer",
    email: "executive@bank.local",
    branchId: "b-001",
    departmentId: "d-002",
    isActive: true,
    canLogin: true,
    canOwnActions: false,
    roles: ["DASHBOARD_VIEWER", "COPIED_VIEWER"]
  }
];
const demoReferenceConfigs = [
  {
    id: "cfg-branch-dept",
    scope: "BRANCH_DEPARTMENT",
    branchId: "b-001",
    departmentId: "d-001",
    pattern: "{ORG}-{BRANCH}-{DEPT}-{YYYY}{MM}-{SEQ6}",
    resetPolicy: "MONTHLY",
    isActive: true
  },
  {
    id: "cfg-branch",
    scope: "BRANCH",
    branchId: "b-001",
    pattern: "{ORG}-{BRANCH}-{YYYY}{MM}-{SEQ5}",
    resetPolicy: "MONTHLY",
    isActive: true
  },
  {
    id: "cfg-global",
    scope: "GLOBAL",
    pattern: "{ORG}-{YYYY}{MM}-{SEQ4}",
    resetPolicy: "MONTHLY",
    isActive: true
  }
];
const demoCorrespondences = [
  {
    id: "c-001",
    reference: "BANK-HQ-OPS-202604-000001",
    subject: "Regulatory request for Q1 compliance returns",
    direction: "INCOMING",
    branchId: "b-001",
    departmentId: "d-001",
    registeredById: "u-001",
    recipientId: "u-003",
    actionOwnerId: "u-002",
    status: "IN_PROGRESS",
    receivedDate: "2026-04-20",
    dueDate: "2026-04-24",
    createdAt: "2026-04-20T08:00:00Z",
    updatedAt: "2026-04-20T08:00:00Z"
  },
  {
    id: "c-002",
    reference: "BANK-HQ-FIN-202604-000014",
    subject: "Treasury confirmation memo",
    direction: "OUTGOING",
    branchId: "b-001",
    departmentId: "d-002",
    registeredById: "u-001",
    recipientId: "u-005",
    actionOwnerId: "u-002",
    status: "AWAITING_REVIEW",
    receivedDate: "2026-04-20",
    dueDate: "2026-04-23",
    createdAt: "2026-04-20T09:00:00Z",
    updatedAt: "2026-04-20T09:00:00Z"
  },
  {
    id: "c-003",
    reference: "BANK-BRN-02-FIN-202604-000102",
    subject: "Branch audit exception follow-up",
    direction: "INCOMING",
    branchId: "b-002",
    departmentId: "d-002",
    registeredById: "u-001",
    recipientId: "u-003",
    actionOwnerId: "u-002",
    status: "NEW",
    receivedDate: "2026-04-18",
    dueDate: "2026-04-25",
    createdAt: "2026-04-18T10:00:00Z",
    updatedAt: "2026-04-18T10:00:00Z"
  }
];
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
      branchId        TEXT NOT NULL,
      departmentId    TEXT,
      registeredById  TEXT NOT NULL,
      recipientId     TEXT,
      actionOwnerId   TEXT,
      status          TEXT NOT NULL,
      receivedDate    TEXT NOT NULL,
      dueDate         TEXT,
      createdAt       TEXT NOT NULL,
      updatedAt       TEXT NOT NULL
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
        (id, reference, subject, direction, branchId, departmentId, registeredById,
         recipientId, actionOwnerId, status, receivedDate, dueDate, createdAt, updatedAt)
       VALUES
        (@id, @reference, @subject, @direction, @branchId, @departmentId, @registeredById,
         @recipientId, @actionOwnerId, @status, @receivedDate, @dueDate, @createdAt, @updatedAt)`
    );
    for (const correspondence of demoCorrespondences) {
      insertCorrespondence.run({
        ...correspondence,
        departmentId: correspondence.departmentId ?? null,
        recipientId: correspondence.recipientId ?? null,
        actionOwnerId: correspondence.actionOwnerId ?? null,
        dueDate: correspondence.dueDate ?? null
      });
    }
  }
}
class SqliteCorrespondenceRepository {
  constructor(db) {
    this.db = db;
  }
  async findById(id) {
    const row = this.db.prepare("SELECT * FROM correspondences WHERE id = ?").get(id);
    return row ?? null;
  }
  async findAll() {
    return this.db.prepare("SELECT * FROM correspondences").all();
  }
  async findByBranch(branchId) {
    return this.db.prepare("SELECT * FROM correspondences WHERE branchId = ?").all(branchId);
  }
  async save(correspondence) {
    this.db.prepare(
      `INSERT OR REPLACE INTO correspondences
          (id, reference, subject, direction, branchId, departmentId, registeredById,
           recipientId, actionOwnerId, status, receivedDate, dueDate, createdAt, updatedAt)
         VALUES
          (@id, @reference, @subject, @direction, @branchId, @departmentId, @registeredById,
           @recipientId, @actionOwnerId, @status, @receivedDate, @dueDate, @createdAt, @updatedAt)`
    ).run(correspondence);
  }
  async update(id, changes) {
    const sets = Object.keys(changes).map((k) => `${k} = @${k}`).join(", ");
    this.db.prepare(`UPDATE correspondences SET ${sets} WHERE id = @id`).run({ ...changes, id });
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
function rowToConfig(row) {
  return { ...row, isActive: Boolean(row["isActive"]) };
}
class SqliteReferenceConfigRepository {
  constructor(db) {
    this.db = db;
  }
  async findAll() {
    return this.db.prepare("SELECT * FROM reference_configs").all().map(rowToConfig);
  }
  async findActive() {
    return this.db.prepare("SELECT * FROM reference_configs WHERE isActive = 1").all().map(rowToConfig);
  }
}
class SqliteNotificationService {
  constructor(db) {
    this.db = db;
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
const sqliteMainProcessPlatformIndicator = buildPlatformIndicator({
  target: "SQLITE",
  label: "SQLite (Main)",
  initials: "SQ",
  backgroundColor: "#5742d6"
});
function createSqliteHostAdapter(dbPath) {
  const db = openDatabase(dbPath);
  return {
    platform: sqliteMainProcessPlatformIndicator,
    correspondences: new SqliteCorrespondenceRepository(db),
    users: new SqliteUserRepository(db),
    branches: new SqliteBranchRepository(db),
    departments: new SqliteDepartmentRepository(db),
    referenceConfigs: new SqliteReferenceConfigRepository(db),
    notifications: new SqliteNotificationService(db),
    sequenceStore: new SqliteSequenceStore(db)
  };
}
let adapter;
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
    "notifications:send",
    (_e, payload) => adapter.notifications.send(payload)
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
