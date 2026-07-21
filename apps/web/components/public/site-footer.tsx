type SiteFooterProps = {
  tagline: string;
};

export function SiteFooter({ tagline }: SiteFooterProps) {
  return (
    <footer
      id="contact"
      className="bg-brown-950 px-[6vw] py-10 pb-[calc(2.5rem+env(safe-area-inset-bottom))] text-center text-[13px] text-sand-100/75"
    >
      {tagline}
    </footer>
  );
}
