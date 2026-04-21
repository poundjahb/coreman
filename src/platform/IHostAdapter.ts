import type { SequenceStore } from "../domain/reference";
import type { IBranchRepository } from "./contracts/IBranchRepository";
import type { ICorrespondenceRepository } from "./contracts/ICorrespondenceRepository";
import type { IDepartmentRepository } from "./contracts/IDepartmentRepository";
import type { INotificationService } from "./contracts/INotificationService";
import type { IReferenceConfigRepository } from "./contracts/IReferenceConfigRepository";
import type { IUserRepository } from "./contracts/IUserRepository";

export interface IHostAdapter {
  correspondences: ICorrespondenceRepository;
  users: IUserRepository;
  branches: IBranchRepository;
  departments: IDepartmentRepository;
  referenceConfigs: IReferenceConfigRepository;
  notifications: INotificationService;
  sequenceStore: SequenceStore;
}
