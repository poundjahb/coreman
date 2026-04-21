import { app, BrowserWindow, ipcMain } from "electron";
import path from "path";
import { createSqliteHostAdapter } from "../src/platform/adapters/sqlite/SqliteHostAdapter";
import type { IHostAdapter } from "../src/platform/IHostAdapter";
import type { Correspondence } from "../src/domain/correspondence";
import type { NotificationPayload } from "../src/platform/contracts/INotificationService";

let adapter: IHostAdapter;

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

  // branches
  ipcMain.handle("branches:findById", (_e, id: string) => adapter.branches.findById(id));
  ipcMain.handle("branches:findAll", () => adapter.branches.findAll());

  // departments
  ipcMain.handle("departments:findById", (_e, id: string) => adapter.departments.findById(id));
  ipcMain.handle("departments:findAll", () => adapter.departments.findAll());

  // referenceConfigs
  ipcMain.handle("referenceConfigs:findAll", () => adapter.referenceConfigs.findAll());
  ipcMain.handle("referenceConfigs:findActive", () => adapter.referenceConfigs.findActive());

  // notifications
  ipcMain.handle("notifications:send", (_e, payload: NotificationPayload) =>
    adapter.notifications.send(payload)
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
