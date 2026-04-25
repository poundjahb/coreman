import type Database from "better-sqlite3";
import fs from "fs";
import path from "path";
import { createHash, randomUUID } from "crypto";
import {
  normalizeWorkflowPluginRow,
  readWorkflowConfig,
  type WorkflowPluginManifest,
  type WorkflowPluginRecord,
  type WorkflowPluginRefreshResult
} from "./types.js";

export function listWorkflowPlugins(db: Database.Database): WorkflowPluginRecord[] {
  const rows = db.prepare("SELECT * FROM workflow_plugins ORDER BY name COLLATE NOCASE ASC, pluginKey ASC").all() as Array<Record<string, unknown>>;
  return rows.map(normalizeWorkflowPluginRow);
}

export function refreshWorkflowPlugins(db: Database.Database): WorkflowPluginRefreshResult {
  const config = readWorkflowConfig();
  const pluginRoot = resolvePluginRoot(config.pluginRoot, config.platformTarget);
  const platformRoot = path.join(pluginRoot, config.platformTarget);
  const now = new Date().toISOString();

  if (!fs.existsSync(platformRoot)) {
    fs.mkdirSync(platformRoot, { recursive: true });
  }

  const discoveredKeys = new Set<string>();
  let invalidCount = 0;

  for (const entry of fs.readdirSync(platformRoot, { withFileTypes: true })) {
    if (!entry.isDirectory()) {
      continue;
    }

    const pluginDirectory = path.join(platformRoot, entry.name);
    const manifestPath = path.join(pluginDirectory, "plugin.json");
    const fallbackPluginKey = `invalid:${config.platformTarget}:${entry.name}`;

    let record: WorkflowPluginRecord;
    if (!fs.existsSync(manifestPath)) {
      record = buildInvalidRecord(fallbackPluginKey, pluginDirectory, now, ["Missing plugin.json manifest."]);
    } else {
      record = readPluginRecord(pluginDirectory, manifestPath, now, config.allowedApiVersion, config.platformTarget);
    }

    discoveredKeys.add(record.pluginKey);
    if (!record.isValid) {
      invalidCount += 1;
    }

    upsertWorkflowPlugin(db, record);
    ensureDefaultCorrespondenceCreatedBinding(db, record, now);
  }

  const existingRows = db.prepare("SELECT pluginKey, sourcePath FROM workflow_plugins WHERE platformTarget = ?").all(config.platformTarget) as Array<{
    pluginKey: string;
    sourcePath: string;
  }>;

  for (const row of existingRows) {
    if (!discoveredKeys.has(row.pluginKey)) {
      db.prepare("DELETE FROM workflow_bindings WHERE pluginKey = ?").run(row.pluginKey);
      db.prepare("DELETE FROM workflow_plugins WHERE pluginKey = ?").run(row.pluginKey);
    }
  }

  return {
    discoveredCount: discoveredKeys.size,
    invalidCount,
    updatedAt: now
  };
}

export function validatePluginManifest(
  raw: unknown,
  pluginDirectory: string,
  allowedApiVersion: string,
  expectedPlatformTarget: "SERVER" | "POWERAPP"
): { manifest: WorkflowPluginManifest | null; errors: string[]; checksum: string } {
  const errors: string[] = [];
  const candidate = (raw ?? {}) as Record<string, unknown>;
  const pluginKey = typeof candidate.pluginKey === "string" ? candidate.pluginKey.trim() : "";
  const name = typeof candidate.name === "string" ? candidate.name.trim() : "";
  const description = typeof candidate.description === "string" ? candidate.description.trim() : "";
  const version = typeof candidate.version === "string" ? candidate.version.trim() : "";
  const apiVersion = typeof candidate.apiVersion === "string" ? candidate.apiVersion.trim() : "";
  const platformTarget = candidate.platformTarget === "POWERAPP" ? "POWERAPP" : candidate.platformTarget === "SERVER" ? "SERVER" : null;
  const supportedTriggers = Array.isArray(candidate.supportedTriggers)
    ? candidate.supportedTriggers.filter((item): item is string => typeof item === "string" && item.trim().length > 0)
    : [];
  const entryFile = typeof candidate.entryFile === "string" ? candidate.entryFile.trim() : "";
  const enabledByDefault = candidate.enabledByDefault !== false;
  const checksum = createPluginChecksum(pluginDirectory, entryFile);

  if (!pluginKey) {
    errors.push("pluginKey is required.");
  }
  if (!name) {
    errors.push("name is required.");
  }
  if (!description) {
    errors.push("description is required.");
  }
  if (!version) {
    errors.push("version is required.");
  }
  if (!apiVersion) {
    errors.push("apiVersion is required.");
  } else if (!matchesAllowedApiVersion(apiVersion, allowedApiVersion)) {
    errors.push(`apiVersion ${apiVersion} is not compatible with ${allowedApiVersion}.`);
  }
  if (!platformTarget) {
    errors.push("platformTarget must be SERVER or POWERAPP.");
  } else if (platformTarget !== expectedPlatformTarget) {
    errors.push(`platformTarget must be ${expectedPlatformTarget} for this server.`);
  }
  if (supportedTriggers.length === 0) {
    errors.push("supportedTriggers must contain at least one trigger code.");
  }
  if (!entryFile) {
    errors.push("entryFile is required.");
  } else if (!fs.existsSync(path.join(pluginDirectory, entryFile))) {
    errors.push(`entryFile ${entryFile} was not found.`);
  }

  if (errors.length > 0 || !platformTarget) {
    return { manifest: null, errors, checksum };
  }

  return {
    manifest: {
      pluginKey,
      name,
      description,
      version,
      apiVersion,
      platformTarget,
      supportedTriggers,
      entryFile,
      enabledByDefault
    },
    errors,
    checksum
  };
}

