import type { ReferenceFormatConfig } from "../../domain/reference";

export interface IReferenceConfigRepository {
  findAll(): Promise<ReferenceFormatConfig[]>;
  findActive(): Promise<ReferenceFormatConfig[]>;
}
