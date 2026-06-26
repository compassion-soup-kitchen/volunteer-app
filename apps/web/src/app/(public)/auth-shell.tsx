import Link from "next/link";
import { Kowhaiwhai } from "@/components/brand/kowhaiwhai";
import { Wordmark } from "@/components/brand/wordmark";
import { Eyebrow } from "@/components/brand/eyebrow";

interface AuthShellProps {
  eyebrow: string;
  title: string;
  subtitle: string;
  children: React.ReactNode;
  footer: React.ReactNode;
}

/**
 * AuthShell — split layout shared by sign in / register. An editorial ink panel
 * (wordmark + whakataukī + kōwhaiwhai) on the left for desktop, the form on the right.
 */
export function AuthShell({ eyebrow, title, subtitle, children, footer }: AuthShellProps) {
  return (
    <div className="grid min-h-dvh lg:grid-cols-[1.05fr_1fr]">
      <aside className="relative hidden flex-col justify-between overflow-hidden bg-ink p-12 text-paper lg:flex">
        <Kowhaiwhai
          tone="light"
          className="pointer-events-none absolute -right-32 -top-24 w-[620px] opacity-[0.06]"
        />
        <Link href="/" aria-label="Te Pūaroha home" className="relative w-fit">
          <Wordmark tone="white" className="h-8" />
        </Link>
        <blockquote className="relative max-w-md">
          <p className="font-serif text-[2.5rem] font-light leading-[1.1] tracking-tight">
            He aha te mea nui o te ao? He tangata, he tangata, he tangata.
          </p>
          <p className="mt-5 leading-relaxed text-paper/70">
            What is the most important thing in the world? It is people, it is
            people, it is people.
          </p>
        </blockquote>
        <p className="relative text-xs font-semibold uppercase tracking-[0.16em] text-paper/50">
          Te Pūaroha · Since 1901
        </p>
      </aside>

      <main className="flex flex-col justify-center px-6 py-12 sm:px-10">
        <div className="mx-auto w-full max-w-sm">
          <Link href="/" aria-label="Te Pūaroha home" className="mb-10 inline-flex lg:hidden">
            <Wordmark className="h-7" />
          </Link>
          <Eyebrow className="text-primary">{eyebrow}</Eyebrow>
          <h1 className="mt-3 font-serif text-3xl font-light tracking-tight">{title}</h1>
          <p className="mt-2 leading-relaxed text-muted-foreground">{subtitle}</p>
          <div className="mt-8">{children}</div>
          <p className="mt-8 text-sm text-muted-foreground">{footer}</p>
        </div>
      </main>
    </div>
  );
}
