import BetterSqlite3 from "better-sqlite3";
import { demoBranches, demoCorrespondences, demoDepartments, demoReferenceConfigs, demoUsers } from "../../../application/modules/admin/seedData";
export function openDatabase(dbPath) {
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
        const insertBranch = db.prepare(`INSERT INTO branches (id, code, name, isActive)
       VALUES (@id, @code, @name, @isActive)`);
        for (const branch of demoBranches) {
            insertBranch.run({ ...branch, isActive: branch.isActive ? 1 : 0 });
        }
    }
    if (!hasRows(db, "departments")) {
        const insertDepartment = db.prepare(`INSERT INTO departments (id, code, name, isActive)
       VALUES (@id, @code, @name, @isActive)`);
        for (const department of demoDepartments) {
            insertDepartment.run({ ...department, isActive: department.isActive ? 1 : 0 });
        }
    }
    if (!hasRows(db, "users")) {
        const insertUser = db.prepare(`INSERT INTO users
        (id, employeeCode, fullName, email, branchId, departmentId, isActive, canLogin, canOwnActions, roles)
       VALUES
        (@id, @employeeCode, @fullName, @email, @branchId, @departmentId, @isActive, @canLogin, @canOwnActions, @roles)`);
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
        const insertConfig = db.prepare(`INSERT INTO reference_configs
        (id, scope, branchId, departmentId, pattern, resetPolicy, isActive)
       VALUES
        (@id, @scope, @branchId, @departmentId, @pattern, @resetPolicy, @isActive)`);
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
        const insertCorrespondence = db.prepare(`INSERT INTO correspondences
        (id, reference, subject, direction, branchId, departmentId, registeredById,
         recipientId, actionOwnerId, status, receivedDate, dueDate, createdAt, updatedAt)
       VALUES
        (@id, @reference, @subject, @direction, @branchId, @departmentId, @registeredById,
         @recipientId, @actionOwnerId, @status, @receivedDate, @dueDate, @createdAt, @updatedAt)`);
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
