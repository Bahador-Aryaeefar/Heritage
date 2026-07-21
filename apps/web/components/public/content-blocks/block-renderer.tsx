import type { ContentBlock, Locale } from '@heritage/shared-types';
import { TextBlock } from './text-block';
import { ImageBlock } from './image-block';
import { AudioBlock } from './audio-block';
import { VideoBlock } from './video-block';
import { ListBlock } from './list-block';
import { RevealOnScroll } from '@/components/public/reveal-on-scroll';

type BlockRendererProps = {
  blocks: ContentBlock[];
  locale: Locale;
  siteSlug: string;
};

export function BlockRenderer({ blocks, locale: _locale, siteSlug }: BlockRendererProps) {
  void _locale;
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
          {block.type === 'LIST' ? (
            <ListBlock listStyle={block.listStyle} items={block.items} />
          ) : null}
          {block.type === 'IMAGE' ? (
            <ImageBlock media={block.media} caption={block.caption} siteSlug={siteSlug} />
          ) : null}
          {block.type === 'AUDIO' ? (
            <AudioBlock media={block.media} caption={block.caption} />
          ) : null}
          {block.type === 'VIDEO' ? (
            <VideoBlock media={block.media} caption={block.caption} />
          ) : null}
        </RevealOnScroll>
      ))}
    </div>
  );
}
