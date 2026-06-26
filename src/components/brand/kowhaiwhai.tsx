import { cn } from "@/lib/utils";

interface KowhaiwhaiProps extends React.ComponentProps<"img"> {
  /** "ink" renders the artwork in its own colour (dark); "light" reverses it to white for dark panels. */
  tone?: "ink" | "light";
}

/**
 * Kowhaiwhai — the org's Waretini kōwhaiwhai, used as a decorative watermark on
 * heroes, feature panels and empty states. Always aria-hidden (purely decorative).
 * Control size, position and faintness with className (e.g. "w-[480px] opacity-[0.06]").
 */
export function Kowhaiwhai({ tone = "ink", className, style, ...props }: KowhaiwhaiProps) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src="/brand/waretini.svg"
      alt=""
      aria-hidden="true"
      className={cn("pointer-events-none select-none", className)}
      style={{
        filter: tone === "light" ? "brightness(0) invert(1)" : undefined,
        ...style,
      }}
      {...props}
    />
  );
}
