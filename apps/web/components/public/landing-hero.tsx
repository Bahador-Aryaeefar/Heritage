import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { HeroPlaque } from '@/components/public/hero-plaque';

type LandingHeroProps = {
  eyebrow: string;
  title: string;
  titleAccent: string;
  description: string;
  ctaPrimary: string;
  ctaSecondary: string;
  plaqueSite: string;
  plaqueLocation: string;
  brandName: string;
  brandTagline: string;
  heroImageSrc: string;
  heroImageAlt: string;
  qrUrl: string;
  plaqueDownloadUrl: string;
  downloadLabel: string;
};

export function LandingHero({
  eyebrow,
  title,
  titleAccent,
  description,
  ctaPrimary,
  ctaSecondary,
  plaqueSite,
  plaqueLocation,
  brandName,
  brandTagline,
  heroImageSrc,
  heroImageAlt,
  qrUrl,
  plaqueDownloadUrl,
  downloadLabel,
}: LandingHeroProps) {
  const titleParts = title.includes(titleAccent) ? title.split(titleAccent) : [title, ''];

  return (
    <section className="w-full px-[6vw] pb-16 pt-8">
      <div className="mx-auto grid max-w-[1400px] items-center gap-10 lg:grid-cols-[1.05fr_0.95fr] lg:gap-14">
        <div>
          <Badge>{eyebrow}</Badge>
          <h1 className="mt-4 text-[clamp(26px,2.8vw,38px)] font-black leading-snug text-brown-950">
            {titleParts[0]}
            {titleAccent ? <em className="not-italic text-teal-700">{titleAccent}</em> : null}
            {titleParts[1]}
          </h1>
          <p className="mt-4 max-w-2xl text-[17px] leading-relaxed text-brown-800">{description}</p>
          <div className="mt-7 flex flex-wrap gap-3">
            <Button href="#how">{ctaPrimary}</Button>
            <Button href="#categories" variant="secondary">
              {ctaSecondary}
            </Button>
          </div>
        </div>

        <HeroPlaque
          heroImageSrc={heroImageSrc}
          heroImageAlt={heroImageAlt}
          plaqueSite={plaqueSite}
          plaqueLocation={plaqueLocation}
          brandName={brandName}
          brandTagline={brandTagline}
          qrUrl={qrUrl}
          plaqueDownloadUrl={plaqueDownloadUrl}
          downloadLabel={downloadLabel}
          downloadFilename="taq-e-bostan-plaque.png"
        />
      </div>
    </section>
  );
}
