'use client';

type FormatToolbarLabels = {
  bold: string;
  italic: string;
  link: string;
};

export type FormatToolbarProps = {
  onBold: () => void;
  onItalic: () => void;
  onLink: () => void;
  /** Snapshot editor selection before the chip mousedown handler runs. */
  onPrepare?: () => void;
  boldActive?: boolean;
  italicActive?: boolean;
  linkActive?: boolean;
  labels: FormatToolbarLabels;
  toolbarLabel?: string;
};

function ToolbarChip({
  label,
  onClick,
  onPrepare,
  pressed = false,
}: {
  label: string;
  onClick: () => void;
  onPrepare?: () => void;
  pressed?: boolean;
}) {
  return (
    <button
      type="button"
      aria-pressed={pressed}
      onMouseDown={(event) => {
        onPrepare?.();
        event.preventDefault();
      }}
      onClick={onClick}
      className={`rounded-button border px-2.5 py-1.5 text-xs font-bold transition-colors outline-none focus-visible:ring-2 focus-visible:ring-teal-700/15 ${
        pressed
          ? 'border-teal-700 bg-teal-700 text-sand-50'
          : 'border-brown-800/15 bg-white text-brown-800 hover:bg-sand-50'
      }`}
    >
      {label}
    </button>
  );
}

export function FormatToolbar({
  onBold,
  onItalic,
  onLink,
  onPrepare,
  boldActive = false,
  italicActive = false,
  linkActive = false,
  labels,
  toolbarLabel = 'Format',
}: FormatToolbarProps) {
  return (
    <div
      role="toolbar"
      aria-label={toolbarLabel}
      className="mb-2 flex flex-wrap gap-1.5"
      onClick={(event) => event.stopPropagation()}
    >
      <ToolbarChip label={labels.bold} onClick={onBold} onPrepare={onPrepare} pressed={boldActive} />
      <ToolbarChip
        label={labels.italic}
        onClick={onItalic}
        onPrepare={onPrepare}
        pressed={italicActive}
      />
      <ToolbarChip label={labels.link} onClick={onLink} onPrepare={onPrepare} pressed={linkActive} />
    </div>
  );
}
