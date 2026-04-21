import type { Department } from "../../../domain/governance";
import type { IDepartmentRepository } from "../../contracts/IDepartmentRepository";

export class InMemoryDepartmentRepository implements IDepartmentRepository {
  private readonly store: Department[];

  constructor(initial: Department[] = []) {
    this.store = [...initial];
  }

  async findById(id: string): Promise<Department | null> {
    return this.store.find((d) => d.id === id) ?? null;
  }

  async findAll(): Promise<Department[]> {
    return [...this.store];
  }
}
