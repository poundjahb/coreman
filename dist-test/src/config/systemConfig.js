export const systemConfig = {
    authMode: "APP",
    orgCode: "BANK"
};
export const platformConfig = {
    target: "SQLITE"
};
export function setAuthMode(config, nextMode) {
    return {
        ...config,
        authMode: nextMode
    };
}
export function setPlatformTarget(config, target) {
    return { ...config, target };
}
