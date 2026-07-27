// ApplyOS wordmark + logo. The mark is a document with a small "send" spark,
// evoking "your profile → application, sent." Indigo→amber gradient so it's
// visible in both light and dark themes. Inline SVG, no assets to load.
export function Brand({ size = 28 }: { size?: number }) {
  return (
    <span className="flex items-center gap-2 select-none">
      <svg width={size} height={size} viewBox="0 0 32 32" fill="none" aria-hidden>
        <defs>
          <linearGradient id="aos-g" x1="0" y1="0" x2="32" y2="32">
            <stop stopColor="#6366f1" />
            <stop offset="1" stopColor="#f59e0b" />
          </linearGradient>
        </defs>
        <rect width="32" height="32" rx="8" fill="url(#aos-g)" />
        <path
          d="M9 8.5h9.5L23 13v10.5a1 1 0 0 1-1 1H10a1 1 0 0 1-1-1V8.5Z"
          fill="#fff"
        />
        <path d="M18 8.5V13h5" stroke="#6366f1" strokeWidth="1.4" />
        <path d="m13.8 18.6 5.4-2.3-2.1 5.3-1-2-1.3 1-1-2Z" fill="#6366f1" />
      </svg>
      <span className="text-lg font-bold tracking-tight text-neutral-900 dark:text-white">
        ApplyOS
      </span>
    </span>
  );
}
