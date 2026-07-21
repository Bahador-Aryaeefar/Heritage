import { afterEach, describe, it, expect, vi } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import { SiteCard } from '@/components/public/site-card';

vi.mock('next/image', () => ({
  default: (props: { alt: string }) => <div role="img" aria-label={props.alt} />,
}));

vi.mock('@/i18n/navigation', () => ({
  Link: ({ href, children }: { href: string; children: React.ReactNode }) => (
    <a href={href}>{children}</a>
  ),
}));

vi.mock('@/lib/media-url', () => ({
  resolveCoverUrl: (coverUrl: string | null) => coverUrl,
}));

describe('SiteCard', () => {
  afterEach(() => {
    cleanup();
  });

  it('links to the site detail page and shows category cover when no photo', () => {
    render(
      <SiteCard
        locale="fa"
        site={{
          slug: 'taq-e-bostan',
          category: 'HISTORICAL',
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
    expect(screen.getByRole('img', { name: 'taq-e-bostan' })).toBeInTheDocument();
  });

  it('uses site slug as cover image alt text', () => {
    render(
      <SiteCard
        locale="en"
        site={{
          slug: 'taq-e-bostan',
          category: 'HISTORICAL',
          coverUrl: '/media/taq-e-bostan/cover.webp',
          city: { slug: 'kermanshah-city', nameFa: 'کرمانشاه', nameEn: 'Kermanshah' },
          province: { slug: 'kermanshah', nameFa: 'کرمانشاه', nameEn: 'Kermanshah' },
          translations: [
            {
              locale: 'en',
              title: 'Taq-e Bostan',
              shortDescription: 'Short description',
            },
          ],
        }}
      />,
    );

    expect(screen.getByRole('img', { name: 'taq-e-bostan' })).toBeInTheDocument();
  });
});
