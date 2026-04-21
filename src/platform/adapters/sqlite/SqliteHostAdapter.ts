import type { IHostAdapter } from "../../IHostAdapter";
import type { ICorrespondenceRepository } from "../../contracts/ICorrespondenceRepository";
import type { IUserRepository } from "../../contracts/IUserRepository";
import type { IBranchRepository } from "../../contracts/IBranchRepository";
import type { IDepartmentRepository } from "../../contracts/IDepartmentRepository";
import type { IReferenceConfigRepository } from "../../contracts/IReferenceConfigRepository";
import type { INotificationService, NotificationPayload } from "../../contracts/INotificationService";
import type { SequenceStore } from "../../../domain/reference";

function notImplemented(method: string): never {
  throw new Error(`SqliteHostAdapter: ${method} is not yet implemented.`);
}

const sqliteCorrespondenceRepository: ICorrespondenceRepository = {
  findById: (_id) => notImplemented("correspondences.findById"),
  findAll: () => notImplemented("correspondences.findAll"),
  findByBranch: (_branchId) => notImplemented("correspondences.findByBranch"),
  save: (_c) => notImplemented("correspondences.save"),
  update: (_id, _changes) => notImplemented("correspondences.update")
};

const sqliteUserRepository: IUserRepository = {
  findById: (_id) => notImplemented("users.findById"),
  findAll: () => notImplemented("users.findAll"),
  findByBranch: (_branchId) => notImplemented("users.findByBranch")
};

const sqliteBranchRepository: IBranchRepository = {
  findById: (_id) => notImplemented("branches.findById"),
  findAll: () => notImplemented("branches.findAll")
};

const sqliteDepartmentRepository: IDepartmentRepository = {
  findById: (_id) => notImplemented("departments.findById"),
  findAll: () => notImplemented("departments.findAll")
};

const sqliteReferenceConfigRepository: IReferenceConfigRepository = {
  findAll: () => notImplemented("referenceConfigs.findAll"),
  findActive: () => notImplemented("referenceConfigs.findActive")
};

const sqliteNotificationService: INotificationService = {
  send: (_payload: NotificationPayload) => notImplemented("notifications.send")
};

const sqliteSequenceStore: SequenceStore = {
  next: (_key: string) => notImplemented("sequenceStore.next")
};

export const sqliteHostAdapter: IHostAdapter = {
  correspondences: sqliteCorrespondenceRepository,
  users: sqliteUserRepository,
  branches: sqliteBranchRepository,
  departments: sqliteDepartmentRepository,
  referenceConfigs: sqliteReferenceConfigRepository,
  notifications: sqliteNotificationService,
  sequenceStore: sqliteSequenceStore
};
