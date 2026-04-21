import type { IHostAdapter } from "../../IHostAdapter";
import type { ICorrespondenceRepository } from "../../contracts/ICorrespondenceRepository";
import type { IUserRepository } from "../../contracts/IUserRepository";
import type { IBranchRepository } from "../../contracts/IBranchRepository";
import type { IDepartmentRepository } from "../../contracts/IDepartmentRepository";
import type { IReferenceConfigRepository } from "../../contracts/IReferenceConfigRepository";
import type { INotificationService, NotificationPayload } from "../../contracts/INotificationService";
import type { SequenceStore } from "../../../domain/reference";

function notImplemented(method: string): never {
  throw new Error(`DataverseHostAdapter: ${method} is not yet implemented.`);
}

const dataverseCorrespondenceRepository: ICorrespondenceRepository = {
  findById: (_id) => notImplemented("correspondences.findById"),
  findAll: () => notImplemented("correspondences.findAll"),
  findByBranch: (_branchId) => notImplemented("correspondences.findByBranch"),
  save: (_c) => notImplemented("correspondences.save"),
  update: (_id, _changes) => notImplemented("correspondences.update")
};

const dataverseUserRepository: IUserRepository = {
  findById: (_id) => notImplemented("users.findById"),
  findAll: () => notImplemented("users.findAll"),
  findByBranch: (_branchId) => notImplemented("users.findByBranch")
};

const dataverseBranchRepository: IBranchRepository = {
  findById: (_id) => notImplemented("branches.findById"),
  findAll: () => notImplemented("branches.findAll")
};

const dataverseDepartmentRepository: IDepartmentRepository = {
  findById: (_id) => notImplemented("departments.findById"),
  findAll: () => notImplemented("departments.findAll")
};

const dataverseReferenceConfigRepository: IReferenceConfigRepository = {
  findAll: () => notImplemented("referenceConfigs.findAll"),
  findActive: () => notImplemented("referenceConfigs.findActive")
};

const dataverseNotificationService: INotificationService = {
  send: (_payload: NotificationPayload) => notImplemented("notifications.send")
};

const dataverseSequenceStore: SequenceStore = {
  next: (_key: string) => notImplemented("sequenceStore.next")
};

export const dataverseHostAdapter: IHostAdapter = {
  correspondences: dataverseCorrespondenceRepository,
  users: dataverseUserRepository,
  branches: dataverseBranchRepository,
  departments: dataverseDepartmentRepository,
  referenceConfigs: dataverseReferenceConfigRepository,
  notifications: dataverseNotificationService,
  sequenceStore: dataverseSequenceStore
};
