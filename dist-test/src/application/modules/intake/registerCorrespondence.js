import { isDepartmentAllowedForBranch } from "../../services/branchDepartmentPolicy";
import { assertRole } from "../../services/accessControl";
import { generateReference, generateReferenceAsync, InMemorySequenceStore } from "../../services/referenceEngine";
const sequenceStore = new InMemorySequenceStore();
export function registerCorrespondence(actor, input, referenceConfigs, orgCode) {
    assertRole(actor, "RECEPTIONIST");
    const generated = generateReference(referenceConfigs, {
        orgCode,
        branchId: input.branchId,
        branchCode: input.branchCode,
        departmentId: input.departmentId,
        departmentCode: input.departmentCode,
        now: new Date()
    }, sequenceStore);
    return {
        correspondenceId: crypto.randomUUID(),
        referenceNumber: generated.value,
        subject: input.subject,
        createdBy: actor.fullName
    };
}
export async function registerCorrespondenceInHost(hostAdapter, actor, input, orgCode) {
    assertRole(actor, "RECEPTIONIST");
    const [configs, branches, departments] = await Promise.all([
        hostAdapter.referenceConfigs.findActive(),
        hostAdapter.branches.findAll(),
        hostAdapter.departments.findAll()
    ]);
    const branch = branches.find((item) => item.id === input.branchId);
    const department = input.departmentId
        ? departments.find((item) => item.id === input.departmentId)
        : undefined;
    if (!branch) {
        throw new Error("The selected branch could not be found.");
    }
    if (input.departmentId && !department) {
        throw new Error("The selected department could not be found.");
    }
    if (!isDepartmentAllowedForBranch(input.branchId, input.departmentId)) {
        throw new Error("The selected department is not allowed for this branch.");
    }
    const now = new Date();
    const generated = await generateReferenceAsync(configs, {
        orgCode,
        branchId: input.branchId,
        branchCode: branch.code,
        departmentId: input.departmentId,
        departmentCode: department?.code,
        now
    }, async (key) => {
        if (typeof window !== "undefined" && window.electronAPI) {
            return window.electronAPI.sequenceStore.next(key);
        }
        return Promise.resolve(hostAdapter.sequenceStore.next(key));
    });
    const timestamp = now.toISOString();
    const correspondence = {
        id: crypto.randomUUID(),
        reference: generated.value,
        subject: input.subject.trim(),
        direction: input.direction ?? "INCOMING",
        branchId: input.branchId,
        departmentId: input.departmentId,
        registeredById: actor.id,
        recipientId: input.recipientId,
        actionOwnerId: input.actionOwnerId,
        status: "NEW",
        receivedDate: timestamp.slice(0, 10),
        dueDate: input.dueDate,
        createdAt: timestamp,
        updatedAt: timestamp
    };
    await hostAdapter.correspondences.save(correspondence);
    return {
        correspondenceId: correspondence.id,
        referenceNumber: correspondence.reference,
        subject: correspondence.subject,
        createdBy: actor.fullName
    };
}
