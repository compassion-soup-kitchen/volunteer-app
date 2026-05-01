import { RiArrowRightUpLine } from "@remixicon/react";
import { APP_VERSION } from "@/lib/version";

const ORG_LINK = "https://www.compassion.org.nz";

const values = [
  { maori: "Aroha", english: "love" },
  { maori: "Manaakitanga", english: "care for others" },
  { maori: "Whanaungatanga", english: "kinship" },
];

export function VolunteerFooter() {
  return (
    <footer className="mt-16 border-t border-border">
      <div className="mx-auto max-w-3xl px-4 py-10 text-center sm:px-6 sm:py-12">
        {/* Decorative rule */}
        <div
          className="mx-auto mb-6 flex h-px w-16 items-center justify-center bg-primary/40"
          aria-hidden
        />

        {/* Values — the visual hero */}
        <p className="text-base font-semibold tracking-tight sm:text-lg">
          {values.map((v, i) => (
            <span key={v.maori}>
              <span>{v.maori}</span>
              {i < values.length - 1 && (
                <span className="mx-3 text-primary/60" aria-hidden>
                  ·
                </span>
              )}
            </span>
          ))}
        </p>
        <p className="mt-1.5 text-xs italic text-muted-foreground sm:text-sm">
          {values.map((v, i) => (
            <span key={v.maori}>
              {v.english}
              {i < values.length - 1 && <span className="mx-2">·</span>}
            </span>
          ))}
        </p>

        {/* Thanks + site link */}
        <div className="mt-8 flex flex-col items-center gap-2 text-sm text-muted-foreground sm:flex-row sm:justify-center sm:gap-6">
          <span>Ngā mihi for the mahi you do.</span>
          <span className="hidden h-1 w-1 rounded-full bg-border sm:inline-block" aria-hidden />
          <a
            href={ORG_LINK}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 font-medium text-foreground hover:text-primary"
          >
            compassion.org.nz
            <RiArrowRightUpLine className="size-3.5" />
          </a>
        </div>

        <p className="mt-6 font-mono text-[10px] tracking-tight text-muted-foreground/60">
          v{APP_VERSION}
        </p>
      </div>
    </footer>
  );
}
