export type CorrespondenceDirection = "INCOMING" | "OUTGOING";

export type CorrespondenceStatus =
  | "NEW"
  | "IN_PROGRESS"
  | "AWAITING_REVIEW"
  | "CLOSED";

export interface Correspondence {
  id: string;
  reference: string;
  subject: string;
  direction: CorrespondenceDirection;
  branchId: string;
  departmentId?: string;
  registeredById: string;
  recipientId?: string;
  actionOwnerId?: string;
  status: CorrespondenceStatus;
  receivedDate: string;
  dueDate?: string;
  createdAt: string;
  updatedAt: string;
}
