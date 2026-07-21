import { Badge } from '@/components/ui/badge';
import { HeritageCard } from '@/components/ui/heritage-card';
import { formatStepNumber } from '@/lib/sites';
import type { Locale } from '@/i18n/routing';

type Step = { title: string; body: string };

type HowItWorksProps = {
  locale: Locale;
  eyebrow: string;
  title: string;
  steps: Step[];
};

export function HowItWorks({ locale, eyebrow, title, steps }: HowItWorksProps) {
  return (
    <section id="how" className="mx-auto w-full max-w-[1400px] px-[6vw] py-[70px] max-md:py-10">
      <div className="mb-9">
        <Badge>{eyebrow}</Badge>
        <h2 className="mt-3 text-[clamp(22px,2.5vw,28px)] font-black text-brown-950">{title}</h2>
      </div>
      <div className="grid gap-6 md:grid-cols-3">
        {steps.map((step, index) => (
          <HeritageCard key={step.title} className="px-6 py-7">
            <div className="mb-4 h-1 w-12 rounded-full bg-teal-700" aria-hidden="true" />
            <span className="mb-3 block text-xs font-bold tracking-widest text-teal-700">
              {formatStepNumber(locale, index)}
            </span>
            <h3 className="mb-2 text-base font-bold text-brown-950">{step.title}</h3>
            <p className="text-[17px] leading-relaxed text-brown-800">{step.body}</p>
          </HeritageCard>
        ))}
      </div>
    </section>
  );
}
