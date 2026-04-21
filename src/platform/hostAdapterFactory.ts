import type { PlatformTarget } from "../config/systemConfig";
import type { IHostAdapter } from "./IHostAdapter";
import { createInMemoryHostAdapter } from "./adapters/inMemory/InMemoryHostAdapter";
import { dataverseHostAdapter } from "./adapters/dataverse/DataverseHostAdapter";
import { sqliteHostAdapter } from "./adapters/sqlite/SqliteHostAdapter";

export function createHostAdapter(target: PlatformTarget): IHostAdapter {
  switch (target) {
    case "DATAVERSE":
      return dataverseHostAdapter;
    case "SQLITE":
      return sqliteHostAdapter;
    case "IN_MEMORY":
      return createInMemoryHostAdapter();
  }
}
