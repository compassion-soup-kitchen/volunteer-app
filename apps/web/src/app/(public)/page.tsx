import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  RiArrowRightLine,
  RiCheckLine,
  RiMapPinLine,
  RiMailLine,
  RiPhoneLine,
  RiInstagramLine,
  RiFacebookCircleLine,
  RiHeartLine,
  RiHandHeartLine,
  RiCrossLine,
} from "@remixicon/react";
import * as motion from "motion/react-client";
import { LandingNav } from "./landing-nav";
import { APP_VERSION } from "@/lib/version";
import { Eyebrow } from "@/components/brand/eyebrow";
import { SectionHeading } from "@/components/brand/section-heading";
import { Kowhaiwhai } from "@/components/brand/kowhaiwhai";
import { Wordmark } from "@/components/brand/wordmark";
// Store badges (./_components/store-badges) are intentionally not rendered while
// the mobile apps are unpublished — re-import and restore <StoreBadges /> in the
// hero and join CTA once the real App Store / Google Play listing URLs exist.
import { PhoneShot } from "./_components/phone-frame";

const ease = [0.22, 1, 0.36, 1] as const;

const fadeUp = {
  initial: { opacity: 0, y: 24 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, margin: "-60px" },
  transition: { duration: 0.5, ease },
};

const eyebrowOnDark = "text-xs font-semibold uppercase tracking-[0.16em]";

const features = [
  {
    eyebrow: "Te rārangi mahi · Shifts",
    title: "Fill the roster\nfrom your phone",
    body: "See every open shift, filter by the mahi you love, and pick one up with a single tap. Your upcoming shifts ride along at the top, so you always know where to be.",
    bullets: ["Browse and book open shifts", "A reminder before every shift", "Cancel or swap when life happens"],
    src: "/app/shifts.png",
    alt: "The Shifts screen, showing shifts you're rostered on and open shifts to pick up",
  },
  {
    eyebrow: "Tō pānga · Impact",
    title: "See the good\nyou've done",
    body: "Every hour and every meal adds up. Track the time you've given, watch your honorifics grow from Aroha to Mana, and feel the difference your aroha makes.",
    bullets: ["Hours, meals and shifts at a glance", "Earn honorifics as you give more", "A monthly snapshot of your mahi"],
    src: "/app/impact.png",
    alt: "The Impact screen, showing 39.5 hours given and progress towards the Mana honorific",
  },
  {
    eyebrow: "Ako · Training",
    title: "Walk in\nshift-ready",
    body: "Keep your core modules up to date and book the sessions that build your confidence — in the kitchen, the dining room, and out in the community.",
    bullets: ["Track induction, health & safety and more", "Book training that fits your schedule", "Always know what's left to complete"],
    src: "/app/training.png",
    alt: "The Training screen, showing core modules complete and an upcoming booked session",
  },
  {
    eyebrow: "Tō kōtaha · Profile",
    title: "Your details,\nalways to hand",
    body: "Check your standing and police vetting at a glance, keep your contact details current, and have your emergency contact ready — all in one tidy place.",
    bullets: ["Standing and vetting at a glance", "Update your contact details anytime", "Your emergency contact, ready if needed"],
    src: "/app/profile.png",
    alt: "The Profile screen, showing active standing, cleared police vetting and contact details",
  },
];

