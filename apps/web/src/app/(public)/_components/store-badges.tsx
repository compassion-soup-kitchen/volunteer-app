import { cn } from "@/lib/utils";

/**
 * Official-style "Download on the App Store" / "Get it on Google Play" badges,
 * drawn inline so they stay crisp at any size and follow the brand ink/paper
 * surfaces without shipping external raster assets.
 *
 * The store links are placeholders until the app is published — wire the real
 * listing URLs in when they exist.
 */

const APP_STORE_URL = "#";
const PLAY_STORE_URL = "#";

const badgeBase =
  "inline-flex h-[52px] items-center gap-3 rounded-2xl bg-ink px-4 text-paper transition-transform hover:-translate-y-0.5 focus-visible:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50 focus-visible:ring-offset-2 focus-visible:ring-offset-background";

export function AppStoreBadge({ className }: { className?: string }) {
  return (
    <a
      href={APP_STORE_URL}
      aria-label="Download on the App Store"
      className={cn(badgeBase, className)}
    >
      <svg viewBox="0 0 24 24" className="size-7 shrink-0" fill="currentColor" aria-hidden>
        <path d="M17.05 12.04c-.03-2.6 2.12-3.85 2.22-3.91-1.21-1.77-3.1-2.01-3.77-2.04-1.6-.16-3.13.94-3.94.94-.82 0-2.06-.92-3.39-.9-1.74.03-3.35 1.01-4.25 2.57-1.82 3.15-.46 7.8 1.3 10.36.86 1.25 1.88 2.66 3.21 2.61 1.29-.05 1.78-.83 3.34-.83 1.55 0 2 .83 3.36.81 1.39-.03 2.27-1.28 3.12-2.54.98-1.46 1.39-2.87 1.41-2.94-.03-.01-2.7-1.04-2.73-4.12M14.46 4.4c.71-.86 1.19-2.06 1.06-3.25-1.02.04-2.26.68-2.99 1.54-.66.76-1.23 1.98-1.08 3.15 1.14.09 2.3-.58 3.01-1.44" />
      </svg>
      <span className="flex flex-col items-start leading-none">
        <span className="text-[10px] font-medium tracking-wide text-paper/75">Download on the</span>
        <span className="font-serif text-lg font-medium leading-tight">App Store</span>
      </span>
    </a>
  );
}

export function GooglePlayBadge({ className }: { className?: string }) {
  return (
    <a
      href={PLAY_STORE_URL}
      aria-label="Get it on Google Play"
      className={cn(badgeBase, className)}
    >
      <svg viewBox="0 0 24 24" className="size-6 shrink-0" aria-hidden>
        <path d="M3.6 2.3c-.24.25-.38.64-.38 1.15v17.1c0 .51.14.9.38 1.15l.06.05L13.2 12.3v-.22L3.66 2.25z" fill="#00D6FF" />
        <path d="M16.4 15.5l-3.2-3.2v-.22l3.2-3.2.07.04 3.79 2.15c1.08.61 1.08 1.62 0 2.24l-3.79 2.15z" fill="#FFC900" />
        <path d="M16.47 15.46 13.2 12.19 3.6 21.7c.36.38.94.42 1.6.05l11.27-6.3" fill="#FF3A44" />
        <path d="M16.47 8.92 5.2 2.63C4.54 2.25 3.96 2.3 3.6 2.68l9.6 9.51z" fill="#00F076" />
      </svg>
      <span className="flex flex-col items-start leading-none">
        <span className="text-[10px] font-medium tracking-wide text-paper/75">Get it on</span>
        <span className="font-serif text-lg font-medium leading-tight">Google Play</span>
      </span>
    </a>
  );
}

export function StoreBadges({ className }: { className?: string }) {
  return (
    <div className={cn("flex flex-wrap items-center gap-3", className)}>
      <AppStoreBadge />
      <GooglePlayBadge />
    </div>
  );
}
