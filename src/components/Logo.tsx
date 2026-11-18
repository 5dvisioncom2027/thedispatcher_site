// (c) The-Dispatcher
export function Logo({ className = "" }: { className?: string }) {
  return (
    <div className={`flex items-center gap-2.5 ${className}`}>
      <span
        aria-hidden
        className="inline-block h-4 w-4 rounded-full animate-logo-pulse"
        style={{ background: "#FFC700", boxShadow: "0 0 12px rgba(255,199,0,0.6)" }}
      />
      <span className="font-display text-[15px] font-semibold tracking-tight text-foreground">
        The-Dispatcher
      </span>
    </div>
  );
}
