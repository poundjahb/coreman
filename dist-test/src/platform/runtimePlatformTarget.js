import { platformConfig } from "../config/systemConfig";
const validTargets = new Set(["IN_MEMORY", "DATAVERSE", "SQLITE"]);
export function getRuntimePlatformTarget() {
    const rawTarget = import.meta.env.VITE_PLATFORM_TARGET;
    if (!rawTarget) {
        return platformConfig.target;
    }
    const normalizedTarget = rawTarget.toUpperCase();
    if (validTargets.has(normalizedTarget)) {
        return normalizedTarget;
    }
    return platformConfig.target;
}
