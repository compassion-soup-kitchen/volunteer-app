import Link from "next/link";
import { RiMailLine, RiMapPinLine, RiPhoneLine } from "@remixicon/react";
import { Separator } from "@/components/ui/separator";
import { ThemeToggle } from "@/components/theme-toggle";
import { SectionHeading } from "@/components/brand/section-heading";
import { Wordmark } from "@/components/brand/wordmark";

/**
 * InfoShell - lightweight chrome for standalone public info pages
 * (e.g. /support, /copyright). Compact wordmark header, an editorial
 * page heading, and the site's contact + copyright footer.
 */
export function InfoShell({
  eyebrow,
  title,
  lede,
  children,
}: {
  eyebrow: React.ReactNode;
  title: React.ReactNode;
  lede?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen flex-col bg-background text-foreground">
      <header className="sticky top-0 z-50 border-b border-border/60 bg-background/85 backdrop-blur-md">
        <div className="mx-auto flex h-16 w-full max-w-3xl items-center justify-between px-6">
          <Link href="/" aria-label="Te Pūaroha home" className="shrink-0">
            <Wordmark className="h-6 sm:h-7" />
          </Link>
          <ThemeToggle />
        </div>
      </header>

      <main className="mx-auto w-full max-w-3xl flex-1 px-6 py-14 sm:py-18">
        <SectionHeading as="h1" size="lg" eyebrow={eyebrow}>
          {title}
        </SectionHeading>
        {lede ? (
          <p className="mt-6 max-w-xl text-lg leading-relaxed text-muted-foreground">{lede}</p>
        ) : null}
        <div className="mt-12 space-y-12 sm:mt-14">{children}</div>
      </main>

      <footer className="border-t border-border bg-card">
        <div className="mx-auto w-full max-w-3xl px-6 py-10">
          <ul className="flex flex-col gap-x-8 gap-y-2.5 sm:flex-row sm:flex-wrap">
            <li className="flex items-center gap-2">
              <RiMapPinLine className="size-4 shrink-0 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">Tory Street, Te Aro, Wellington</span>
            </li>
            <li className="flex items-center gap-2">
              <RiMailLine className="size-4 shrink-0 text-muted-foreground" />
              <a
                href="mailto:info@soupkitchen.org.nz"
                className="text-sm text-muted-foreground transition-colors hover:text-primary"
              >
                info@soupkitchen.org.nz
              </a>
            </li>
            <li className="flex items-center gap-2">
              <RiPhoneLine className="size-4 shrink-0 text-muted-foreground" />
              <a
                href="tel:+6443892288"
                className="text-sm text-muted-foreground transition-colors hover:text-primary"
              >
                (04) 389 2288
              </a>
            </li>
          </ul>
          <Separator className="my-6" />
          <ul className="mb-3 flex flex-wrap gap-x-5 gap-y-1.5">
            {[
              { label: "Help & support", href: "/support" },
              { label: "Privacy statement", href: "/privacy" },
              { label: "Copyright", href: "/copyright" },
            ].map((l) => (
              <li key={l.href}>
                <Link
                  href={l.href}
                  className="text-xs text-muted-foreground transition-colors hover:text-primary"
                >
                  {l.label}
                </Link>
              </li>
            ))}
          </ul>
          <p className="text-xs text-muted-foreground">
            &copy; {new Date().getFullYear()} Compassion Soup Kitchen · Te Pūaroha. All rights
            reserved. Registered Charity{" "}
            <a
              href="https://www.register.charities.govt.nz/Charity/CC10246"
              target="_blank"
              rel="noopener noreferrer"
              className="underline underline-offset-2 transition-colors hover:text-primary"
            >
              CC 10246
            </a>
          </p>
        </div>
      </footer>
    </div>
  );
}

/** A titled section within an InfoShell page - serif heading over prose. */
export function InfoSection({
  title,
  children,
}: {
  title: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section>
      <h2 className="font-serif text-2xl font-light tracking-tight text-foreground">{title}</h2>
      <div className="mt-4 space-y-4 text-base leading-relaxed text-muted-foreground">
        {children}
      </div>
    </section>
  );
}
