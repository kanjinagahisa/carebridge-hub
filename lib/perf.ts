/**
 * PERF_LOG=1 のときだけ計測ログを出す。PII は絶対に meta に含めないこと。
 */
export const isPerfLogEnabled = () => process.env.PERF_LOG === "1";

const nowMs = () => {
  if (typeof performance !== "undefined" && performance.now) return performance.now();
  return Date.now();
};

export async function perf<T>(
  label: string,
  fn: () => Promise<T>,
  meta?: Record<string, unknown>
): Promise<T> {
  if (!isPerfLogEnabled()) return fn();

  const t0 = nowMs();
  try {
    const result = await fn();
    const t1 = nowMs();
    const extra = meta ? ` meta=${JSON.stringify(meta)}` : "";
    console.log(`[perf] ${label} ${Math.round(t1 - t0)}ms${extra}`);
    return result;
  } catch (e) {
    const t1 = nowMs();
    console.log(`[perf] ${label} ERROR after ${Math.round(t1 - t0)}ms`);
    throw e;
  }
}
