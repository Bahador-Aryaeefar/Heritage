import type { ReactNode } from 'react';
import type { ColorToken, TextRole, TextSpan, BlockAlign } from '@heritage/shared-types';

const roleClasses: Record<TextRole, string> = {
  HERO: 'text-[clamp(26px,2.8vw,38px)] font-black leading-snug',
  H2: 'text-[clamp(22px,2.5vw,28px)] font-black leading-snug',
  H3: 'text-base font-bold',
  BODY: 'text-[17px] leading-relaxed',
  CAPTION: 'text-[13px] leading-relaxed',
};

const colorClasses: Record<ColorToken, string> = {
  BROWN_950: 'text-brown-950',
  BROWN_800: 'text-brown-800',
  BROWN_600: 'text-brown-600',
  TEAL_700: 'text-teal-700',
  SAND_50: 'text-sand-50',
};

const alignClasses: Record<BlockAlign, string> = {
  START: 'text-start',
  CENTER: 'text-center',
};

type TextBlockProps = {
  type: 'HEADING' | 'PARAGRAPH';
  textRole: TextRole;
  colorToken: ColorToken;
  align: BlockAlign;
  spans: TextSpan[];
};

export function TextBlock({ type, textRole, colorToken, align, spans }: TextBlockProps) {
  const className = `${roleClasses[textRole]} ${colorClasses[colorToken]} ${alignClasses[align]}`;
  const Tag = type === 'HEADING' ? 'h2' : 'p';

  return (
    <Tag className={className}>
      {spans.map((span, index) => {
        let content: ReactNode = span.text;
        if (span.bold) content = <strong>{content}</strong>;
        if (span.italic) content = <em>{content}</em>;
        return <span key={`${index}-${span.text.slice(0, 8)}`}>{content}</span>;
      })}
    </Tag>
  );
}

export { roleClasses, colorClasses, alignClasses };
