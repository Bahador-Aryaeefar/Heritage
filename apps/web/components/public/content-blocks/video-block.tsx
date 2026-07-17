import type { MediaRef } from '@heritage/shared-types';
import type { Locale } from '@heritage/shared-types';

type VideoBlockProps = {
  media: MediaRef;
  caption: string | null;
  locale: Locale;
};

export function VideoBlock({ media, caption, locale }: VideoBlockProps) {
  const title = locale === 'fa' ? media.altFa ?? caption : media.altEn ?? caption;

  if (media.embedUrl) {
    return (
      <figure className="mx-auto w-full max-w-2xl text-center">
        <div className="overflow-hidden rounded-card ring-1 ring-brown-800/10">
          <div className="relative aspect-video w-full bg-brown-950">
            <iframe
              src={media.embedUrl}
              title={title ?? 'Video'}
              className="absolute inset-0 h-full w-full border-0"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
            />
          </div>
        </div>
        {caption ? <figcaption className="mt-2 text-[14px] text-brown-800">{caption}</figcaption> : null}
      </figure>
    );
  }

  if (!media.url) return null;

  return (
    <figure className="mx-auto w-full max-w-2xl text-center">
      <div className="overflow-hidden rounded-card ring-1 ring-brown-800/10">
        <video
          controls
          className="mx-auto w-full rounded-card bg-brown-950"
          src={media.url}
          aria-label={title ?? undefined}
        />
      </div>
      {caption ? <figcaption className="mt-2 text-[14px] text-brown-800">{caption}</figcaption> : null}
    </figure>
  );
}