function readPluginRecord(
  pluginDirectory: string,
  manifestPath: string,
  discoveredAt: string,
  allowedApiVersion: string,
  expectedPlatformTarget: "SERVER" | "POWERAPP"
): WorkflowPluginRecord {
  try {
    const raw = JSON.parse(fs.readFileSync(manifestPath, "utf8")) as unknown;
    const { manifest, errors, checksum } = validatePluginManifest(raw, pluginDirectory, allowedApiVersion, expectedPlatformTarget);

    if (!manifest) {
      return buildInvalidRecord(
        resolvePluginKey(raw, pluginDirectory, expectedPlatformTarget),
        pluginDirectory,
        discoveredAt,
        errors,
        checksum
      );
    }

    return {
      ...manifest,
      sourcePath: pluginDirectory,
      checksum,
      isEnabled: manifest.enabledByDefault,
      isValid: true,
      validationErrors: [],
      discoveredAt,
      updatedAt: discoveredAt
    };
  } catch (error) {
    return buildInvalidRecord(
      `invalid:${expectedPlatformTarget}:${path.basename(pluginDirectory)}`,
      pluginDirectory,
      discoveredAt,
      [error instanceof Error ? error.message : "Failed to parse plugin manifest."]
    );
  }
}

function upsertWorkflowPlugin(db: Database.Database, record: WorkflowPluginRecord): { isNew: boolean } {
  const existing = db.prepare("SELECT isEnabled FROM workflow_plugins WHERE pluginKey = ?").get(record.pluginKey) as
    | { isEnabled: number }
    | undefined;
  const isEnabled = existing ? Boolean(existing.isEnabled) : record.isEnabled;

  db.prepare(
    `INSERT INTO workflow_plugins (
      pluginKey, name, description, version, apiVersion, platformTarget, supportedTriggersJson,
      entryFile, sourcePath, checksum, isEnabled, isValid, validationErrorsJson, discoveredAt, updatedAt
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(pluginKey) DO UPDATE SET
      name = excluded.name,
      description = excluded.description,
      version = excluded.version,
      apiVersion = excluded.apiVersion,
      platformTarget = excluded.platformTarget,
      supportedTriggersJson = excluded.supportedTriggersJson,
      entryFile = excluded.entryFile,
      sourcePath = excluded.sourcePath,
      checksum = excluded.checksum,
      isEnabled = excluded.isEnabled,
      isValid = excluded.isValid,
      validationErrorsJson = excluded.validationErrorsJson,
      discoveredAt = excluded.discoveredAt,
      updatedAt = excluded.updatedAt`
  ).run(
    record.pluginKey,
    record.name,
    record.description,
    record.version,
    record.apiVersion,
    record.platformTarget,
    JSON.stringify(record.supportedTriggers),
    record.entryFile,
    record.sourcePath,
    record.checksum,
    isEnabled ? 1 : 0,
    record.isValid ? 1 : 0,
    JSON.stringify(record.validationErrors),
    record.discoveredAt,
    record.updatedAt
  );

  return { isNew: !existing };
}

