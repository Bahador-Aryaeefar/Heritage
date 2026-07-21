import { describe, expect, it } from 'vitest';
import { render } from '@testing-library/react';
import { ListBlock } from '@/components/public/content-blocks/list-block';

describe('ListBlock', () => {
  it('renders a numbered list with rich spans', () => {
    const { container } = render(
      <ListBlock
        listStyle="NUMBERED"
        items={[
          { spans: [{ text: 'Step one', bold: true }] },
          { spans: [{ text: 'Step two', href: 'https://example.com' }] },
        ]}
      />,
    );

    expect(container.querySelector('ol')).toBeTruthy();
    expect(container.querySelectorAll('li')).toHaveLength(2);
    expect(container.querySelector('strong')?.textContent).toBe('Step one');
    expect(container.querySelector('a')?.getAttribute('href')).toBe('https://example.com');
  });
});
