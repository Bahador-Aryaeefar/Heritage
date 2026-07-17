import type { NextConfig } from 'next';
import createNextIntlPlugin from 'next-intl/plugin';

const withNextIntl = createNextIntlPlugin('./i18n/request.ts');

const apiOrigin = (process.env.API_BASE_URL ?? 'http://localhost:4000/api/v1').replace(/\/api\/v1\/?$/, '');

function uploadRemotePatterns(): NonNullable<NextConfig['images']>['remotePatterns'] {
  const patterns: NonNullable<NextConfig['images']>['remotePatterns'] = [
    {
      protocol: 'http',
      hostname: 'localhost',
      port: '4000',
      pathname: '/uploads/**',
    },
    {
      protocol: 'http',
      hostname: '127.0.0.1',
      port: '4000',
      pathname: '/uploads/**',
    },
  ];

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL;
  if (siteUrl) {
    try {
      const parsed = new URL(siteUrl);
      patterns.push({
        protocol: parsed.protocol.replace(':', '') as 'http' | 'https',
        hostname: parsed.hostname,
        ...(parsed.port ? { port: parsed.port } : {}),
        pathname: '/uploads/**',
      });
    } catch {
      // ignore invalid URL at build time
    }
  }

  return patterns;
}

const nextConfig: NextConfig = {
  output: 'standalone',
  images: {
    remotePatterns: uploadRemotePatterns(),
  },
  async rewrites() {
    return [
      {
        source: '/uploads/:path*',
        destination: `${apiOrigin}/uploads/:path*`,
      },
      {
        source: '/downloads/sites/:slug/plaque.png',
        destination: `${apiOrigin}/api/v1/public/sites/:slug/qr.png`,
      },
    ];
  },
};

export default withNextIntl(nextConfig);
