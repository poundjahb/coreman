import { createHostAdapter } from "./hostAdapterFactory";
import { getRuntimePlatformTarget } from "./runtimePlatformTarget";
const runtimePlatformTarget = getRuntimePlatformTarget();
export const runtimeHostAdapter = createHostAdapter(runtimePlatformTarget);
export { runtimePlatformTarget };
