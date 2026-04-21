import type { AppUser } from "../../domain/governance";

export interface IUserRepository {
  findById(id: string): Promise<AppUser | null>;
  findAll(): Promise<AppUser[]>;
  findByBranch(branchId: string): Promise<AppUser[]>;
  save(user: AppUser): Promise<void>;
  delete(id: string): Promise<void>;
}
