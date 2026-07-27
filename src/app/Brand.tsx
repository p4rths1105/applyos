// ApplyOS wordmark + logo. The mark is a document with a small "send" spark,
// evoking "your profile → application, sent." Inline SVG, no assets to load.
export function Brand({ size = 26 }: { size?: number }) {
  return (
    <span className="flex items-center gap-2 select-none">
      <svg
        width={size}
        height={size}
        viewBox="0 0 32 32"
        fill="none"
        aria-hidden
      >
        <rect width="32" height="32" rx="8" fill="#111" />
        <path
          d="M9 8.5h9.5L23 13v10.5a1 1 0 0 1-1 1H10a1 1 0 0 1-1-1V8.5Z"
          fill="#fff"
        />
        <path d="M18 8.5V13h5" stroke="#111" strokeWidth="1.4" />
        <path
          d="m14.4 18.3 5.1-2.2-2 5-.9-1.9-1.3.9-.9-1.8Z"
          fill="#111"
        />
      </svg>
      <span className="text-lg font-bold tracking-tight">ApplyOS</span>
    </span>
  );
}
