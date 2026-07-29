export function parseDeviceType(userAgent: string | undefined): string | undefined {
  if (!userAgent) return undefined;
  if (/tablet|ipad/i.test(userAgent)) return 'tablet';
  if (/mobile|iphone|android/i.test(userAgent)) return 'mobile';
  return 'desktop';
}
