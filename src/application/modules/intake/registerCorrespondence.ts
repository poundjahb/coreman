import type { AppUser } from "../../../domain/governance";
import type { ReferenceFormatConfig } from "../../../domain/reference";
import { assertRole } from "../../services/accessControl";
import { generateReference, InMemorySequenceStore } from "../../services/referenceEngine";

export interface IntakeInput {
  branchId: string;
  branchCode: string;
  departmentId?: string;
  departmentCode?: string;
  subject: string;
}

export interface IntakeResult {
  referenceNumber: string;
  subject: string;
  createdBy: string;
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
    referenceNumber: generated.value,
    subject: input.subject,
    createdBy: actor.fullName
  };
}
