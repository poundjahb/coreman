import { buildPlatformIndicator } from "../../platformIndicator";
export const dataversePlatformIndicator = buildPlatformIndicator({
    target: "DATAVERSE",
    label: "Dataverse",
    initials: "DV",
    backgroundColor: "#1366d9"
});
function notImplemented(method) {
    throw new Error(`DataverseHostAdapter: ${method} is not yet implemented.`);
}
const dataverseCorrespondenceRepository = {
    findById: (_id) => notImplemented("correspondences.findById"),
    findAll: () => notImplemented("correspondences.findAll"),
    findByBranch: (_branchId) => notImplemented("correspondences.findByBranch"),
    save: (_c) => notImplemented("correspondences.save"),
    update: (_id, _changes) => notImplemented("correspondences.update")
};
const dataverseUserRepository = {
    findById: (_id) => notImplemented("users.findById"),
    findAll: () => notImplemented("users.findAll"),
    findByBranch: (_branchId) => notImplemented("users.findByBranch"),
    save: (_user) => notImplemented("users.save"),
    delete: (_id) => notImplemented("users.delete")
};
const dataverseBranchRepository = {
    findById: (_id) => notImplemented("branches.findById"),
    findAll: () => notImplemented("branches.findAll"),
    save: (_branch) => notImplemented("branches.save"),
    delete: (_id) => notImplemented("branches.delete")
};
const dataverseDepartmentRepository = {
    findById: (_id) => notImplemented("departments.findById"),
    findAll: () => notImplemented("departments.findAll"),
    save: (_department) => notImplemented("departments.save"),
    delete: (_id) => notImplemented("departments.delete")
};
const dataverseReferenceConfigRepository = {
    findAll: () => notImplemented("referenceConfigs.findAll"),
    findActive: () => notImplemented("referenceConfigs.findActive")
};
const dataverseNotificationService = {
    send: (_payload) => notImplemented("notifications.send")
};
const dataverseSequenceStore = {
    next: (_key) => notImplemented("sequenceStore.next")
};
export const dataverseHostAdapter = {
    platform: dataversePlatformIndicator,
    correspondences: dataverseCorrespondenceRepository,
    users: dataverseUserRepository,
    branches: dataverseBranchRepository,
    departments: dataverseDepartmentRepository,
    referenceConfigs: dataverseReferenceConfigRepository,
    notifications: dataverseNotificationService,
    sequenceStore: dataverseSequenceStore
};
