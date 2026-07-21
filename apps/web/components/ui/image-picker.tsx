'use client';

import { useEffect, useId, useMemo, useRef } from 'react';
import { ActionButton } from '@/components/ui/action-button';

type ImagePickerProps = {
  label: string;
  value: File | null;
  onChange: (file: File | null) => void;
  currentUrl?: string | null;
  pickLabel: string;
  changeLabel: string;
  removeLabel: string;
};

export function ImagePicker({
  label,
  value,
  onChange,
  currentUrl,
  pickLabel,
  changeLabel,
  removeLabel,
}: ImagePickerProps) {
  const inputId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const objectUrl = useMemo(() => (value ? URL.createObjectURL(value) : null), [value]);
  const previewUrl = objectUrl ?? currentUrl ?? null;

  useEffect(() => {
    return () => {
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [objectUrl]);

  return (
    <div>
      <span className="mb-1.5 block text-xs font-bold tracking-wide text-brown-800">{label}</span>
      <div className="overflow-hidden rounded-card border border-dashed border-brown-800/25 bg-white">
        {previewUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={previewUrl} alt="" className="max-h-52 w-full object-cover" />
        ) : (
          <div className="flex h-40 items-center justify-center bg-linear-to-br from-brown-800/10 to-teal-700/15">
            <span className="text-[15px] font-medium text-brown-600">{pickLabel}</span>
          </div>
        )}
        <div className="flex flex-wrap items-center gap-2 border-t border-brown-800/10 px-4 py-3">
          <ActionButton type="button" onClick={() => inputRef.current?.click()}>
            {previewUrl ? changeLabel : pickLabel}
          </ActionButton>
          {value ? (
            <ActionButton
              type="button"
              variant="secondary"
              onClick={() => {
                onChange(null);
                if (inputRef.current) inputRef.current.value = '';
              }}
            >
              {removeLabel}
            </ActionButton>
          ) : null}
          {value ? (
            <span className="text-[13px] text-brown-600" dir="ltr">
              {value.name}
            </span>
          ) : null}
        </div>
      </div>
      <input
        id={inputId}
        ref={inputRef}
        type="file"
        accept="image/*"
        className="sr-only"
        onChange={(event) => onChange(event.target.files?.[0] ?? null)}
      />
    </div>
  );
}
