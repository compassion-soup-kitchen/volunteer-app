import type { Metadata } from "next";
import { cn } from "@/lib/utils";
import { Wordmark } from "@/components/brand/wordmark";
import { Eyebrow } from "@/components/brand/eyebrow";
import { SectionHeading } from "@/components/brand/section-heading";
import { Kowhaiwhai } from "@/components/brand/kowhaiwhai";
import { Illustration, ILLUSTRATIONS, type IllustrationName } from "@/components/brand/illustration";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ThemeToggle } from "@/components/theme-toggle";
import {
  RiArrowRightLine,
  RiCalendarLine,
  RiTimeLine,
  RiGraduationCapLine,
  RiHeartLine,
} from "@remixicon/react";

export const metadata: Metadata = {
  title: "Styleguide | Te Pūaroha",
  description: "The living visual language for the Te Pūaroha volunteer app.",
};

const PRINCIPLES = [
  { title: "Dignified, not clinical", body: "Warm editorial calm. People are whānau, never “users”." },
  { title: "Bicultural by default", body: "Te Reo Māori sits first and naturally; kōwhaiwhai is the org's own." },
  { title: "Red is a guest", body: "Brand red marks one action per view. Navy carries structure." },
  { title: "One system, two voices", body: "Volunteer = spacious mobile. Staff = denser desktop." },
];

function Swatch({ className, name, role, token, dark }: { className: string; name: string; role?: string; token: string; dark?: boolean }) {
  return (
    <div>
      <div className={cn("flex h-20 items-end rounded-xl border border-border/60 p-2", className)}>
        {dark ? <span className="text-[10px] text-white/70">Aa</span> : <span className="text-[10px] text-ink/50">Aa</span>}
      </div>
      <p className="mt-2 text-sm font-medium">{name}</p>
      {role ? <p className="text-xs text-muted-foreground">{role}</p> : null}
      <p className="text-xs tabular-nums text-muted-foreground">{token}</p>
    </div>
  );
}

function Row({ children, label }: { children: React.ReactNode; label: string }) {
  return (
    <div className="flex flex-wrap items-center gap-3">
      <span className="w-28 shrink-0 text-xs font-medium uppercase tracking-[0.12em] text-muted-foreground">{label}</span>
      {children}
    </div>
  );
}

