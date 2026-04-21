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

  async save(department: Department): Promise<void> {
    const index = this.store.findIndex((item) => item.id === department.id);

    if (index >= 0) {
      this.store[index] = department;
      return;
    }

    this.store.push(department);
  }

  async delete(id: string): Promise<void> {
    const index = this.store.findIndex((item) => item.id === id);
    if (index >= 0) {
      this.store.splice(index, 1);
    }
  }
}