export default function Home() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <LandingNav />

      {/* Hero — the app, in hand */}
      <section id="app" className="relative overflow-hidden scroll-mt-16">
        <Kowhaiwhai className="pointer-events-none absolute -right-44 -top-32 hidden w-[720px] opacity-[0.05] lg:block" />
        <div
          aria-hidden
          className="pointer-events-none absolute left-1/2 top-24 -z-0 hidden size-[560px] -translate-x-1/3 rounded-full lg:block"
          style={{ background: "radial-gradient(closest-side, color-mix(in oklab, var(--primary) 14%, transparent), transparent)" }}
        />
        <div className="mx-auto grid max-w-6xl items-center gap-12 px-6 pb-20 pt-16 sm:pt-20 lg:grid-cols-[1.05fr_0.95fr] lg:gap-8 lg:pb-28">
          <motion.div {...fadeUp} className="relative text-center lg:text-left">
            <Eyebrow className="text-primary">Nau mai · Haere mai</Eyebrow>
            <h1 className="mt-4 font-serif text-4xl font-light leading-[1.05] tracking-tight text-balance sm:text-5xl lg:text-[3.4rem]">
              Volunteer with us,
              <br className="hidden sm:block" /> right from your{" "}
              <span className="text-primary">phone</span>
            </h1>
            <p className="mx-auto mt-6 max-w-lg text-lg leading-relaxed text-muted-foreground lg:mx-0">
              The Te Pūaroha app brings your roster, your training, and your impact
              into one warm, simple place. Pick up shifts, track your hours, and
              stay close to your whānau — wherever you are.
            </p>
            <div className="mt-8 flex flex-col items-center gap-4 lg:items-start">
              <div className="flex flex-col items-center gap-3 sm:flex-row">
                <Button size="lg" asChild>
                  <a href="/register">
                    Sign up to volunteer
                    <RiArrowRightLine data-icon="inline-end" className="size-4" />
                  </a>
                </Button>
                <Button size="lg" variant="outline" asChild>
                  <a href="/login">Sign in</a>
                </Button>
              </div>
              <div className="flex flex-wrap items-center justify-center gap-x-3 gap-y-1 text-sm text-muted-foreground lg:justify-start">
                <span className="inline-flex items-center gap-1.5">
                  <RiCheckLine className="size-4 text-primary" />
                  Free for every volunteer
                </span>
                <span aria-hidden className="text-border">·</span>
                <span className="inline-flex items-center gap-1.5">
                  <RiCheckLine className="size-4 text-primary" />
                  Works on any phone or computer
                </span>
              </div>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 32, rotate: -4 }}
            whileInView={{ opacity: 1, y: 0, rotate: -2 }}
            viewport={{ once: true, margin: "-60px" }}
            transition={{ duration: 0.7, delay: 0.1, ease }}
            className="relative mx-auto w-full max-w-[300px] lg:max-w-none lg:justify-self-center"
          >
            <PhoneShot
              src="/app/home.png"
              alt="The Te Pūaroha app home screen, greeting Aroha with her next shift"
              priority
              glow
              className="mx-auto lg:rotate-[-2deg]"
            />
          </motion.div>
        </div>
      </section>

      {/* Feature walkthrough */}
      <section id="features" className="scroll-mt-16 border-t border-border bg-card">
        <div className="mx-auto max-w-6xl px-6 py-24 sm:py-28">
          <motion.div {...fadeUp} className="mx-auto max-w-2xl text-center">
            <SectionHeading eyebrow="He aha kei roto · What's inside" align="center">
              Everything the kitchen needs,
              <br className="hidden sm:block" /> in one app
            </SectionHeading>
            <p className="mt-5 text-base leading-relaxed text-muted-foreground">
              Built for the way you actually volunteer — quick to pick up, warm to
              use, and there in your pocket whenever you need it.
            </p>
          </motion.div>

          <div className="mt-20 space-y-24 sm:space-y-28">
            {features.map((f, i) => (
              <FeatureRow key={f.title} {...f} flip={i % 2 === 1} />
            ))}
          </div>
        </div>
      </section>

      {/* Mission / story */}
      <section id="story" className="scroll-mt-16">
        <div className="mx-auto max-w-6xl px-6 py-24 sm:py-28">
          <div className="grid items-center gap-14 lg:grid-cols-2 lg:gap-20">
            <motion.div {...fadeUp}>
              <SectionHeading eyebrow="Tō mātou kōrero · Our story">
                More than a meal.
                <br />A place of belonging.
              </SectionHeading>
              <div className="mt-7 space-y-4 text-base leading-relaxed text-muted-foreground">
                <p>
                  For over 125 years, Compassion Soup Kitchen — Te Pūaroha — has
                  served anyone who walks through our doors, no questions asked.
                  Every plate of kai carries the aroha of hundreds of volunteers.
                </p>
                <p>
                  The app is simply a warmer way to be part of that mahi: less
                  admin, more time for the people in front of you.
                </p>
              </div>
              <Button size="lg" className="mt-8" asChild>
                <a href="/register">
                  Become a volunteer
                  <RiArrowRightLine data-icon="inline-end" className="size-4" />
                </a>
              </Button>
            </motion.div>

            <motion.div {...fadeUp} transition={{ duration: 0.5, delay: 0.15, ease }}>
              <div className="relative overflow-hidden rounded-3xl bg-primary px-8 py-12 text-primary-foreground sm:px-12 sm:py-14">
                <Kowhaiwhai tone="light" className="pointer-events-none absolute -bottom-16 -right-16 w-72 opacity-[0.12]" />
                <blockquote className="relative font-serif text-2xl font-light leading-snug tracking-tight sm:text-[1.7rem]">
                  He aha te mea nui o te ao?
                  <br />
                  He tangata, he tangata, he tangata.
                </blockquote>
                <Separator className="relative my-6 bg-primary-foreground/25" />
                <p className="relative text-sm leading-relaxed text-primary-foreground/80">
                  What is the most important thing in the world?
                  <br />
                  It is people, it is people, it is people.
                </p>
                <p className={`relative mt-4 ${eyebrowOnDark} text-primary-foreground/60`}>
                  Māori whakataukī
                </p>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Join CTA — was the app-download CTA; restore <StoreBadges /> here once
          the mobile apps are published */}
      <section id="join" className="scroll-mt-16 px-6 pb-24 sm:pb-28">
        <motion.div {...fadeUp} className="mx-auto max-w-6xl">
          <div className="relative overflow-hidden rounded-[1.75rem] bg-ink px-8 py-16 text-paper sm:px-12 sm:py-20">
            <Kowhaiwhai tone="light" className="pointer-events-none absolute -right-28 -top-24 w-[480px] opacity-[0.06]" />
            <div className="relative mx-auto max-w-xl text-center">
              <p className={`${eyebrowOnDark} text-paper/55`}>Kuhu mai · Join us</p>
              <h2 className="mt-3 font-serif text-3xl font-light tracking-tight sm:text-4xl">
                There&apos;s a place here for you
              </h2>
              <span aria-hidden className="mx-auto mt-4 block h-0.5 w-16 rounded-full bg-primary" />
              <p className="mt-5 text-base leading-relaxed text-paper/75">
                Join hundreds of volunteers who give their time and aroha to Te
                Pūaroha. Create your account, tell us a bit about yourself, and
                pick up your first shift.
              </p>
              <Button size="lg" className="mt-8" asChild>
                <a href="/register">
                  Sign up to volunteer
                  <RiArrowRightLine data-icon="inline-end" className="size-4" />
                </a>
              </Button>
              <p className="mt-6 text-xs text-paper/55">
                Already have an account?{" "}
                <a href="/login" className="font-medium text-paper underline underline-offset-2">
                  Sign in
                </a>
              </p>
            </div>
          </div>
        </motion.div>
      </section>

      {/* Footer */}
      <footer id="contact" className="scroll-mt-16 border-t border-border bg-card">
        <div className="mx-auto max-w-6xl px-6 py-16">
          <div className="grid gap-12 sm:grid-cols-2 lg:grid-cols-4">
            <div className="sm:col-span-2 lg:col-span-1">
              <Wordmark className="h-auto w-auto max-w-[190px]" />
              <p className="mt-4 max-w-xs text-sm leading-relaxed text-muted-foreground">
                Compassion Soup Kitchen has served the community of Aotearoa with
                aroha since 1901.
              </p>
              <div className="mt-5 flex gap-2">
                <Button variant="ghost" size="icon-sm" asChild>
                  <a href="https://www.facebook.com/compassionsoupkitchen" target="_blank" rel="noopener noreferrer" aria-label="Facebook">
                    <RiFacebookCircleLine className="size-4" />
                  </a>
                </Button>
                <Button variant="ghost" size="icon-sm" asChild>
                  <a href="https://www.instagram.com/compassionsoupkitchen" target="_blank" rel="noopener noreferrer" aria-label="Instagram">
                    <RiInstagramLine className="size-4" />
                  </a>
                </Button>
              </div>
            </div>

            <FooterColumn
              title="The app"
              links={[
                { label: "Join us", href: "#join" },
                { label: "Features", href: "#features" },
                { label: "Sign in on the web", href: "/login" },
                { label: "Become a volunteer", href: "/register" },
                { label: "Privacy statement", href: "/privacy" },
              ]}
            />
            <FooterColumn
              title="Support us"
              links={[
                { label: "Donate", href: "https://www.compassion.org.nz/donate", external: true },
                { label: "Sponsor a meal", href: "https://www.compassion.org.nz/donate", external: true },
                { label: "Corporate partnerships", href: "https://www.compassion.org.nz/about", external: true },
                { label: "Volunteer FAQ", href: "https://www.compassion.org.nz/volunteer", external: true },
              ]}
            />

            <div>
              <Eyebrow>Contact</Eyebrow>
              <ul className="mt-4 space-y-2.5">
                <li className="flex items-start gap-2">
                  <RiMapPinLine className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
                  <span className="text-sm text-muted-foreground">
                    Wellington, Aotearoa
                    <br />
                    New Zealand
                  </span>
                </li>
                <li className="flex items-center gap-2">
                  <RiMailLine className="size-4 shrink-0 text-muted-foreground" />
                  <a href="mailto:info@soupkitchen.org.nz" className="text-sm text-muted-foreground transition-colors hover:text-primary">
                    info@soupkitchen.org.nz
                  </a>
                </li>
                <li className="flex items-center gap-2">
                  <RiPhoneLine className="size-4 shrink-0 text-muted-foreground" />
                  <a href="tel:+6443892288" className="text-sm text-muted-foreground transition-colors hover:text-primary">
                    (04) 389 2288
                  </a>
                </li>
              </ul>
            </div>
          </div>

          <Separator className="my-8" />

          <div className="flex flex-col items-center justify-between gap-4 sm:flex-row">
            <div className="space-y-1 text-center sm:text-left">
              <p className="text-xs text-muted-foreground">
                &copy; {new Date().getFullYear()} Compassion Soup Kitchen · Te Pūaroha. All rights reserved.
              </p>
              <p className="text-xs text-muted-foreground">
                Registered Charity{" "}
                <a href="https://www.register.charities.govt.nz/Charity/CC10246" target="_blank" rel="noopener noreferrer" className="underline underline-offset-2 transition-colors hover:text-primary">
                  CC 10246
                </a>
                <span className="mx-2 text-muted-foreground/40" aria-hidden>·</span>
                <a href="/privacy" className="underline underline-offset-2 transition-colors hover:text-primary">
                  Privacy
                </a>
                <span className="mx-2 text-muted-foreground/40" aria-hidden>·</span>
                <span className="font-mono tracking-tight tabular-nums text-muted-foreground/60">v{APP_VERSION}</span>
              </p>
            </div>
            <div className="flex items-center gap-3 text-xs italic text-muted-foreground">
              <span className="flex items-center gap-1"><RiHandHeartLine className="size-3.5" />Manaakitanga</span>
              <span className="flex items-center gap-1"><RiHeartLine className="size-3.5" />Aroha</span>
              <span className="flex items-center gap-1"><RiCrossLine className="size-3.5" />Whakapono</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}