function ensureDefaultCorrespondenceCreatedBinding(
  db: Database.Database,
  plugin: WorkflowPluginRecord,
  now: string
): void {
  if (!plugin.isValid || !plugin.isEnabled) {
    return;
  }

  if (!plugin.supportedTriggers.includes("CORRESPONDENCE_CREATED")) {
    return;
  }

  const existingForTrigger = db.prepare(
    `SELECT id
     FROM workflow_bindings
     WHERE bindingType = 'EVENT' AND triggerCode = ?
     LIMIT 1`
  ).get("CORRESPONDENCE_CREATED") as { id: string } | undefined;

  if (existingForTrigger) {
    return;
  }

  db.prepare(
    `INSERT INTO workflow_bindings (
      id, bindingType, triggerCode, actionDefinitionId, pluginKey, priority, isActive,
      createdBy, updatedBy, createdAt, updatedAt
    ) VALUES (?, 'EVENT', ?, NULL, ?, 100, 1, 'SYSTEM', 'SYSTEM', ?, ?)`
  ).run(
    randomUUID(),
    "CORRESPONDENCE_CREATED",
    plugin.pluginKey,
    now,
    now
  );
}

function buildInvalidRecord(
  pluginKey: string,
  pluginDirectory: string,
  discoveredAt: string,
  validationErrors: string[],
  checksum = createPluginChecksum(pluginDirectory, "")
): WorkflowPluginRecord {
  return {
    pluginKey,
    name: path.basename(pluginDirectory),
    description: "Invalid workflow plugin",
    version: "0.0.0",
    apiVersion: "0.0",
    platformTarget: readWorkflowConfig().platformTarget,
    supportedTriggers: [],
    entryFile: "",
    enabledByDefault: false,
    sourcePath: pluginDirectory,
    checksum,
    isEnabled: false,
    isValid: false,
    validationErrors,
    discoveredAt,
    updatedAt: discoveredAt
  };
}

function createPluginChecksum(pluginDirectory: string, entryFile: string): string {
  const hash = createHash("sha256");
  const manifestPath = path.join(pluginDirectory, "plugin.json");
  if (fs.existsSync(manifestPath)) {
    hash.update(fs.readFileSync(manifestPath));
  }
  if (entryFile) {
    const entryPath = path.join(pluginDirectory, entryFile);
    if (fs.existsSync(entryPath)) {
      hash.update(fs.readFileSync(entryPath));
    }
  }
  return hash.digest("hex");
}

function matchesAllowedApiVersion(apiVersion: string, allowedApiVersion: string): boolean {
  if (allowedApiVersion.endsWith(".x")) {
    return apiVersion.startsWith(allowedApiVersion.slice(0, -1));
  }
  return apiVersion === allowedApiVersion;
}

function resolvePluginKey(raw: unknown, pluginDirectory: string, platformTarget: "SERVER" | "POWERAPP"): string {
  if (raw && typeof raw === "object" && typeof (raw as Record<string, unknown>).pluginKey === "string") {
    const candidate = String((raw as Record<string, unknown>).pluginKey).trim();
    if (candidate.length > 0) {
      return candidate;
    }
  }

  return `invalid:${platformTarget}:${path.basename(pluginDirectory)}`;
}

function resolvePluginRoot(configuredRoot: string, platformTarget: "SERVER" | "POWERAPP"): string {
  if (path.isAbsolute(configuredRoot)) {
    return configuredRoot;
  }

  // Search from cwd up the directory tree so launch location does not break discovery.
  let currentDir = process.cwd();
  let fallbackCandidate: string | null = null;
  while (true) {
    const candidate = path.resolve(currentDir, configuredRoot);
    if (fs.existsSync(candidate)) {
      fallbackCandidate ??= candidate;

      const platformCandidate = path.join(candidate, platformTarget);
      if (fs.existsSync(platformCandidate)) {
        const hasPluginDirectories = fs.readdirSync(platformCandidate, { withFileTypes: true }).some((entry) => entry.isDirectory());
        if (hasPluginDirectories) {
          return candidate;
        }
      }
    }

    const parentDir = path.dirname(currentDir);
    if (parentDir === currentDir) {
      break;
    }
    currentDir = parentDir;
  }

  return fallbackCandidate ?? path.resolve(process.cwd(), configuredRoot);
}