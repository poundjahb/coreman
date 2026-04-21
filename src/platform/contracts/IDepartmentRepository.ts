import type { Department } from "../../domain/governance";

export interface IDepartmentRepository {
  findById(id: string): Promise<Department | null>;
  findAll(): Promise<Department[]>;
  save(department: Department): Promise<void>;
  delete(id: string): Promise<void>;
}
