type SiteFooterProps = {
  tagline: string;
};

export function SiteFooter({ tagline }: SiteFooterProps) {
  return (
    <footer
      id="contact"
      className="bg-brown-950 px-[6vw] py-10 text-center text-[13px] text-sand-100/75"
    >
      {tagline}
    </footer>
  );
}
