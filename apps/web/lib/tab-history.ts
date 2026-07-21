export type TabHistory<T> = {
  push: (state: T) => void;
  /** Coalesce rapid pushes with the same key (e.g. typing) into one undo step (~300ms). */
  pushCoalesced: (state: T, key: string) => void;
  undo: () => T | undefined;
  redo: () => T | undefined;
  canUndo: () => boolean;
  canRedo: () => boolean;
};

const COALESCE_MS = 300;

/**
 * Per-content-tab undo/redo stack. `push` snapshots the full tab state
 * (`{ title, shortDescription, blocks }`). Typing should use `pushCoalesced`.
 */
export function createTabHistory<T>(limit = 50): TabHistory<T> {
  const past: T[] = [];
  const future: T[] = [];
  let coalesceKey: string | null = null;
  let coalesceTimer: ReturnType<typeof setTimeout> | null = null;

  function clearCoalesce() {
    if (coalesceTimer) {
      clearTimeout(coalesceTimer);
      coalesceTimer = null;
    }
    coalesceKey = null;
  }

  function push(state: T) {
    clearCoalesce();
    past.push(structuredClone(state));
    if (past.length > limit) past.shift();
    future.length = 0;
  }

  function pushCoalesced(state: T, key: string) {
    if (coalesceKey === key && past.length > 0) {
      past[past.length - 1] = structuredClone(state);
    } else {
      clearCoalesce();
      past.push(structuredClone(state));
      if (past.length > limit) past.shift();
      future.length = 0;
      coalesceKey = key;
    }
    if (coalesceTimer) clearTimeout(coalesceTimer);
    coalesceTimer = setTimeout(() => {
      coalesceKey = null;
      coalesceTimer = null;
    }, COALESCE_MS);
  }

  function undo(): T | undefined {
    clearCoalesce();
    if (past.length < 2) return undefined;
    const current = past.pop()!;
    future.push(current);
    return structuredClone(past[past.length - 1]!);
  }

  function redo(): T | undefined {
    clearCoalesce();
    const next = future.pop();
    if (next === undefined) return undefined;
    past.push(next);
    return structuredClone(next);
  }

  return {
    push,
    pushCoalesced,
    undo,
    redo,
    canUndo: () => past.length >= 2,
    canRedo: () => future.length > 0,
  };
}
