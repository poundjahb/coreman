import type { ReferenceFormatConfig } from "../../../domain/reference";
import type { IReferenceConfigRepository } from "../../contracts/IReferenceConfigRepository";

export class InMemoryReferenceConfigRepository implements IReferenceConfigRepository {
  private readonly store: ReferenceFormatConfig[];

  constructor(initial: ReferenceFormatConfig[] = []) {
    this.store = [...initial];
  }

  async findAll(): Promise<ReferenceFormatConfig[]> {
    return [...this.store];
  }

  async findActive(): Promise<ReferenceFormatConfig[]> {
    return this.store.filter((c) => c.isActive);
  }
}
