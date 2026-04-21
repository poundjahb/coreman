function padSequence(rawValue, token) {
    const size = Number(token.replace("SEQ", ""));
    return String(rawValue).padStart(size, "0");
}
export function getPeriodKey(date, policy) {
    const year = date.getUTCFullYear();
    const month = String(date.getUTCMonth() + 1).padStart(2, "0");
    if (policy === "MONTHLY") {
        return `${year}${month}`;
    }
    if (policy === "YEARLY") {
        return `${year}`;
    }
    return "NO_RESET";
}
export function resolveConfig(configs, context) {
    const active = configs.filter((config) => config.isActive);
    const byBranchDepartment = active.find((config) => config.scope === "BRANCH_DEPARTMENT" &&
        config.branchId === context.branchId &&
        config.departmentId === context.departmentId);
    if (byBranchDepartment) {
        return byBranchDepartment;
    }
    const byBranch = active.find((config) => config.scope === "BRANCH" && config.branchId === context.branchId);
    if (byBranch) {
        return byBranch;
    }
    const global = active.find((config) => config.scope === "GLOBAL");
    if (!global) {
        throw new Error("No active reference format was found for this context.");
    }
    return global;
}
export function renderPattern(pattern, context, sequence) {
    const date = context.now;
    const replacements = {
        ORG: context.orgCode,
        BRANCH: context.branchCode,
        DEPT: context.departmentCode ?? "NA",
        YYYY: String(date.getUTCFullYear()),
        YY: String(date.getUTCFullYear()).slice(-2),
        MM: String(date.getUTCMonth() + 1).padStart(2, "0"),
        DD: String(date.getUTCDate()).padStart(2, "0")
    };
    return pattern.replace(/\{([A-Z0-9]+)\}/g, (_match, token) => {
        if (token.startsWith("SEQ")) {
            return padSequence(sequence, token);
        }
        return replacements[token] ?? token;
    });
}
export function generateReference(configs, context, sequenceStore) {
    const config = resolveConfig(configs, context);
    const periodKey = getPeriodKey(context.now, config.resetPolicy);
    const scopeKey = [config.scope, context.branchId, context.departmentId ?? "NONE", periodKey].join("|");
    const sequence = sequenceStore.next(scopeKey);
    return {
        value: renderPattern(config.pattern, context, sequence),
        sequenceKey: scopeKey,
        sequence,
        configId: config.id
    };
}
export async function generateReferenceAsync(configs, context, nextSequence) {
    const config = resolveConfig(configs, context);
    const periodKey = getPeriodKey(context.now, config.resetPolicy);
    const scopeKey = [config.scope, context.branchId, context.departmentId ?? "NONE", periodKey].join("|");
    const sequence = await nextSequence(scopeKey);
    return {
        value: renderPattern(config.pattern, context, sequence),
        sequenceKey: scopeKey,
        sequence,
        configId: config.id
    };
}
export class InMemorySequenceStore {
    constructor() {
        this.counters = new Map();
    }
    next(key) {
        const current = this.counters.get(key) ?? 0;
        const nextValue = current + 1;
        this.counters.set(key, nextValue);
        return nextValue;
    }
}
