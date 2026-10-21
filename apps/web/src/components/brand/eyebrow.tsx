import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

/**
 * The brand's tiny uppercase, letter-spaced overline marker (the `eyebrow`
 * utility in globals.css), in the sizes and colours it comes in.
 *
 * - `md` heads a section; `sm` labels a value - a stat tile, a field in a
 *   record, a row of facts.
 * - `brand` is Pūaroha red, the app's most identity-defining repeated
 *   element; `muted` is the quiet label; `sidebar` sits on the staff sidebar;
 *   `ink` on the cocoa feature panels; `onPrimary` on a red panel; `inherit`
 *   takes the colour of a tinted callout it sits in.
 *
 * Use `eyebrowVariants` when the label isn't a paragraph (a `dt`, a `span`,
 * an `h3`).
 */
const eyebrowVariants = cva("eyebrow", {
  variants: {
    size: {
      md: "",
      sm: "text-2xs",
    },
    tone: {
      brand: "text-primary",
      muted: "text-muted-foreground",
      sidebar: "text-sidebar-foreground/50",
      ink: "text-ink-muted-foreground",
      onPrimary: "text-primary-foreground/70",
      inherit: "",
    },
  },
  defaultVariants: {
    size: "md",
    tone: "brand",
  },
});

/** Pair bilingually, e.g. <Eyebrow>Pānui · News</Eyebrow>. */
function Eyebrow({
  className,
  size,
  tone,
  ...props
}: React.ComponentProps<"p"> & VariantProps<typeof eyebrowVariants>) {
  return <p className={cn(eyebrowVariants({ size, tone }), className)} {...props} />;
}

export { Eyebrow, eyebrowVariants };
