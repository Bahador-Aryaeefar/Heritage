import Image from 'next/image';
import type { MediaRef } from '@heritage/shared-types';
import { resolveMediaUrl } from '@/lib/media-url';

type ImageBlockProps = {
  media: MediaRef;
  caption: string | null;
  siteSlug: string;
};

export function ImageBlock({ media, caption, siteSlug }: ImageBlockProps) {
  const src = resolveMediaUrl(media.url, siteSlug);

  if (!src) return null;

  return (
    <figure className="mx-auto flex max-w-lg flex-col items-center text-center">
      <div className="inline-block max-w-full overflow-hidden rounded-card bg-sand-100 p-2 ring-1 ring-brown-800/10">
        <Image
          src={src}
          alt={caption ?? ''}
          width={640}
          height={480}
          className="mx-auto h-auto max-h-80 w-auto max-w-full object-contain"
          sizes="(max-width: 768px) 90vw, 512px"
          unoptimized={src.endsWith('.webp')}
        />
      </div>
      {caption ? (
        <figcaption className="mt-2 text-[14px] leading-relaxed text-brown-800">{caption}</figcaption>
      ) : null}
    </figure>
  );
}
