// Minimal polyfills/utilities to avoid relying on newer JS runtime features

export type SettledResult<T> =
  | { status: "fulfilled"; value: T }
  | { status: "rejected"; reason: any };

export async function allSettled<T>(promises: Array<Promise<T>>): Promise<SettledResult<T>[]> {
  const wrapped = promises.map((p) =>
    Promise.resolve(p)
      .then((v) => ({ status: "fulfilled", value: v } as SettledResult<T>))
      .catch((err) => ({ status: "rejected", reason: err } as SettledResult<T>)),
  );
  return Promise.all(wrapped);
}

export function supportsResizeObserver(): boolean {
  return typeof (window as any).ResizeObserver !== "undefined";
}
