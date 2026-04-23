import { app, BrowserWindow, ipcMain } from "electron";
import fs from "fs";
import path from "path";
import { createSqliteHostAdapter } from "../src/platform/adapters/sqlite/SqliteHostAdapter";
import type { IHostAdapter } from "../src/platform/IHostAdapter";
import type { Correspondence } from "../src/domain/correspondence";
import type { CorrespondenceActionDefinition } from "../src/domain/correspondenceAction";
import type { AppUser, Branch, Department } from "../src/domain/governance";
import type { CreateCorrespondenceAuditEvent } from "../src/platform/contracts/ICorrespondenceAuditLogRepository";
import type { NotificationPayload } from "../src/platform/contracts/INotificationService";
import type { ExecutePostCaptureWorkflowCommand } from "../src/platform/contracts/IPostCaptureWorkflowService";
import type { SendTestEmailCommand } from "../src/platform/contracts/ISmtpSettingsService";
import type { SmtpConfig } from "../src/config/systemConfig";

let adapter: IHostAdapter;

function configureStoragePaths(): void {
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

  fs.mkdirSync(userDataDir, { recursive: true });
  fs.mkdirSync(sessionDataDir, { recursive: true });

  app.setPath("userData", userDataDir);
  app.setPath("sessionData", sessionDataDir);
}

configureStoragePaths();

function createWindow(): void {
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

function registerIpcHandlers(): void {
  // correspondences
  ipcMain.handle("correspondences:findById", (_e, id: string) =>
    adapter.correspondences.findById(id)
  );
  ipcMain.handle("correspondences:findAll", () => adapter.correspondences.findAll());
  ipcMain.handle("correspondences:findByBranch", (_e, branchId: string) =>
    adapter.correspondences.findByBranch(branchId)
  );
  ipcMain.handle("correspondences:save", (_e, c: Correspondence) =>
    adapter.correspondences.save(c)
  );
  ipcMain.handle(
    "correspondences:update",
    (_e, id: string, changes: Partial<Omit<Correspondence, "id">>) =>
      adapter.correspondences.update(id, changes)
  );

  // users
  ipcMain.handle("users:findById", (_e, id: string) => adapter.users.findById(id));
  ipcMain.handle("users:findAll", () => adapter.users.findAll());
  ipcMain.handle("users:findByBranch", (_e, branchId: string) =>
    adapter.users.findByBranch(branchId)
  );
  ipcMain.handle("users:save", (_e, user: AppUser) => adapter.users.save(user));
  ipcMain.handle("users:delete", (_e, id: string) => adapter.users.delete(id));

  // branches
  ipcMain.handle("branches:findById", (_e, id: string) => adapter.branches.findById(id));
  ipcMain.handle("branches:findAll", () => adapter.branches.findAll());
  ipcMain.handle("branches:save", (_e, branch: Branch) => adapter.branches.save(branch));
  ipcMain.handle("branches:delete", (_e, id: string) => adapter.branches.delete(id));

  // departments
  ipcMain.handle("departments:findById", (_e, id: string) => adapter.departments.findById(id));
  ipcMain.handle("departments:findAll", () => adapter.departments.findAll());
  ipcMain.handle("departments:save", (_e, department: Department) =>
    adapter.departments.save(department)
  );
  ipcMain.handle("departments:delete", (_e, id: string) => adapter.departments.delete(id));

  // referenceConfigs
  ipcMain.handle("referenceConfigs:findAll", () => adapter.referenceConfigs.findAll());
  ipcMain.handle("referenceConfigs:findActive", () => adapter.referenceConfigs.findActive());

  // actionDefinitions
  ipcMain.handle("actionDefinitions:findById", (_e, id: string) =>
    adapter.actionDefinitions.findById(id)
  );
  ipcMain.handle("actionDefinitions:findAll", () => adapter.actionDefinitions.findAll());
  ipcMain.handle("actionDefinitions:findActive", () => adapter.actionDefinitions.findActive());
  ipcMain.handle("actionDefinitions:save", (_e, definition: CorrespondenceActionDefinition) =>
    adapter.actionDefinitions.save(definition)
  );
  ipcMain.handle("actionDefinitions:delete", (_e, id: string) => adapter.actionDefinitions.delete(id));

  // notifications
  ipcMain.handle("notifications:send", (_e, payload: NotificationPayload) =>
    adapter.notifications.send(payload)
  );

  // smtpSettings
  ipcMain.handle("smtpSettings:getConfig", (): Promise<SmtpConfig> => adapter.smtpSettings.getConfig());
  ipcMain.handle("smtpSettings:saveConfig", (_e, config: SmtpConfig) =>
    adapter.smtpSettings.saveConfig(config)
  );
  ipcMain.handle("smtpSettings:sendTestEmail", (_e, command: SendTestEmailCommand) =>
    adapter.smtpSettings.sendTestEmail(command)
  );

  // correspondenceAuditLog
  ipcMain.handle("correspondenceAuditLog:append", (_e, event: CreateCorrespondenceAuditEvent) =>
    adapter.correspondenceAuditLog.append(event)
  );
  ipcMain.handle("correspondenceAuditLog:findByCorrespondence", (_e, correspondenceId: string) =>
    adapter.correspondenceAuditLog.findByCorrespondence(correspondenceId)
  );

  // postCaptureWorkflow
  ipcMain.handle("postCaptureWorkflow:execute", (_e, command: ExecutePostCaptureWorkflowCommand) =>
    adapter.postCaptureWorkflow.execute(command)
  );

  // sequenceStore — runs in main process where SQLite is available
  ipcMain.handle("sequenceStore:next", (_e, key: string) =>
    Promise.resolve(adapter.sequenceStore.next(key))
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
