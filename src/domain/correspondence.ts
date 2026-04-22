import type { AppUser } from "./governance";

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
  summary?: string;
  direction: CorrespondenceDirection;
  /** Sender (INCOMING) or recipient (OUTGOING) — required */
  fromTo: string;
  /** Organisation of the sender or recipient — optional */
  organisation?: string;
  /** Date as written on the correspondence document — optional */
  correspondenceDate?: Date;
  branchId: string;
  departmentId?: string;
  registeredById: AppUser["id"];
  recipientId?: AppUser["id"];
  actionOwnerId?: AppUser["id"];
  status: CorrespondenceStatus;
  receivedDate: Date;
  dueDate?: Date;
  createdAt: Date;
  updatedAt: Date;
  /** User who initially captured the correspondence */
  createBy: AppUser;
  /** Last user who updated the correspondence */
  updateBy: AppUser;
}
