import { cn } from "@/lib/utils";

interface KowhaiwhaiProps extends React.ComponentProps<"img"> {
  /** "ink" renders the artwork in its own colour (dark); "light" reverses it to white for dark panels. */
  tone?: "ink" | "light";
}

/**
 * Kowhaiwhai — the org's Waretini kōwhaiwhai, used as a decorative watermark on
 * heroes, feature panels and empty states. Always aria-hidden (purely decorative).
 * Control size, position and faintness with className (e.g. "w-[480px] opacity-[0.06]").
 *
 * Lazy by default. React preloads every eagerly loaded server-rendered <img>,
 * and the watermark often sits in a panel hidden below `lg` (the landing hero,
 * the sign-in aside) - so phones fetched an image they never show, and the
 * browser warned about the unused preload. A lazy image gets no preload and
 * isn't fetched while hidden; at a few percent opacity, a late paint is
 * invisible.
 */
export function Kowhaiwhai({ tone = "ink", className, style, ...props }: KowhaiwhaiProps) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src="/brand/waretini.svg"
      alt=""
      aria-hidden="true"
      loading="lazy"
      decoding="async"
      className={cn("pointer-events-none select-none", className)}
      style={{
        filter: tone === "light" ? "brightness(0) invert(1)" : undefined,
        ...style,
      }}
      {...props}
    />
  );
}
