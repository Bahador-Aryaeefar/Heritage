import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { SiteCard } from '@/components/public/site-card';

vi.mock('next/image', () => ({
  default: (props: { alt: string }) => <div role="img" aria-label={props.alt} />,
}));

vi.mock('@/i18n/navigation', () => ({
  Link: ({ href, children }: { href: string; children: React.ReactNode }) => (
    <a href={href}>{children}</a>
  ),
}));

describe('SiteCard', () => {
  it('links to the site detail page with localized title', () => {
    render(
      <SiteCard
        locale="fa"
        site={{
          slug: 'taq-e-bostan',
          category: 'ANCIENT',
          coverUrl: null,
          city: { slug: 'kermanshah-city', nameFa: 'کرمانشاه', nameEn: 'Kermanshah' },
          province: { slug: 'kermanshah', nameFa: 'کرمانشاه', nameEn: 'Kermanshah' },
          translations: [
            {
              locale: 'fa',
              title: 'طاق بستان',
              shortDescription: 'توضیح کوتاه',
            },
          ],
        }}
      />,
    );

    const link = screen.getByRole('link', { name: /طاق بستان/i });
    expect(link).toHaveAttribute('href', '/sites/taq-e-bostan');
    expect(screen.getByText('توضیح کوتاه')).toBeInTheDocument();
  });
});
