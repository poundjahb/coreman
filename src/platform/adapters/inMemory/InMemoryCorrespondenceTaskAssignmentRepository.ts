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
    this.store[index] = {
      ...current,
      ...changes,
      updatedAt: changes.updatedAt ?? new Date()
    };
  }
}
