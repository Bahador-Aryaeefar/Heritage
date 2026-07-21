import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createTabHistory } from './tab-history';

describe('createTabHistory', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('undoes to the previous snapshot and redoes forward', () => {
    const history = createTabHistory<{ n: number }>();
    history.push({ n: 1 });
    history.push({ n: 2 });
    history.push({ n: 3 });

    expect(history.canUndo()).toBe(true);
    expect(history.undo()).toEqual({ n: 2 });
    expect(history.undo()).toEqual({ n: 1 });
    expect(history.canUndo()).toBe(false);
    expect(history.undo()).toBeUndefined();

    expect(history.canRedo()).toBe(true);
    expect(history.redo()).toEqual({ n: 2 });
    expect(history.redo()).toEqual({ n: 3 });
    expect(history.canRedo()).toBe(false);
  });

  it('coalesces rapid pushes with the same key into one undo step', () => {
    const history = createTabHistory<{ text: string }>();
    history.push({ text: '' });
    history.pushCoalesced({ text: 'a' }, 'typing');
    history.pushCoalesced({ text: 'ab' }, 'typing');
    history.pushCoalesced({ text: 'abc' }, 'typing');

    expect(history.undo()).toEqual({ text: '' });
    expect(history.canUndo()).toBe(false);
  });

  it('starts a new undo step after the coalesce window', () => {
    const history = createTabHistory<{ text: string }>();
    history.push({ text: '' });
    history.pushCoalesced({ text: 'a' }, 'typing');
    vi.advanceTimersByTime(300);
    history.pushCoalesced({ text: 'ab' }, 'typing');

    expect(history.undo()).toEqual({ text: 'a' });
    expect(history.undo()).toEqual({ text: '' });
  });

  it('caps stack length at the limit', () => {
    const history = createTabHistory<{ n: number }>(3);
    history.push({ n: 1 });
    history.push({ n: 2 });
    history.push({ n: 3 });
    history.push({ n: 4 });

    expect(history.undo()).toEqual({ n: 3 });
    expect(history.undo()).toEqual({ n: 2 });
    expect(history.canUndo()).toBe(false);
  });
});
