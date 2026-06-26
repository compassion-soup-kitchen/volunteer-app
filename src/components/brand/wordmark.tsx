import { cn } from "@/lib/utils";

interface WordmarkProps extends Omit<React.ComponentProps<"img">, "src" | "alt"> {
  /**
   * "color" is the full red-koru + grey lockup; it auto-reverses to white in dark
   * mode (it always sits on theme-following surfaces). "white" forces the reversed
   * lockup for always-dark panels (e.g. the ink hero / auth panel).
   */
  tone?: "color" | "white";
}

/**
 * Wordmark — the official "compassion te pūaroha" lockup.
 * Set height via className (default h-7).
 */
export function Wordmark({ tone = "color", className, style, ...props }: WordmarkProps) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src="/brand/wordmark.svg"
      alt="Te Pūaroha · Compassion"
      className={cn(
        "h-7 w-auto select-none",
        tone === "color" && "dark:brightness-0 dark:invert",
        className
      )}
      style={{ filter: tone === "white" ? "brightness(0) invert(1)" : undefined, ...style }}
      {...props}
    />
  );
}
