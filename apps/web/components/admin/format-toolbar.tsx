'use client';

type FormatToolbarLabels = {
  bold: string;
  italic: string;
  link: string;
  unlink: string;
};

export type FormatToolbarProps = {
  onBold: () => void;
  onItalic: () => void;
  onLink: () => void;
  onUnlink: () => void;
  labels: FormatToolbarLabels;
};

function ToolbarChip({
  label,
  onClick,
}: {
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="rounded-button border border-brown-800/15 bg-white px-2.5 py-1.5 text-xs font-bold text-brown-800 transition-colors outline-none hover:bg-sand-50 focus-visible:ring-2 focus-visible:ring-teal-700/15"
    >
      {label}
    </button>
  );
}

export function FormatToolbar({ onBold, onItalic, onLink, onUnlink, labels }: FormatToolbarProps) {
  return (
    <div
      role="toolbar"
      aria-label={labels.bold}
      className="mb-2 flex flex-wrap gap-1.5"
      onClick={(event) => event.stopPropagation()}
    >
      <ToolbarChip label={labels.bold} onClick={onBold} />
      <ToolbarChip label={labels.italic} onClick={onItalic} />
      <ToolbarChip label={labels.link} onClick={onLink} />
      <ToolbarChip label={labels.unlink} onClick={onUnlink} />
    </div>
  );
}
