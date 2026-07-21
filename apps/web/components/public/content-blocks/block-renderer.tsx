import type { ContentBlock } from '@heritage/shared-types';
import { toContentLocale } from '@/i18n/locales';
import type { Locale as UiLocale } from '@/i18n/routing';
import { TextBlock } from './text-block';
import { ImageBlock } from './image-block';
import { AudioBlock } from './audio-block';
import { VideoBlock } from './video-block';
import { RevealOnScroll } from '@/components/public/reveal-on-scroll';

type BlockRendererProps = {
  blocks: ContentBlock[];
  locale: UiLocale | string;
  siteSlug: string;
};

export function BlockRenderer({ blocks, locale, siteSlug }: BlockRendererProps) {
  const contentLocale = toContentLocale(locale);
  return (
    <div className="flex flex-col gap-8">
      {blocks.map((block) => (
        <RevealOnScroll key={`${block.type}-${block.sortOrder}`}>
          {block.type === 'HEADING' || block.type === 'PARAGRAPH' ? (
            <TextBlock
              type={block.type}
              textRole={block.textRole}
              colorToken={block.colorToken}
              align={block.align}
              spans={block.spans}
            />
          ) : null}
          {block.type === 'IMAGE' ? (
            <ImageBlock
              media={block.media}
              caption={block.caption}
              locale={contentLocale}
              siteSlug={siteSlug}
            />
          ) : null}
          {block.type === 'AUDIO' ? (
            <AudioBlock media={block.media} caption={block.caption} locale={contentLocale} />
          ) : null}
          {block.type === 'VIDEO' ? (
            <VideoBlock media={block.media} caption={block.caption} locale={contentLocale} />
          ) : null}
        </RevealOnScroll>
      ))}
    </div>
  );
}
