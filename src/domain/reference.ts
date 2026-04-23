export type ReferenceScope = "GLOBAL" | "BRANCH" | "BRANCH_DEPARTMENT";
export type SequenceResetPolicy = "MONTHLY" | "YEARLY" | "NEVER";

export interface ReferenceFormatConfig {
  id: string;
  scope: ReferenceScope;
  branchId?: string;
  departmentId?: string;
  pattern: string;
  resetPolicy: SequenceResetPolicy;
  isActive: boolean;
}

export interface ReferenceContext {
  orgCode: string;
  branchId: string;
  branchCode: string;
  departmentId?: string;
  departmentCode?: string;
  now: Date;
}

export interface SequenceStore {
  next(key: string): number | Promise<number>;
}

export interface GeneratedReference {
  value: string;
  sequenceKey: string;
  sequence: number;
  configId: string;
}
