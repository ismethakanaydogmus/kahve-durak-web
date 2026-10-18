export function Wordmark({ className = '' }: { className?: string }) {
  return (
    <span className={`inline-flex items-center gap-2 leading-none text-bean ${className}`}>
      <svg aria-hidden viewBox="0 0 32 32" className="h-[1.6em] w-[1.6em]" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
        <path d="M6 13h16v6a7 7 0 0 1-7 7h-2a7 7 0 0 1-7-7z" />
        <path d="M22 15h2a3 3 0 0 1 0 6h-2.5" />
        <path d="M11 4c-1.5 2 1.5 3 0 5M16 4c-1.5 2 1.5 3 0 5" />
      </svg>
      <span className="font-display text-[1.35em] font-semibold tracking-tight">
        Kahve <span className="italic text-amber">Durak</span>
      </span>
    </span>
  )
}
