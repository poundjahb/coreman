import Database from "better-sqlite3";
import path from "path";
import { fileURLToPath } from "url";
import fs from "fs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dataDir = path.join(__dirname, "..", "data");
const dbPath = path.join(dataDir, "coreman.db");

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
      details TEXT,
      createdAt TEXT NOT NULL,
      createdBy TEXT NOT NULL
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
  `);

  const correspondenceColumns = db.prepare("PRAGMA table_info(correspondences)").all() as Array<{ name: string }>;
  const hasSenderReference = correspondenceColumns.some((column) => column.name === "senderReference");
  if (!hasSenderReference) {
    db.exec("ALTER TABLE correspondences ADD COLUMN senderReference TEXT");
  }

  const hasRecipientId = correspondenceColumns.some((column) => column.name === "recipientId");
  if (!hasRecipientId) {
    db.exec("ALTER TABLE correspondences ADD COLUMN recipientId TEXT");
  }

  return db;
}
