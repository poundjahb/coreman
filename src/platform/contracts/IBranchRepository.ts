import type { Branch } from "../../domain/governance";

export interface IBranchRepository {
  findById(id: string): Promise<Branch | null>;
  findAll(): Promise<Branch[]>;
  save(branch: Branch): Promise<void>;
  delete(id: string): Promise<void>;
}
