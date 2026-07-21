import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { measurePortalMenu } from '@/lib/measure-portal-menu';

function mockTrigger(rect: DOMRect, direction: 'ltr' | 'rtl' = 'ltr'): HTMLElement {
  const trigger = document.createElement('button');
  trigger.getBoundingClientRect = () => rect;
  Object.defineProperty(trigger, 'direction', {
    configurable: true,
    get: () => direction,
  });
  vi.spyOn(window, 'getComputedStyle').mockReturnValue({
    direction,
  } as CSSStyleDeclaration);
  return trigger;
}

describe('measurePortalMenu', () => {
  beforeEach(() => {
    Object.defineProperty(window, 'innerHeight', { configurable: true, value: 800 });
    Object.defineProperty(window, 'innerWidth', { configurable: true, value: 1200 });
    Object.defineProperty(window, 'visualViewport', {
      configurable: true,
      value: undefined,
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('opens upward when there is little space below the trigger', () => {
    const trigger = mockTrigger(new DOMRect(100, 720, 240, 40));
    const box = measurePortalMenu(trigger, { preferredMaxHeight: 224, minHeight: 120 });

    expect(box.top).toBeLessThan(720);
    expect(box.maxHeight).toBeGreaterThan(0);
  });

  it('clamps menu width to trigger width for matchTriggerWidth selects', () => {
    const trigger = mockTrigger(new DOMRect(40, 120, 280, 44));
    const box = measurePortalMenu(trigger, { matchTriggerWidth: true });

    expect(box.width).toBe(280);
    expect(box.left).toBe(40);
  });

  it('anchors auto menus to the right in rtl', () => {
    const trigger = mockTrigger(new DOMRect(900, 120, 180, 40), 'rtl');
    const box = measurePortalMenu(trigger, { minWidth: 208, align: 'auto' });

    expect(box.left).toBe(872);
    expect(box.minWidth).toBe(208);
  });
});