function FeatureRow({
  eyebrow,
  title,
  body,
  bullets,
  src,
  alt,
  flip,
}: {
  eyebrow: string;
  title: string;
  body: string;
  bullets: string[];
  src: string;
  alt: string;
  flip: boolean;
}) {
  return (
    <div className="grid items-center gap-12 lg:grid-cols-2 lg:gap-16">
      <motion.div
        {...fadeUp}
        className={flip ? "lg:order-2" : ""}
      >
        <Eyebrow className="text-primary">{eyebrow}</Eyebrow>
        <h3 className="mt-3 font-serif text-3xl font-light leading-[1.08] tracking-tight text-balance sm:text-4xl">
          {title.split("\n").map((line, i) => (
            <span key={i} className="block">
              {line}
            </span>
          ))}
        </h3>
        <p className="mt-5 max-w-md text-base leading-relaxed text-muted-foreground">{body}</p>
        <ul className="mt-6 space-y-2.5">
          {bullets.map((b) => (
            <li key={b} className="flex items-center gap-3 text-sm text-foreground/85">
              <span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                <RiCheckLine className="size-3.5" />
              </span>
              {b}
            </li>
          ))}
        </ul>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 28 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-60px" }}
        transition={{ duration: 0.6, delay: 0.1, ease }}
        className={`flex justify-center ${flip ? "lg:order-1 lg:justify-end" : "lg:justify-start"}`}
      >
        <PhoneShot src={src} alt={alt} className="max-w-[270px]" />
      </motion.div>
    </div>
  );
}

function FooterColumn({
  title,
  links,
}: {
  title: string;
  links: { label: string; href: string; external?: boolean }[];
}) {
  return (
    <div>
      <Eyebrow>{title}</Eyebrow>
      <ul className="mt-4 space-y-2">
        {links.map((l) => (
          <li key={l.label}>
            <a
              href={l.href}
              {...(l.external ? { target: "_blank", rel: "noopener noreferrer" } : {})}
              className="text-sm text-muted-foreground transition-colors hover:text-primary"
            >
              {l.label}
            </a>
          </li>
        ))}
      </ul>
    </div>
  );
}
