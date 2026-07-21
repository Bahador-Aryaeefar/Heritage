import type { ReactNode } from 'react';
import type { ListItem, ListStyle, TextSpan } from '@heritage/shared-types';

type ListBlockProps = {
  listStyle: ListStyle;
  items: ListItem[];
};

function isExternalHttpUrl(href: string): boolean {
  return /^https?:\/\//i.test(href);
}

function renderSpans(spans: TextSpan[]): ReactNode[] {
  return spans.map((span, index) => {
    let content: ReactNode = span.text;
    if (span.bold) content = <strong>{content}</strong>;
    if (span.italic) content = <em>{content}</em>;
    if (span.href) {
      content = (
        <a
          href={span.href}
          className="font-bold text-teal-700 hover:text-teal-500"
          {...(isExternalHttpUrl(span.href)
            ? { target: '_blank', rel: 'noopener noreferrer' }
            : {})}
        >
          {content}
        </a>
      );
    }
    return <span key={`${index}-${span.text.slice(0, 8)}`}>{content}</span>;
  });
}

export function ListBlock({ listStyle, items }: ListBlockProps) {
  const ListTag = listStyle === 'NUMBERED' ? 'ol' : 'ul';
  const listClass =
    listStyle === 'NUMBERED'
      ? 'list-decimal space-y-3 ps-6 text-[17px] leading-relaxed text-brown-800'
      : 'list-disc space-y-3 ps-6 text-[17px] leading-relaxed text-brown-800';

  return (
    <ListTag className={listClass}>
      {items.map((item, index) => (
        <li key={`list-item-${index}`}>{renderSpans(item.spans)}</li>
      ))}
    </ListTag>
  );
}
