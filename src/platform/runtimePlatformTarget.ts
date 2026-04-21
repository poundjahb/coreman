import { platformConfig, type PlatformTarget } from "../config/systemConfig";

const validTargets: ReadonlySet<PlatformTarget> = new Set(["IN_MEMORY", "DATAVERSE", "SQLITE"]);

export function getRuntimePlatformTarget(): PlatformTarget {
  const rawTarget = import.meta.env.VITE_PLATFORM_TARGET;
  if (!rawTarget) {
    return platformConfig.target;
  }

  const normalizedTarget = rawTarget.toUpperCase() as PlatformTarget;
  if (validTargets.has(normalizedTarget)) {
    return normalizedTarget;
  }

  return platformConfig.target;
}
