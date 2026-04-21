import type { AppUser } from "../../../domain/governance";
import type { IUserRepository } from "../../contracts/IUserRepository";

export class InMemoryUserRepository implements IUserRepository {
  private readonly store: AppUser[];

  constructor(initial: AppUser[] = []) {
    this.store = [...initial];
  }

  async findById(id: string): Promise<AppUser | null> {
    return this.store.find((u) => u.id === id) ?? null;
  }

  async findAll(): Promise<AppUser[]> {
    return [...this.store];
  }

  async findByBranch(branchId: string): Promise<AppUser[]> {
    return this.store.filter((u) => u.branchId === branchId);
  }

  async save(user: AppUser): Promise<void> {
    const index = this.store.findIndex((item) => item.id === user.id);

    if (index >= 0) {
      this.store[index] = user;
      return;
    }

    this.store.push(user);
  }

  async delete(id: string): Promise<void> {
    const index = this.store.findIndex((item) => item.id === id);
    if (index >= 0) {
      this.store.splice(index, 1);
    }
  }
}
