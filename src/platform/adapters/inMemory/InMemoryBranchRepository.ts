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
}
