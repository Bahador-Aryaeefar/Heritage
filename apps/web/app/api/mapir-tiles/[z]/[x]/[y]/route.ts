import { NextRequest, NextResponse } from 'next/server';
import { loadRootEnv } from '@heritage/env-loader';

loadRootEnv();

/** Map.ir XYZ raster (Persian labels). Auth via x-api-key header only. */
const MAP_IR_TILE = 'https://map.ir/shiveh/xyz/1.0.0/Shiveh:Shiveh/{z}/{x}/{y}.png';

type RouteContext = {
  params: Promise<{ z: string; x: string; y: string }>;
};

export async function GET(_request: NextRequest, context: RouteContext) {
  const { z, x, y } = await context.params;
  if (![z, x, y].every((part) => /^\d+$/.test(part))) {
    return new NextResponse('Invalid tile coordinates', { status: 400 });
  }

  const apiKey = process.env.NEXT_PUBLIC_MAP_IR_API_KEY?.trim();
  if (!apiKey) {
    return new NextResponse('Map.ir API key not configured', { status: 503 });
  }

  const upstream = MAP_IR_TILE.replace('{z}', z).replace('{x}', x).replace('{y}', y);

  try {
    const response = await fetch(upstream, {
      headers: {
        'x-api-key': apiKey,
        'Mapir-SDK': 'heritage-web',
      },
      // Tiles are public map imagery; cache briefly on the edge/CDN if present.
      next: { revalidate: 86400 },
    });

    if (!response.ok) {
      return new NextResponse(`Upstream tile error (${response.status})`, {
        status: response.status === 401 || response.status === 403 ? 502 : response.status,
      });
    }

    const body = await response.arrayBuffer();
    const contentType = response.headers.get('content-type') ?? 'image/png';

    return new NextResponse(body, {
      status: 200,
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'public, max-age=86400, stale-while-revalidate=604800',
      },
    });
  } catch {
    return new NextResponse('Failed to fetch Map.ir tile', { status: 502 });
  }
}