export default function StyleguidePage() {
  return (
    <div className="min-h-dvh bg-background text-foreground">
      <header className="sticky top-0 z-50 border-b border-border/60 bg-background/85 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-5xl items-center justify-between px-6">
          <Wordmark className="h-6" />
          <div className="flex items-center gap-3">
            <Eyebrow className="hidden sm:block">Styleguide</Eyebrow>
            <ThemeToggle />
          </div>
        </div>
      </header>

      {/* Cover */}
      <div className="bg-ink text-paper">
        <div className="relative mx-auto max-w-5xl overflow-hidden px-6 py-20">
          <Kowhaiwhai tone="light" className="absolute -right-24 -top-20 w-[520px] opacity-[0.06]" />
          <div className="relative">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-paper/60">
              Visual language · He aratohu hoahoa
            </p>
            <h1 className="mt-5 max-w-2xl font-serif text-5xl font-light leading-[1.05] tracking-tight">
              The volunteer whānau, in one design language.
            </h1>
            <p className="mt-5 max-w-xl text-paper/75">
              Aligned to Compassion Aotearoa: editorial and warm, grounded in
              faith, culture and care. Every token, type and component on this
              page is live from the app.
            </p>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-5xl px-6">
        {/* Principles */}
        <section className="py-16">
          <Eyebrow>Ngā mātāpono · Principles</Eyebrow>
          <hr className="mt-4 h-0.5 w-16 rounded-full border-0 bg-primary" />
          <div className="mt-8 grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
            {PRINCIPLES.map((p) => (
              <div key={p.title}>
                <h3 className="font-serif text-xl font-normal">{p.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{p.body}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Logo */}
        <section className="border-t border-border py-16">
          <Eyebrow>Te tohu · Logo lockup</Eyebrow>
          <div className="mt-6 grid gap-5 sm:grid-cols-2">
            <Card><CardContent className="flex items-center justify-center py-12"><Wordmark className="h-8" /></CardContent></Card>
            <div className="flex items-center justify-center rounded-xl bg-ink py-12"><Wordmark tone="white" className="h-8" /></div>
          </div>
          <p className="mt-4 text-sm text-muted-foreground">
            Full colour on light; reversed to white on ink. The colour lockup auto-reverses in dark mode.
          </p>
        </section>

        {/* Colour */}
        <section className="border-t border-border py-16">
          <SectionHeading eyebrow="Ngā tae · Colour" size="sm">A palette pulled from the brand</SectionHeading>
          <Eyebrow className="mt-10">Brand</Eyebrow>
          <div className="mt-4 grid grid-cols-2 gap-5 sm:grid-cols-4">
            <Swatch className="bg-primary" dark name="Pūaroha red" role="Primary action" token="--primary" />
            <Swatch className="bg-navy" dark name="Aubert navy" role="Structure" token="--navy" />
            <Swatch className="bg-ink" dark name="Ink" role="Text" token="--ink" />
            <Swatch className="bg-paper" name="Paper" role="Page ground" token="--paper" />
          </div>
          <Eyebrow className="mt-10">Neutrals</Eyebrow>
          <div className="mt-4 grid grid-cols-2 gap-5 sm:grid-cols-4">
            <Swatch className="bg-card" name="Card" token="--card" />
            <Swatch className="bg-muted" name="Muted" token="--muted" />
            <Swatch className="bg-border" name="Border" token="--border" />
            <Swatch className="bg-secondary" name="Secondary" token="--secondary" />
          </div>
          <Eyebrow className="mt-10">Semantic</Eyebrow>
          <div className="mt-4 grid grid-cols-2 gap-5 sm:grid-cols-4">
            <Swatch className="bg-success" dark name="Success" role="Cleared · active" token="--success" />
            <Swatch className="bg-warning" dark name="Warning" role="Awaiting" token="--warning" />
            <Swatch className="bg-navy" dark name="Info" role="Submitted" token="--navy" />
            <Swatch className="bg-destructive" dark name="Destructive" role="Deeper red" token="--destructive" />
          </div>
        </section>

        {/* Typography */}
        <section className="border-t border-border py-16">
          <SectionHeading eyebrow="Ngā momotuhi · Typography" size="sm">Fraunces for voice, Mona Sans for work</SectionHeading>
          <div className="mt-8 grid gap-10 lg:grid-cols-2">
            <div>
              <span className="text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">Display · Fraunces</span>
              <p className="mt-4 font-serif text-6xl font-light leading-none tracking-tight">Haere mai,<br />nau mai.</p>
              <hr className="mt-5 h-0.5 w-16 rounded-full border-0 bg-primary" />
              <p className="mt-5 max-w-md text-muted-foreground">
                Body copy is Mona Sans at a comfortable size with 1.6 line-height.
                Numbers use tabular figures so rosters and hours never jitter: <span className="tabular-nums font-medium text-foreground">1,240 · 87 · 24</span>.
              </p>
            </div>
            <div className="space-y-4">
              <div className="flex items-baseline justify-between border-b border-border pb-3"><span className="font-serif text-4xl font-light">Display</span><span className="text-xs text-muted-foreground">Fraunces · 300</span></div>
              <div className="flex items-baseline justify-between border-b border-border pb-3"><span className="font-serif text-3xl font-normal">Heading 1</span><span className="text-xs text-muted-foreground">Fraunces · 400</span></div>
              <div className="flex items-baseline justify-between border-b border-border pb-3"><span className="text-xl font-semibold">Heading · Mona</span><span className="text-xs text-muted-foreground">Mona · 600</span></div>
              <div className="flex items-baseline justify-between border-b border-border pb-3"><span className="text-base">Body — the workhorse</span><span className="text-xs text-muted-foreground">Mona · 400</span></div>
              <div className="flex items-baseline justify-between"><Eyebrow>Eyebrow label</Eyebrow><span className="text-xs text-muted-foreground">Mona · 600 · .16em</span></div>
            </div>
          </div>
        </section>

        {/* Motifs */}
        <section className="border-t border-border py-16">
          <SectionHeading eyebrow="Ngā tohu · Signature motifs" size="sm">The details that make it Compassion</SectionHeading>
          <div className="mt-8 grid gap-5 sm:grid-cols-3">
            <Card><CardContent className="py-6">
              <Eyebrow>Underline accent</Eyebrow>
              <p className="mt-3 font-serif text-2xl font-light">Our mahi</p>
              <hr className="mt-4 h-0.5 w-16 rounded-full border-0 bg-primary" />
            </CardContent></Card>
            <Card><CardContent className="space-y-2.5 py-6">
              <Eyebrow>Eyebrow labels</Eyebrow>
              <Eyebrow>Pānui · News</Eyebrow>
              <Eyebrow>Ō wāhi mahi · Shifts</Eyebrow>
            </CardContent></Card>
            <Card className="relative overflow-hidden"><CardContent className="py-6">
              <Kowhaiwhai className="absolute -bottom-8 -right-8 w-32 opacity-[0.14]" />
              <Eyebrow>Kōwhaiwhai · Waretini</Eyebrow>
              <p className="mt-3 max-w-[22ch] text-sm text-muted-foreground">Pale watermark on heroes and empty states, themeable via currentColor.</p>
            </CardContent></Card>
          </div>
          <div className="mt-5 grid gap-5 sm:grid-cols-3">
            {([
              { bg: "bg-navy", icon: <RiCalendarLine className="size-6" />, label: "My shifts" },
              { bg: "bg-primary", icon: <RiTimeLine className="size-6" />, label: "My hours" },
              { bg: "bg-muted-foreground", icon: <RiGraduationCapLine className="size-6" />, label: "Training" },
            ] as const).map((c) => (
              <div key={c.label} className={cn("flex min-h-[140px] flex-col justify-between rounded-2xl p-5 text-white", c.bg)}>
                {c.icon}
                <span className="font-serif text-xl font-light">{c.label}</span>
              </div>
            ))}
          </div>
        </section>

        {/* Illustrations */}
        <section className="border-t border-border py-16">
          <SectionHeading eyebrow="Ngā whakaahua · Illustration library" size="sm">Hand-painted spot art, ink and red</SectionHeading>
          <div className="mt-8 grid grid-cols-3 gap-4 sm:grid-cols-5 lg:grid-cols-7">
            {(Object.keys(ILLUSTRATIONS) as IllustrationName[]).map((name) => (
              <Card key={name}><CardContent className="flex flex-col items-center gap-2 py-4 text-center">
                <Illustration name={name} size={64} />
                <span className="text-xs text-muted-foreground">{name}</span>
              </CardContent></Card>
            ))}
          </div>
        </section>

        {/* Components */}
        <section className="border-t border-border py-16">
          <SectionHeading eyebrow="Ngā wāhanga · Components" size="sm">The kit, in the app&apos;s own language</SectionHeading>

          <div className="mt-8 space-y-5">
            <Card><CardContent className="space-y-4 py-6">
              <Eyebrow>Buttons</Eyebrow>
              <Row label="Variants">
                <Button>Sign up for shift</Button>
                <Button variant="navy">View roster</Button>
                <Button variant="outline">Edit profile</Button>
                <Button variant="secondary">Secondary</Button>
                <Button variant="ghost">Read more <RiArrowRightLine className="size-4" /></Button>
                <Button variant="destructive">Cancel shift</Button>
              </Row>
              <Row label="Sizes">
                <Button size="sm">Small</Button>
                <Button>Default</Button>
                <Button size="lg">Large</Button>
                <Button size="icon" aria-label="Favourite"><RiHeartLine className="size-4" /></Button>
              </Row>
            </CardContent></Card>

            <Card><CardContent className="space-y-4 py-6">
              <Eyebrow>Status badges</Eyebrow>
              <div className="flex flex-wrap gap-2.5">
                <Badge variant="success">Active</Badge>
                <Badge variant="warning">Awaiting vetting</Badge>
                <Badge variant="secondary">Application submitted</Badge>
                <Badge>Action needed</Badge>
                <Badge variant="outline">No-show</Badge>
                <Badge variant="destructive">Declined</Badge>
              </div>
            </CardContent></Card>

            <div className="grid gap-5 lg:grid-cols-2">
              {/* Shift card */}
              <Card className="overflow-hidden">
                <CardContent className="flex gap-4 py-5">
                  <div className="flex min-w-[64px] flex-col items-center justify-center rounded-xl bg-navy px-3 py-2 text-navy-foreground">
                    <span className="text-[10px] uppercase tracking-[0.1em] opacity-80">Thu</span>
                    <span className="font-serif text-3xl font-light leading-none">12</span>
                    <span className="text-[10px] opacity-80">Jun</span>
                  </div>
                  <div className="flex-1">
                    <Eyebrow>Te Pūaroha · Soup Kitchen</Eyebrow>
                    <p className="mt-1 font-serif text-xl font-normal">Dinner service</p>
                    <p className="mt-1 flex items-center gap-1.5 text-sm text-muted-foreground">
                      <RiTimeLine className="size-3.5" /> 4:30–7:30pm · Tory Street
                    </p>
                    <div className="mt-3 flex items-center justify-between">
                      <span className="text-sm text-muted-foreground"><span className="font-medium text-foreground">3</span> spots left</span>
                      <Button size="sm">Sign up</Button>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Form field */}
              <Card><CardContent className="space-y-4 py-5">
                <Eyebrow>Form field</Eyebrow>
                <div className="space-y-2">
                  <Label htmlFor="sg-name">Preferred name <span className="text-primary">*</span></Label>
                  <Input id="sg-name" defaultValue="Aroha" />
                  <p className="text-xs text-muted-foreground">This is how we&apos;ll greet you across the app.</p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="sg-phone">Phone</Label>
                  <Input id="sg-phone" placeholder="021 555 0134" />
                </div>
              </CardContent></Card>
            </div>

            <div className="grid gap-5 lg:grid-cols-2">
              {/* Empty state */}
              <Card><CardContent className="flex flex-col items-center gap-3 py-10 text-center">
                <Illustration name="cafe" size={96} />
                <p className="font-serif text-lg font-normal">No shifts open yet</p>
                <p className="max-w-[34ch] text-sm text-muted-foreground">When new shifts open at Te Pūaroha, they&apos;ll appear here. Nau mai, check back soon.</p>
                <Button className="mt-1">Browse all shifts</Button>
              </CardContent></Card>

              {/* Milestone */}
              <Card><CardContent className="flex items-center gap-4 py-6">
                <Illustration name="kowhai" size={88} />
                <div>
                  <Eyebrow>Whakanui · Milestone</Eyebrow>
                  <p className="mt-1 font-serif text-2xl font-normal">50 shifts served</p>
                  <p className="mt-1 text-sm text-muted-foreground">Ka rawe, Aroha. You&apos;ve shown up fifty times for the kaupapa.</p>
                </div>
              </CardContent></Card>
            </div>
          </div>
        </section>

        <footer className="border-t border-border py-12">
          <Wordmark className="h-6" />
          <p className="mt-3 text-sm text-muted-foreground">
            Living styleguide · rendered from the app&apos;s own tokens and components.
          </p>
        </footer>
      </div>
    </div>
  );
}
