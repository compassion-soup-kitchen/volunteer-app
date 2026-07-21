"use client";

/**
 * Global error boundary — the last-resort fallback when the root layout itself
 * crashes. Per Next.js docs it must render its own <html>/<body>, and it cannot
 * rely on globals.css, next/font, or the theme provider (none of them load
 * here). The embedded <style> below therefore mirrors the brand tokens from
 * globals.css directly — the one place hardcoded colour values are unavoidable.
 * Keep any token change in globals.css reflected here.
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="en">
      <body>
        <style>{`
          :root { color-scheme: light dark; }
          body {
            margin: 0;
            font-family: ui-sans-serif, system-ui, -apple-system, "Segoe UI", sans-serif;
            background: #f1f3f1; /* --paper */
            color: #272b27; /* --ink */
          }
          .ge-main {
            min-height: 100dvh;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            padding: 4rem 1.5rem;
            text-align: center;
          }
          .ge-eyebrow {
            margin: 0;
            font-size: 0.72rem;
            font-weight: 600;
            letter-spacing: 0.16em;
            text-transform: uppercase;
            color: #de0832; /* --primary */
          }
          .ge-title {
            margin: 1rem 0 0;
            max-width: 26rem;
            font-family: Georgia, "Times New Roman", serif;
            font-size: 2.25rem;
            font-weight: 300;
            line-height: 1.1;
            letter-spacing: -0.01em;
          }
          .ge-rule {
            display: block;
            width: 4rem;
            height: 2px;
            margin: 1.25rem auto 0;
            border-radius: 999px;
            background: #de0832;
          }
          .ge-body {
            margin: 1.5rem 0 0;
            max-width: 26rem;
            font-size: 1rem;
            line-height: 1.65;
            color: #5b605b; /* --muted-foreground */
          }
          .ge-button {
            margin-top: 2.25rem;
            display: inline-flex;
            align-items: center;
            height: 2.75rem;
            padding: 0 1.5rem;
            border: 0;
            border-radius: 999px;
            background: #de0832;
            color: #ffffff;
            font: inherit;
            font-size: 1rem;
            font-weight: 500;
            cursor: pointer;
          }
          .ge-button:hover { opacity: 0.9; }
          .ge-ref {
            margin-top: 2.5rem;
            font-family: ui-monospace, monospace;
            font-size: 0.75rem;
            color: #5b605b;
            opacity: 0.7;
          }
          @media (prefers-color-scheme: dark) {
            body { background: #1a1c1a; color: #f1f3f1; }
            .ge-body, .ge-ref { color: #a7aba5; }
          }
        `}</style>
        <main className="ge-main">
          <p className="ge-eyebrow">Aue · Something went wrong</p>
          <h1 className="ge-title">That didn&apos;t go to plan</h1>
          <span aria-hidden className="ge-rule" />
          <p className="ge-body">
            Something hiccuped on our side — it wasn&apos;t you. Give it another
            go, and if it keeps happening, let the coordinator team know.
          </p>
          <button type="button" className="ge-button" onClick={reset}>
            Try again
          </button>
          {error.digest ? <p className="ge-ref">Reference: {error.digest}</p> : null}
        </main>
      </body>
    </html>
  );
}
