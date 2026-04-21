import { InMemorySequenceStore } from "../../../application/services/referenceEngine";
import { demoBranches, demoCorrespondences, demoDepartments, demoReferenceConfigs, demoUsers } from "../../../application/modules/admin/seedData";
import { InMemoryBranchRepository } from "./InMemoryBranchRepository";
import { InMemoryCorrespondenceRepository } from "./InMemoryCorrespondenceRepository";
import { InMemoryDepartmentRepository } from "./InMemoryDepartmentRepository";
import { InMemoryNotificationService } from "./InMemoryNotificationService";
import { InMemoryReferenceConfigRepository } from "./InMemoryReferenceConfigRepository";
import { InMemoryUserRepository } from "./InMemoryUserRepository";
import { buildPlatformIndicator } from "../../platformIndicator";
export const inMemoryPlatformIndicator = buildPlatformIndicator({
    target: "IN_MEMORY",
    label: "In-memory",
    initials: "IM",
    backgroundColor: "#2f8f58"
});
export function createInMemoryHostAdapter() {
    return {
        platform: inMemoryPlatformIndicator,
        correspondences: new InMemoryCorrespondenceRepository(demoCorrespondences),
        users: new InMemoryUserRepository(demoUsers),
        branches: new InMemoryBranchRepository(demoBranches),
        departments: new InMemoryDepartmentRepository(demoDepartments),
        referenceConfigs: new InMemoryReferenceConfigRepository(demoReferenceConfigs),
        notifications: new InMemoryNotificationService(),
        sequenceStore: new InMemorySequenceStore()
    };
}
