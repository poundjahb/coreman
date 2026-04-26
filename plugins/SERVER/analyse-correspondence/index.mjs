import fs from "fs/promises";
import { existsSync, readFileSync } from "fs";
import path from "path";
import { fileURLToPath } from "url";

export const metadata = {
  pluginKey: "analyse-correspondence",
  name: "Analyse Correspondence",
  description: "Posts the correspondence attachment file to an external analysis HTTP service.",
  version: "1.0.0",
  apiVersion: "1.0",
  platformTarget: "SERVER",
  supportedTriggers: ["CORRESPONDENCE_CREATED"],
  entryFile: "index.mjs",
  enabledByDefault: true
};

const SERVICE_URL_ENV_KEY = "COREMAN_ANALYSE_CORRESPONDENCE_URL";
const AUTH_TOKEN_ENV_KEY = "COREMAN_ANALYSE_CORRESPONDENCE_TOKEN";
const ATTACHMENT_ROOT_ENV_KEY = "COREMAN_ATTACHMENT_ROOT";
const FRONTEND_BASE_URL_ENV_KEY = "COREMAN_FRONTEND_BASE_URL";
const FALLBACK_FRONTEND_URL = "http://localhost:5173";
const WORK_DASHBOARD_PATH = "/work/dashboard";
const localConfigFileName = "config.json";
const __dirname = path.dirname(fileURLToPath(import.meta.url));

function getConfig(context, key) {
  return context.resources.config.get(key) ?? undefined;
}

function resolveServiceUrl(context) {
  const localConfig = readLocalConfig();
  const urlFromConfig = typeof localConfig.endpointUrl === "string" ? localConfig.endpointUrl.trim() : "";
  if (urlFromConfig) {
    return urlFromConfig;
  }

  const url = getConfig(context, SERVICE_URL_ENV_KEY)?.trim();
  if (!url) {
    throw new Error(`${localConfigFileName} endpointUrl is missing and ${SERVICE_URL_ENV_KEY} is not configured.`);
  }
  return url;
}

function readLocalConfig() {
  try {
    const raw = readFileSync(path.join(__dirname, localConfigFileName), "utf8");
    return JSON.parse(raw) ?? {};
  } catch {
    return {};
  }
}

function resolveLocationUrl(context) {
  const localConfig = readLocalConfig();
  const explicitLocation = typeof localConfig.location === "string" ? localConfig.location.trim() : "";
  if (explicitLocation) {
    return explicitLocation;
  }

  const baseUrl = getConfig(context, FRONTEND_BASE_URL_ENV_KEY)?.trim() || FALLBACK_FRONTEND_URL;
  return `${baseUrl.replace(/\/$/, "")}${WORK_DASHBOARD_PATH}`;
}

function resolveAttachmentRoot(context) {
  const fromEnv = getConfig(context, ATTACHMENT_ROOT_ENV_KEY)?.trim();
  if (fromEnv) {
    return path.resolve(fromEnv);
  }

  // Walk up from cwd until we find the server attachment store.
  let currentDir = process.cwd();
  while (true) {
    const candidate = path.resolve(currentDir, "src/platform/adapters/sqlite/server/data/files");
    if (existsSync(candidate)) {
      return candidate;
    }

    const parentDir = path.dirname(currentDir);
    if (parentDir === currentDir) {
      break;
    }
    currentDir = parentDir;
  }

  return path.resolve(process.cwd(), "data/files");
}

function resolveAttachmentPath(context, correspondence) {
  const relativePath = correspondence?.attachmentRelativePath;
  if (!relativePath || typeof relativePath !== "string") {
    return null;
  }

  const rootDir = resolveAttachmentRoot(context);
  const normalizedRelative = relativePath.split("/").join(path.sep);
  const resolvedRoot = path.resolve(rootDir);
  const rootWithSeparator = resolvedRoot.endsWith(path.sep) ? resolvedRoot : `${resolvedRoot}${path.sep}`;
  const absolutePath = path.resolve(resolvedRoot, normalizedRelative);

  if (!(absolutePath === resolvedRoot || absolutePath.startsWith(rootWithSeparator))) {
    throw new Error("Attachment path resolution escaped attachment root.");
  }

  return {
    rootDir,
    relativePath,
    absolutePath
  };
}

async function readAttachment(pathInfo, correspondence) {
  const attachmentBytes = await fs.readFile(pathInfo.absolutePath);
  const fileName = correspondence?.attachmentFileName
    ?? path.basename(pathInfo.absolutePath)
    ?? "attachment.bin";
  const mimeType = correspondence?.attachmentMimeType ?? "application/octet-stream";

  return {
    bytes: attachmentBytes,
    base64: attachmentBytes.toString("base64"),
    fileName,
    mimeType
  };
}

function resolveRecipientUser(context, correspondence) {
  const recipientId = correspondence?.recipientId
    ?? correspondence?.actionOwnerId
    ?? context.context?.assigneeUserId
    ?? null;

  if (!recipientId || typeof recipientId !== "string") {
    return { recipientId: null, fullName: null, email: null };
  }

  const user = context.resources.users.find(recipientId);
  const fullName = typeof user?.fullName === "string" && user.fullName.trim().length > 0
    ? user.fullName
    : recipientId;
  const email = typeof user?.email === "string" && user.email.trim().length > 0
    ? user.email.trim()
    : null;

  return {
    recipientId,
    fullName,
    email
  };
}

