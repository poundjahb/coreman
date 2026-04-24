import type {
  GeneratedReference,
  ReferenceContext,
  ReferenceFormatConfig,
  SequenceStore
} from "../../domain/reference";

function padSequence(rawValue: number, token: string): string {
  const size = Number(token.replace("SEQ", ""));
  return String(rawValue).padStart(size, "0");
}

export function getPeriodKey(date: Date, policy: ReferenceFormatConfig["resetPolicy"]): string {
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

export function resolveConfig(
  configs: ReferenceFormatConfig[],
  context: ReferenceContext
): ReferenceFormatConfig {
  const active = configs.filter((config) => config.isActive);

  const byBranchDepartment = active.find(
    (config) =>
      config.scope === "BRANCH_DEPARTMENT" &&
      config.branchId === context.branchId &&
      config.departmentId === context.departmentId
  );
  if (byBranchDepartment) {
    return byBranchDepartment;
  }

  const byBranch = active.find(
    (config) => config.scope === "BRANCH" && config.branchId === context.branchId
  );
  if (byBranch) {
    return byBranch;
  }

  const global = active.find((config) => config.scope === "GLOBAL");
  if (!global) {
    throw new Error("System setup is incomplete: no active reference format is configured.");
  }

  return global;
}

export function renderPattern(
  pattern: string,
  context: ReferenceContext,
  sequence: number
): string {
  const date = context.now;
  const replacements: Record<string, string> = {
    ORG: context.orgCode,
    BRANCH: context.branchCode,
    DEPT: context.departmentCode ?? "NA",
    YYYY: String(date.getUTCFullYear()),
    YY: String(date.getUTCFullYear()).slice(-2),
    MM: String(date.getUTCMonth() + 1).padStart(2, "0"),
    DD: String(date.getUTCDate()).padStart(2, "0")
  };

  return pattern.replace(/\{([A-Z0-9]+)\}/g, (_match, token: string) => {
    if (token.startsWith("SEQ")) {
      return padSequence(sequence, token);
    }

    return replacements[token] ?? token;
  });
}

export async function generateFallbackReferenceAsync(
  orgCode: string,
  now: Date,
  nextSequence: (key: string) => Promise<number>
): Promise<string> {
  const day = String(now.getUTCDate()).padStart(2, "0");
  const month = String(now.getUTCMonth() + 1).padStart(2, "0");
  const year = String(now.getUTCFullYear()).slice(-2);
  const datePart = `${day}${month}${year}`;
  const scopeKey = `FALLBACK|${orgCode}|${datePart}`;
  const sequence = await nextSequence(scopeKey);

  return `${orgCode}${sequence}/${datePart}`;
}

export function generateReference(
  configs: ReferenceFormatConfig[],
  context: ReferenceContext,
  sequenceStore: SequenceStore
): GeneratedReference {
  const config = resolveConfig(configs, context);
  const periodKey = getPeriodKey(context.now, config.resetPolicy);
  const scopeKey = [config.scope, context.branchId, context.departmentId ?? "NONE", periodKey].join("|");
  const sequence = sequenceStore.next(scopeKey);
  if (typeof sequence !== "number") {
    throw new Error("Synchronous reference generation requires a synchronous sequence store.");
  }

  return {
    value: renderPattern(config.pattern, context, sequence),
    sequenceKey: scopeKey,
    sequence,
    configId: config.id
  };
}

export async function generateReferenceAsync(
  configs: ReferenceFormatConfig[],
  context: ReferenceContext,
  nextSequence: (key: string) => Promise<number>
): Promise<GeneratedReference> {
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

export class InMemorySequenceStore implements SequenceStore {
  private readonly counters = new Map<string, number>();

  next(key: string): number {
    const current = this.counters.get(key) ?? 0;
    const nextValue = current + 1;
    this.counters.set(key, nextValue);
    return nextValue;
  }
}
