'use client';

import { useId, useRef } from 'react';
import { ActionButton } from '@/components/ui/action-button';

export type MediaFilePickerProps = {
  kind: 'image' | 'audio';
  previewUrl: string | null;
  hasFile: boolean;
  labels: { pick: string; change: string; remove: string; attached: string };
  onPick: (file: File) => void;
  onRemove: () => void;
};

/**
 * Controlled media pick control shared by canvas/inspector. Image previews use public-page
 * sizing (`object-contain`, `max-h-80`, centered) — never stretch with `object-cover`.
 * Audio previews render a playable `<audio controls>` when `previewUrl` is set.
 */
export function MediaFilePicker({
  kind,
  previewUrl,
  hasFile,
  labels,
  onPick,
  onRemove,
}: MediaFilePickerProps) {
  const inputId = useId();
  const inputRef = useRef<HTMLInputElement>(null);

  return (
    <div className="overflow-hidden rounded-card border border-dashed border-brown-800/25 bg-white">
      {kind === 'image' && previewUrl ? (
        <div className="flex justify-center bg-sand-100 p-3">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={previewUrl}
            alt=""
            className="mx-auto h-auto max-h-80 w-auto max-w-full object-contain"
          />
        </div>
      ) : kind === 'audio' && previewUrl ? (
        <div className="bg-sand-100 p-4">
          <audio
            controls
            className="w-full"
            src={previewUrl}
            onClick={(event) => event.stopPropagation()}
          >
            <track kind="captions" />
          </audio>
        </div>
      ) : (
        <div className="flex h-24 items-center justify-center bg-linear-to-br from-brown-800/10 to-teal-700/15">
          <span className="text-[15px] font-medium text-brown-600">
            {hasFile ? labels.attached : labels.pick}
          </span>
        </div>
      )}
      <div className="flex flex-wrap items-center gap-2 border-t border-brown-800/10 px-4 py-3">
        <ActionButton type="button" onClick={() => inputRef.current?.click()}>
          {hasFile ? labels.change : labels.pick}
        </ActionButton>
        {hasFile ? (
          <ActionButton
            type="button"
            variant="secondary"
            onClick={() => {
              onRemove();
              if (inputRef.current) inputRef.current.value = '';
            }}
          >
            {labels.remove}
          </ActionButton>
        ) : null}
      </div>
      <input
        id={inputId}
        ref={inputRef}
        type="file"
        accept={kind === 'image' ? 'image/*' : 'audio/*'}
        className="sr-only"
        onChange={(event) => {
          const file = event.target.files?.[0];
          if (file) onPick(file);
        }}
      />
    </div>
  );
}