function resolveRegisteredByName(context, correspondence) {
  const registeredById = correspondence?.createBy
    ?? correspondence?.registeredById
    ?? context.actorId;

  if (!registeredById || typeof registeredById !== "string") {
    return context.actorId;
  }

  const user = context.resources.users.find(registeredById);
  if (typeof user?.fullName === "string" && user.fullName.trim().length > 0) {
    return user.fullName;
  }

  return registeredById;
}

function resolveBranchName(context, correspondence) {
  const branchId = correspondence?.branchId;
  if (!branchId || typeof branchId !== "string") {
    return "Unknown Branch";
  }

  const branch = context.resources.branches.find(branchId);
  if (typeof branch?.name === "string" && branch.name.trim().length > 0) {
    return branch.name;
  }

  return branchId;
}

function resolveDepartmentName(context, correspondence) {
  const departmentId = correspondence?.departmentId;
  if (!departmentId || typeof departmentId !== "string" || departmentId === "__INDIVIDUAL__") {
    return null;
  }

  const department = context.resources.departments.find(departmentId);
  if (typeof department?.name === "string" && department.name.trim().length > 0) {
    return department.name;
  }

  return departmentId;
}

function resolveAvailableActions(context) {
  const definitions = context.resources.actionDefinitions.listActive();
  return definitions.map((definition) => ({
    action: typeof definition.code === "string" && definition.code.trim().length > 0
      ? definition.code
      : typeof definition.label === "string" && definition.label.trim().length > 0
        ? definition.label
        : String(definition.id ?? "UNKNOWN_ACTION"),
    description: typeof definition.description === "string" ? definition.description : ""
  }));
}

export async function execute(context) {
  const correspondence = context.resources.correspondences.find(context.correspondenceId) ?? {};
  const attachmentPath = resolveAttachmentPath(context, correspondence);

  if (!attachmentPath) {
    context.resources.audit.append({
      eventType: "ANALYSE_CORRESPONDENCE_SKIPPED",
      status: "SKIPPED",
      payload: {
        pluginKey: metadata.pluginKey,
        reason: "No attachment on correspondence",
        correspondenceId: context.correspondenceId
      }
    });

    return {
      delivered: false,
      skipped: true,
      reason: "No attachment on correspondence"
    };
  }

  const attachment = await readAttachment(attachmentPath, correspondence);
  const endpointUrl = resolveServiceUrl(context);
  const location = resolveLocationUrl(context);
  const authToken = getConfig(context, AUTH_TOKEN_ENV_KEY)?.trim();
  const recipient = resolveRecipientUser(context, correspondence);
  const registeredBy = resolveRegisteredByName(context, correspondence);
  const branch = resolveBranchName(context, correspondence);
  const department = resolveDepartmentName(context, correspondence);
  const actions = resolveAvailableActions(context);

  const payload = {
    id: String(correspondence?.id ?? context.correspondenceId),
    senderReference: typeof correspondence?.senderReference === "string" ? correspondence.senderReference : null,
    subject: typeof correspondence?.subject === "string" ? correspondence.subject : "",
    sender: typeof correspondence?.fromTo === "string" ? correspondence.fromTo : "",
    organisation: typeof correspondence?.organisation === "string" ? correspondence.organisation : null,
    correspondenceDate: typeof correspondence?.correspondenceDate === "string" ? correspondence.correspondenceDate : null,
    location,
    branch,
    department,
    registeredBy,
    recipient: recipient.fullName,
    email: recipient.email,
    files: {
      fileName: attachment.fileName,
      fileContentBytes: attachment.base64
    },
    actions
  };

  const headers = {
    "Content-Type": "application/json",
    ...(authToken ? { Authorization: `Bearer ${authToken}` } : {})
  };

  const response = await fetch(endpointUrl, {
    method: "POST",
    headers,
    body: JSON.stringify(payload)
  });

  if (!response.ok) {
    const responseBody = await response.text();
    throw new Error(`Analysis service call failed (${response.status}): ${responseBody}`);
  }

  let responsePayload = null;
  try {
    responsePayload = await response.json();
  } catch {
    throw new Error("Analysis service returned a non-JSON response; expected JSON with summary.");
  }

  const summary = typeof responsePayload?.summary === "string" ? responsePayload.summary : null;
  if (summary === null) {
    throw new Error("Analysis service response JSON is missing summary.");
  }

  context.resources.correspondences.updateSummary(context.correspondenceId, summary);

  context.resources.audit.append({
    eventType: "ANALYSE_CORRESPONDENCE_SENT",
    status: "SUCCESS",
    payload: {
      pluginKey: metadata.pluginKey,
      endpointUrl,
      payloadId: payload.id,
      location,
      recipient: recipient.fullName,
      email: recipient.email,
      branch,
      department,
      fileName: attachment.fileName,
      summary,
      actionsCount: actions.length,
      analysisResponse: responsePayload
    }
  });

  return {
    delivered: true,
    triggerCode: context.trigger.code,
    endpointUrl,
    payloadId: payload.id,
    location,
    recipient: recipient.fullName,
    email: recipient.email,
    fileName: attachment.fileName,
    summary,
    actionsCount: actions.length,
    analysisResponse: responsePayload
  };
}
