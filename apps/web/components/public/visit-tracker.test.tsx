import { afterEach, describe, it, expect, vi } from 'vitest';
import { cleanup, render } from '@testing-library/react';
import { StrictMode } from 'react';
import { VisitTracker } from '@/components/public/visit-tracker';

describe('VisitTracker', () => {
  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it('sends a WEB beacon with the slug and locale when there is no src=qr param', () => {
    const sendBeacon = vi.fn().mockReturnValue(true);
    vi.stubGlobal('navigator', { ...navigator, sendBeacon });
    window.history.pushState({}, '', '/sites/taq-e-bostan');

    render(<VisitTracker slug="taq-e-bostan" locale="fa" />);

    expect(sendBeacon).toHaveBeenCalledTimes(1);
    const [url, blob] = sendBeacon.mock.calls[0] as [string, Blob];
    expect(url).toBe('/api/v1/public/sites/taq-e-bostan/visits');
    expect(blob.type).toBe('application/json');
  });

  it('sends a QR beacon when the URL has ?src=qr', () => {
    const RealBlob = globalThis.Blob;
    const blobSpy = vi
      .spyOn(globalThis, 'Blob')
      .mockImplementation((parts, options) => new RealBlob(parts, options));
    const sendBeacon = vi.fn().mockReturnValue(true);
    vi.stubGlobal('navigator', { ...navigator, sendBeacon });
    window.history.pushState({}, '', '/sites/taq-e-bostan?src=qr');

    render(<VisitTracker slug="taq-e-bostan" locale="en" />);

    expect(sendBeacon).toHaveBeenCalledTimes(1);
    const [body] = blobSpy.mock.calls[0] as [string[]];
    const payload = JSON.parse(body[0]);
    expect(payload).toEqual({ source: 'QR', locale: 'en' });
  });

  it('falls back to keepalive fetch when sendBeacon is unavailable', () => {
    vi.stubGlobal('navigator', { ...navigator, sendBeacon: undefined });
    const fetchMock = vi.fn().mockResolvedValue(new Response(null, { status: 204 }));
    vi.stubGlobal('fetch', fetchMock);
    window.history.pushState({}, '', '/sites/taq-e-bostan');

    render(<VisitTracker slug="taq-e-bostan" locale="fa" />);

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe('/api/v1/public/sites/taq-e-bostan/visits');
    expect(init.method).toBe('POST');
    expect(init.keepalive).toBe(true);
    expect(JSON.parse(init.body as string)).toEqual({ source: 'WEB', locale: 'fa' });
  });

  it('fires exactly one beacon under React StrictMode double-effect mounting', () => {
    const sendBeacon = vi.fn().mockReturnValue(true);
    vi.stubGlobal('navigator', { ...navigator, sendBeacon });
    window.history.pushState({}, '', '/sites/taq-e-bostan');

    render(
      <StrictMode>
        <VisitTracker slug="taq-e-bostan" locale="fa" />
      </StrictMode>,
    );

    expect(sendBeacon).toHaveBeenCalledTimes(1);
  });

  it('renders nothing', () => {
    vi.stubGlobal('navigator', { ...navigator, sendBeacon: vi.fn().mockReturnValue(true) });
    window.history.pushState({}, '', '/sites/taq-e-bostan');

    const { container } = render(<VisitTracker slug="taq-e-bostan" locale="fa" />);

    expect(container).toBeEmptyDOMElement();
  });
});
