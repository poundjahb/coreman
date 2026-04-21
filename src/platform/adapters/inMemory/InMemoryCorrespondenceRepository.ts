import type { Correspondence } from "../../../domain/correspondence";
import type { ICorrespondenceRepository } from "../../contracts/ICorrespondenceRepository";

export class InMemoryCorrespondenceRepository implements ICorrespondenceRepository {
  private readonly store: Correspondence[];

  constructor(initial: Correspondence[] = []) {
    this.store = [...initial];
  }

  async findById(id: string): Promise<Correspondence | null> {
    return this.store.find((c) => c.id === id) ?? null;
  }

  async findAll(): Promise<Correspondence[]> {
    return [...this.store];
  }

  async findByBranch(branchId: string): Promise<Correspondence[]> {
    return this.store.filter((c) => c.branchId === branchId);
  }

  async save(correspondence: Correspondence): Promise<void> {
    const existing = this.store.findIndex((c) => c.id === correspondence.id);
    if (existing !== -1) {
      this.store[existing] = correspondence;
    } else {
      this.store.push(correspondence);
    }
  }

  async update(id: string, changes: Partial<Omit<Correspondence, "id">>): Promise<void> {
    const index = this.store.findIndex((c) => c.id === id);
    if (index !== -1) {
      this.store[index] = { ...this.store[index], ...changes };
    }
  }
}
