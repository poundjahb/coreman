import type { CorrespondenceActionDefinition } from "../../../domain/correspondenceAction";
import type { ICorrespondenceActionDefinitionRepository } from "../../contracts/ICorrespondenceActionDefinitionRepository";

export class InMemoryCorrespondenceActionDefinitionRepository
  implements ICorrespondenceActionDefinitionRepository {
  private readonly store: CorrespondenceActionDefinition[];

  constructor(initial: CorrespondenceActionDefinition[] = []) {
    this.store = [...initial];
  }

  async findById(id: string): Promise<CorrespondenceActionDefinition | null> {
    return this.store.find((definition) => definition.id === id) ?? null;
  }

  async findAll(): Promise<CorrespondenceActionDefinition[]> {
    return [...this.store];
  }

  async findActive(): Promise<CorrespondenceActionDefinition[]> {
    return this.store.filter((definition) => definition.isActive);
  }

  async save(definition: CorrespondenceActionDefinition): Promise<void> {
    const duplicate = this.store.find(
      (item) => item.code.toUpperCase() === definition.code.toUpperCase() && item.id !== definition.id
    );

    if (duplicate) {
      throw new Error(`Action code '${definition.code}' already exists.`);
    }

    const index = this.store.findIndex((item) => item.id === definition.id);
    if (index >= 0) {
      this.store[index] = definition;
      return;
    }

    this.store.push(definition);
  }

  async delete(id: string): Promise<void> {
    const index = this.store.findIndex((item) => item.id === id);
    if (index >= 0) {
      this.store.splice(index, 1);
    }
  }
}
