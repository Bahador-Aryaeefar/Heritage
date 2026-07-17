// Design system §4: Badge/Eyebrow - teal-200 background, teal-700 text,
// full pill radius, small bold text.
export function Badge({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-block rounded-full bg-teal-200 px-3 py-1 text-xs font-bold tracking-wide text-teal-700">
      {children}
    </span>
  );
}
