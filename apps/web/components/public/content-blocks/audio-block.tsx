import type { MediaRef } from '@heritage/shared-types';
import type { Locale } from '@heritage/shared-types';

type AudioBlockProps = {
  media: MediaRef;
  caption: string | null;
  locale: Locale;
};

export function AudioBlock({ media, caption, locale }: AudioBlockProps) {
  const label = locale === 'fa' ? media.altFa ?? caption : media.altEn ?? caption;

  if (!media.url) return null;

  return (
    <figure className="mx-auto w-full max-w-lg text-center">
      <div className="overflow-hidden rounded-card bg-sand-100 p-4 ring-1 ring-brown-800/10">
        <audio controls className="w-full" src={media.url} aria-label={label ?? undefined}>
          <track kind="captions" />
        </audio>
      </div>
      {caption ? <figcaption className="mt-2 text-[14px] text-brown-800">{caption}</figcaption> : null}
    </figure>
  );
}
