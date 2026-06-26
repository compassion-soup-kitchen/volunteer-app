import { cn } from "@/lib/utils";
import { Eyebrow } from "./eyebrow";

const sizeClasses = {
  sm: "text-2xl",
  md: "text-3xl md:text-4xl",
  lg: "text-4xl md:text-5xl",
} as const;

interface SectionHeadingProps extends Omit<React.ComponentProps<"div">, "title"> {
  /** Optional eyebrow label above the heading (bilingual, e.g. "Ngā wāhi mahi · Shifts"). */
  eyebrow?: React.ReactNode;
  /** Heading element to render — defaults to h2. */
  as?: "h1" | "h2" | "h3";
  /** Show the short red underline rule beneath the heading. */
  rule?: boolean;
  size?: keyof typeof sizeClasses;
}

/**
 * SectionHeading — Fraunces display heading with the signature red underline rule,
 * optionally preceded by an eyebrow label. The brand's recurring heading gesture.
 */
export function SectionHeading({
  eyebrow,
  as: Tag = "h2",
  rule = true,
  size = "md",
  className,
  children,
  ...props
}: SectionHeadingProps) {
  return (
    <div className={cn("space-y-3", className)} {...props}>
      {eyebrow ? <Eyebrow>{eyebrow}</Eyebrow> : null}
      <Tag
        className={cn(
          "font-serif font-light tracking-tight text-balance text-foreground",
          sizeClasses[size]
        )}
      >
        {children}
      </Tag>
      {rule ? <span aria-hidden className="block h-0.5 w-16 rounded-full bg-primary" /> : null}
    </div>
  );
}
