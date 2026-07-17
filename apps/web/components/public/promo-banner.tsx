import Image from 'next/image';
import { Button } from '@/components/ui/button';

type PromoBannerProps = {
  title: string;
  body: string;
  cta: string;
  href: string;
  variant?: 'neutral' | 'accent';
  imageSrc?: string;
  imageAlt?: string;
};

export function PromoBanner({
  title,
  body,
  cta,
  href,
  variant = 'neutral',
  imageSrc,
  imageAlt,
}: PromoBannerProps) {
  const isAccent = variant === 'accent';
  const hasImage = Boolean(imageSrc);

  return (
    <section className="relative min-h-[140px] w-full overflow-hidden">
      {hasImage ? (
        <>
          <Image
            src={imageSrc!}
            alt={imageAlt ?? ''}
            fill
            className="object-cover"
            sizes="100vw"
          />
          <div
            className={`absolute inset-0 ${isAccent ? 'bg-teal-900/82' : 'bg-brown-950/72'}`}
            aria-hidden="true"
          />
        </>
      ) : (
        <div
          className={`absolute inset-0 ${isAccent ? 'bg-teal-700' : 'bg-sand-100'}`}
          aria-hidden="true"
        />
      )}

      <div
        className={`relative mx-auto flex min-h-[140px] max-w-[1400px] flex-col items-start justify-between gap-4 px-[6vw] py-8 md:flex-row md:items-center ${
          hasImage ? 'text-sand-50' : isAccent ? 'text-sand-50' : 'text-brown-950'
        }`}
      >
        <div className="max-w-3xl">
          <h2 className="text-lg font-black md:text-xl">{title}</h2>
          <p
            className={`mt-2 text-sm leading-relaxed md:text-[15px] ${
              hasImage ? 'text-sand-100/85' : isAccent ? 'text-teal-200' : 'text-brown-600'
            }`}
          >
            {body}
          </p>
        </div>
        <Button
          href={href}
          variant={hasImage || isAccent ? 'secondary' : 'primary'}
          className={hasImage || isAccent ? 'shrink-0 border-sand-50 text-sand-50' : 'shrink-0'}
        >
          {cta}
        </Button>
      </div>
    </section>
  );
}
