import type { Branch } from "../../../domain/governance";
import type { IBranchRepository } from "../../contracts/IBranchRepository";

export class InMemoryBranchRepository implements IBranchRepository {
  private readonly store: Branch[];

  constructor(initial: Branch[] = []) {
    this.store = [...initial];
  }

  async findById(id: string): Promise<Branch | null> {
    return this.store.find((b) => b.id === id) ?? null;
  }

  async findAll(): Promise<Branch[]> {
    return [...this.store];
  }

  async save(branch: Branch): Promise<void> {
    const index = this.store.findIndex((item) => item.id === branch.id);

    if (index >= 0) {
      this.store[index] = branch;
      return;
    }

    this.store.push(branch);
  }

  async delete(id: string): Promise<void> {
    const index = this.store.findIndex((item) => item.id === id);
    if (index >= 0) {
      this.store.splice(index, 1);
    }
  }
}
