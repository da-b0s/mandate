// The MANDATE mark: a card outline with an M, the "prepaid card with rules" idea in one shape.
export function Logo({ size = 22 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" aria-hidden="true">
      <defs>
        <linearGradient id="mandate-logo" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#ffffff" />
          <stop offset="1" stopColor="#8b8cff" />
        </linearGradient>
      </defs>
      <rect x="6" y="12" width="52" height="40" rx="9" fill="none" stroke="url(#mandate-logo)" strokeWidth="5" />
      <path d="M17 42V24l8 10 7-10 7 10 8-10v18" fill="none" stroke="url(#mandate-logo)" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
