import type { Correspondence } from "../../../domain/correspondence";
import type { AppUser } from "../../../domain/governance";
import type { ReferenceFormatConfig } from "../../../domain/reference";
import type { IHostAdapter } from "../../../platform/IHostAdapter";
import { isDepartmentAllowedForBranch } from "../../services/branchDepartmentPolicy";
import { assertRole } from "../../services/accessControl";
import {
  generateReference,
  generateReferenceAsync,
  InMemorySequenceStore
} from "../../services/referenceEngine";

export interface IntakeInput {
  branchId: string;
  branchCode: string;
  departmentId?: string;
  departmentCode?: string;
  subject: string;
}

export interface IntakeResult {
  correspondenceId: string;
  referenceNumber: string;
  subject: string;
  createdBy: string;
}

export interface RegisterCorrespondenceCommand {
  branchId: string;
  departmentId?: string;
  subject: string;
  direction?: Correspondence["direction"];
  /** Sender (INCOMING) or recipient (OUTGOING) — required */
  fromTo: string;
  /** Organisation of the sender or recipient — optional */
  organisation?: string;
  /** Date as written on the correspondence document — optional */
  correspondenceDate?: Date;
  dueDate?: Date;
  recipientId?: AppUser["id"];
  actionOwnerId?: AppUser["id"];
}

const sequenceStore = new InMemorySequenceStore();

export function registerCorrespondence(
  actor: AppUser,
  input: IntakeInput,
  referenceConfigs: ReferenceFormatConfig[],
  orgCode: string
): IntakeResult {
  assertRole(actor, "RECEPTIONIST");

  const generated = generateReference(
    referenceConfigs,
    {
      orgCode,
      branchId: input.branchId,
      branchCode: input.branchCode,
      departmentId: input.departmentId,
      departmentCode: input.departmentCode,
      now: new Date()
    },
    sequenceStore
  );

  return {
    correspondenceId: crypto.randomUUID(),
    referenceNumber: generated.value,
    subject: input.subject,
    createdBy: actor.fullName
  };
}

export async function registerCorrespondenceInHost(
  hostAdapter: IHostAdapter,
  actor: AppUser,
  input: RegisterCorrespondenceCommand,
  orgCode: string
): Promise<IntakeResult> {
  assertRole(actor, "RECEPTIONIST");

  const [configs, branches, departments, users] = await Promise.all([
    hostAdapter.referenceConfigs.findActive(),
    hostAdapter.branches.findAll(),
    hostAdapter.departments.findAll(),
    hostAdapter.users.findAll()
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

  const userIds = new Set(users.map((user) => user.id));
  if (!userIds.has(actor.id)) {
    throw new Error("The registering user could not be found.");
  }

  if (input.recipientId && !userIds.has(input.recipientId)) {
    throw new Error("The selected recipient could not be found.");
  }

  if (input.actionOwnerId && !userIds.has(input.actionOwnerId)) {
    throw new Error("The selected action owner could not be found.");
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
  const receivedDate = new Date(`${timestamp.slice(0, 10)}T00:00:00.000Z`);
  const correspondence: Correspondence = {
    id: crypto.randomUUID(),
    reference: generated.value,
    subject: input.subject.trim(),
    direction: input.direction ?? "INCOMING",
    fromTo: input.fromTo,
    organisation: input.organisation,
    correspondenceDate: input.correspondenceDate,
    branchId: input.branchId,
    departmentId: input.departmentId,
    registeredById: actor.id,
    recipientId: input.recipientId,
    actionOwnerId: input.actionOwnerId,
    status: "NEW",
    receivedDate,
    dueDate: input.dueDate,
    createdAt: new Date(timestamp),
    updatedAt: new Date(timestamp),
    createBy: actor,
    updateBy: actor
  };

  if (correspondence.summary && correspondence.summary.length > 500) {
    throw new Error("Summary cannot exceed 500 characters.");
  }

  await hostAdapter.correspondences.save(correspondence);

  return {
    correspondenceId: correspondence.id,
    referenceNumber: correspondence.reference,
    subject: correspondence.subject,
    createdBy: actor.fullName
  };
}
