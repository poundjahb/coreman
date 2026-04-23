import type { CorrespondenceActionDefinition } from "../../domain/correspondenceAction";

export interface ICorrespondenceActionDefinitionRepository {
  findById(id: string): Promise<CorrespondenceActionDefinition | null>;
  findAll(): Promise<CorrespondenceActionDefinition[]>;
  findActive(): Promise<CorrespondenceActionDefinition[]>;
  save(definition: CorrespondenceActionDefinition): Promise<void>;
  delete(id: string): Promise<void>;
}
