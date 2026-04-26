import type { CorrespondenceTaskAssignment } from "../../../domain/correspondenceAction";
import type { ICorrespondenceTaskAssignmentRepository } from "../../contracts/ICorrespondenceTaskAssignmentRepository";

export class InMemoryCorrespondenceTaskAssignmentRepository implements ICorrespondenceTaskAssignmentRepository {
  private readonly store: CorrespondenceTaskAssignment[];

  constructor(initial: CorrespondenceTaskAssignment[] = []) {
    this.store = [...initial];
  }

  async findById(id: string): Promise<CorrespondenceTaskAssignment | null> {
    return this.store.find((item) => item.id === id) ?? null;
  }

  async findByCorrespondence(correspondenceId: string): Promise<CorrespondenceTaskAssignment[]> {
    return this.store.filter((item) => item.correspondenceId === correspondenceId);
  }

  async findByAssignee(assigneeUserId: string): Promise<CorrespondenceTaskAssignment[]> {
    return this.store.filter((item) => item.assigneeUserId === assigneeUserId);
  }

  async save(assignment: CorrespondenceTaskAssignment): Promise<void> {
    const existingIndex = this.store.findIndex((item) => item.id === assignment.id);
    if (existingIndex >= 0) {
      this.store[existingIndex] = assignment;
      return;
    }

    this.store.push(assignment);
  }

  async update(
    id: string,
    changes: Partial<Omit<CorrespondenceTaskAssignment, "id" | "createdAt" | "createdBy">>
  ): Promise<void> {
    const index = this.store.findIndex((item) => item.id === id);
    if (index < 0) {
      return;
    }

    const current = this.store[index];
    const nextStatus = changes.status ?? current.status;
    const nextClosedAt = nextStatus === "COMPLETED"
      ? (changes.closedAt ?? current.closedAt ?? new Date())
      : changes.closedAt;
    const nextClosedBy = nextStatus === "COMPLETED"
      ? (changes.closedBy ?? current.closedBy ?? changes.updatedBy ?? current.updatedBy)
      : changes.closedBy;

    this.store[index] = {
      ...current,
      ...changes,
      closedAt: nextStatus === "COMPLETED" ? nextClosedAt : undefined,
      closedBy: nextStatus === "COMPLETED" ? nextClosedBy : undefined,
      updatedAt: changes.updatedAt ?? new Date()
    };
  }
}
