import type { Locale } from '@/i18n/routing';
import {
  buildGoogleMapsEmbedUrl,
  buildGoogleMapsUrl,
  buildNeshanMapsUrl,
  formatCoordinates,
} from '@/lib/map-urls';

type SiteLocationProps = {
  lat: string;
  lng: string;
  cityName: string;
  provinceName: string;
  locale: Locale;
  openGoogleLabel: string;
  openNeshanLabel: string;
  mapTitle: string;
  coordinatesLabel: string;
};

export function SiteLocation({
  lat,
  lng,
  cityName,
  provinceName,
  locale,
  openGoogleLabel,
  openNeshanLabel,
  mapTitle,
  coordinatesLabel,
}: SiteLocationProps) {
  const googleMapsUrl = buildGoogleMapsUrl(lat, lng);
  const neshanMapsUrl = buildNeshanMapsUrl(lat, lng);
  const googleMapsEmbedUrl = buildGoogleMapsEmbedUrl(lat, lng);
  const coordinates = formatCoordinates(lat, lng, locale);

  return (
    <section aria-label={coordinatesLabel} className="mt-3">
      <p className="text-sm text-teal-700">
        {cityName} · {provinceName}
      </p>
      <p className="mt-1 text-xs text-brown-600">
        {coordinatesLabel}: {coordinates}
      </p>
      <div className="mt-3 flex flex-wrap gap-x-4 gap-y-2">
        <a
          href={googleMapsUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="text-sm font-bold text-teal-700 hover:text-teal-500"
        >
          {openGoogleLabel}
        </a>
        <a
          href={neshanMapsUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="text-sm font-bold text-teal-700 hover:text-teal-500"
        >
          {openNeshanLabel}
        </a>
      </div>
      <div className="mt-4 w-full max-w-3xl overflow-hidden rounded-container ring-1 ring-brown-800/8">
        <div className="relative aspect-video w-full bg-brown-950">
          <iframe
            src={googleMapsEmbedUrl}
            title={mapTitle}
            className="absolute inset-0 h-full w-full border-0"
            loading="lazy"
            referrerPolicy="no-referrer-when-downgrade"
            allowFullScreen
          />
        </div>
      </div>
    </section>
  );
}
