export type PortalMenuBox = {
  top: number;
  left: number;
  width?: number;
  minWidth?: number;
  maxHeight: number;
};

export type MeasurePortalMenuOptions = {
  preferredMaxHeight?: number;
  minHeight?: number;
  gap?: number;
  viewportMargin?: number;
  minWidth?: number;
  /** Match trigger width exactly (Select). */
  matchTriggerWidth?: boolean;
  /** `auto` flips horizontal anchor in RTL. */
  align?: 'start' | 'end' | 'auto';
};

type ViewportBounds = {
  top: number;
  left: number;
  height: number;
  width: number;
};

function getViewportBounds(): ViewportBounds {
  const visualViewport = window.visualViewport;
  if (visualViewport) {
    return {
      top: visualViewport.offsetTop,
      left: visualViewport.offsetLeft,
      height: visualViewport.height,
      width: visualViewport.width,
    };
  }

  return {
    top: 0,
    left: 0,
    height: window.innerHeight,
    width: window.innerWidth,
  };
}

export function measurePortalMenu(
  trigger: HTMLElement,
  options: MeasurePortalMenuOptions = {},
): PortalMenuBox {
  const {
    preferredMaxHeight = 224,
    minHeight = 120,
    gap = 8,
    viewportMargin = 12,
    minWidth,
    matchTriggerWidth = false,
    align = 'start',
  } = options;

  const rect = trigger.getBoundingClientRect();
  const viewport = getViewportBounds();
  const viewportBottom = viewport.top + viewport.height;
  const viewportRight = viewport.left + viewport.width;

  const spaceBelow = viewportBottom - rect.bottom - gap - viewportMargin;
  const spaceAbove = rect.top - viewport.top - gap - viewportMargin;
  const flipThreshold = Math.min(preferredMaxHeight, 140);
  const openUp = spaceBelow < flipThreshold && spaceAbove > spaceBelow;
  const available = Math.max(0, openUp ? spaceAbove : spaceBelow);
  const maxHeight = Math.min(preferredMaxHeight, Math.max(minHeight, available));

  let top = openUp ? rect.top - gap - maxHeight : rect.bottom + gap;
  const maxTop = viewportBottom - viewportMargin - maxHeight;
  top = Math.max(viewport.top + viewportMargin, Math.min(top, maxTop));

  const resolvedMinWidth = minWidth ?? (matchTriggerWidth ? rect.width : undefined);
  const menuWidth = resolvedMinWidth ?? rect.width;

  let left = rect.left;
  if (align === 'auto') {
    const isRtl = getComputedStyle(trigger).direction === 'rtl';
    left = isRtl ? rect.right - menuWidth : rect.left;
  } else if (align === 'end') {
    left = rect.right - menuWidth;
  }

  left = Math.min(
    Math.max(viewport.left + viewportMargin, left),
    viewportRight - menuWidth - viewportMargin,
  );

  return {
    top,
    left,
    width: matchTriggerWidth ? rect.width : undefined,
    minWidth: resolvedMinWidth,
    maxHeight,
  };
}

export function subscribePortalMenuPosition(update: () => void): () => void {
  window.addEventListener('resize', update);
  window.addEventListener('scroll', update, true);

  const visualViewport = window.visualViewport;
  visualViewport?.addEventListener('resize', update);
  visualViewport?.addEventListener('scroll', update);

  return () => {
    window.removeEventListener('resize', update);
    window.removeEventListener('scroll', update, true);
    visualViewport?.removeEventListener('resize', update);
    visualViewport?.removeEventListener('scroll', update);
  };
}
