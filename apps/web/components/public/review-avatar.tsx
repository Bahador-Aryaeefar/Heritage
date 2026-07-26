function initials(name: string): string {
  const trimmed = name.trim();
  if (!trimmed) return '?';
  const parts = trimmed.split(/\s+/);
  if (parts.length >= 2) {
    return `${parts[0]?.[0] ?? ''}${parts[1]?.[0] ?? ''}`.toUpperCase();
  }
  return trimmed.slice(0, 1).toUpperCase();
}

type ReviewAvatarProps = {
  name: string;
  className?: string;
};

export function ReviewAvatar({ name, className = '' }: ReviewAvatarProps) {
  return (
    <span
      aria-hidden
      className={`inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-teal-700 text-[15px] font-bold text-sand-50 ${className}`}
    >
      {initials(name)}
    </span>
  );
}
