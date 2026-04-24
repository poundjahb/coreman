import type { CorrespondenceTaskAssignment } from "../../domain/correspondenceAction";

export interface ICorrespondenceTaskAssignmentRepository {
  findById(id: string): Promise<CorrespondenceTaskAssignment | null>;
  findByCorrespondence(correspondenceId: string): Promise<CorrespondenceTaskAssignment[]>;
  findByAssignee(assigneeUserId: string): Promise<CorrespondenceTaskAssignment[]>;
  save(assignment: CorrespondenceTaskAssignment): Promise<void>;
  update(id: string, changes: Partial<Omit<CorrespondenceTaskAssignment, "id" | "createdAt" | "createdBy">>): Promise<void>;
}
