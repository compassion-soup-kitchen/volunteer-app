/** The id a layout gives its `<main>` so the skip link has somewhere to land. */
export const MAIN_CONTENT_ID = "main-content";

/**
 * SkipLink - the first stop in the tab order, so keyboard users can jump past
 * the navigation. Invisible until focused. Pair it with a `<main>` carrying
 * `id={MAIN_CONTENT_ID}` and `tabIndex={-1}`.
 */
export function SkipLink() {
  return (
    <a
      href={`#${MAIN_CONTENT_ID}`}
      className="sr-only rounded-md bg-background px-4 py-2 text-sm font-semibold text-foreground shadow-lg outline-none focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-100 focus-visible:ring-2 focus-visible:ring-ring"
    >
      Skip to content
    </a>
  );
}
