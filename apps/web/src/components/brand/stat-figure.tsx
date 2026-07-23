import { cn } from "@/lib/utils";

const sizeClasses = {
  /** Inline stat — 22px serif. */
  md: "text-xl",
  /** Card stat — ~33px serif. */
  lg: "text-3xl",
  /** Hero numeral — ~48px serif. */
  xl: "text-5xl",
} as const;

interface StatFigureProps {
  value: React.ReactNode;
  /** Small muted serif unit suffix, e.g. "hrs", "h", "%". */
  unit?: React.ReactNode;
  size?: keyof typeof sizeClasses;
  className?: string;
  unitClassName?: string;
}

/**
 * StatFigure — the signature "big serif numeral with a small muted serif unit
 * suffix" ("52 hrs", "12h"). Numerals are tabular Newsreader; inherits colour,
 * so it works on white cards and ink panels alike.
 */
export function StatFigure({
  value,
  unit,
  size = "lg",
  className,
  unitClassName,
}: StatFigureProps) {
  return (
    <p className={cn("font-serif font-medium tracking-tight tnum leading-none", sizeClasses[size], className)}>
      {value}
      {unit != null && (
        <span
          className={cn(
            "ml-1 align-baseline font-normal opacity-65",
            size === "xl" ? "text-2xl" : size === "lg" ? "text-lg" : "text-sm",
            unitClassName
          )}
        >
          {unit}
        </span>
      )}
    </p>
  );
}
