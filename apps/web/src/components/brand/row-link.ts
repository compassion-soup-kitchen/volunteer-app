import { cva } from "class-variance-authority";

/**
 * The hover wash and inset focus ring of a link or button that is a whole
 * row of a list or card. `row` lays out the common icon, text, chevron line;
 * `block` leaves the layout to what's inside (a CardContent, say). Pass
 * padding or alignment overrides through `cn`.
 */
export const rowLinkVariants = cva(
  "transition-colors hover:bg-secondary/40 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-ring",
  {
    variants: {
      layout: {
        row: "group flex w-full items-center gap-3 px-5 py-3 text-left disabled:opacity-60",
        block: "block",
      },
    },
    defaultVariants: {
      layout: "row",
    },
  }
);
