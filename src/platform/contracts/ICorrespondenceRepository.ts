import type { Correspondence } from "../../domain/correspondence";

export interface ICorrespondenceRepository {
  findById(id: string): Promise<Correspondence | null>;
  findAll(): Promise<Correspondence[]>;
  findByBranch(branchId: string): Promise<Correspondence[]>;
  save(correspondence: Correspondence): Promise<void>;
  update(id: string, changes: Partial<Omit<Correspondence, "id">>): Promise<void>;
}
