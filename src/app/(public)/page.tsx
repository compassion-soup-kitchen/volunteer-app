import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import {
  RiTimeLine,
  RiArrowRightLine,
  RiMapPinLine,
  RiMailLine,
  RiPhoneLine,
  RiInstagramLine,
  RiHandHeartLine,
  RiHeartLine,
  RiCrossLine,
  RiFacebookCircleLine,
} from "@remixicon/react";
import Image from "next/image";
import * as motion from "motion/react-client";
import { LandingNav } from "./landing-nav";
import { APP_VERSION } from "@/lib/version";
import { Eyebrow } from "@/components/brand/eyebrow";
import { SectionHeading } from "@/components/brand/section-heading";
import { Kowhaiwhai } from "@/components/brand/kowhaiwhai";
import { Wordmark } from "@/components/brand/wordmark";
import { Illustration, type IllustrationName } from "@/components/brand/illustration";

const ease = [0.22, 1, 0.36, 1] as const;

const fadeUp = {
  initial: { opacity: 0, y: 24 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, margin: "-60px" },
  transition: { duration: 0.5, ease },
};

const stagger = {
  initial: { opacity: 0, y: 16 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, margin: "-40px" },
};

const stats = [
  { value: "125+", label: "Years serving community", subtext: "Tau e mahi ana" },
  { value: "300+", label: "Meals served daily", subtext: "Kai ia rā" },
  { value: "1,000+", label: "Volunteers each year", subtext: "Kaimahi tūao" },
  { value: "50+", label: "Partner organisations", subtext: "Hoa mahi" },
];

const volunteerRoles: {
  illustration: IllustrationName;
  title: string;
  description: string;
}[] = [
  {
    illustration: "cafe",
    title: "Kitchen Mahi",
    description:
      "Prepare and serve kai alongside our kitchen whānau. No experience needed, just aroha.",
  },
  {
    illustration: "dove",
    title: "Community Outreach",
    description:
      "Connect with whānau in need through our street outreach and community programmes.",
  },
  {
    illustration: "give",
    title: "Events & Fundraising",
    description:
      "Help organise community events, food drives, and fundraising kaupapa.",
  },
  {
    illustration: "heart",
    title: "Advocacy & Support",
    description:
      "Support our mahi in policy advocacy and wrap-around social services.",
  },
];

const eyebrowOnDark = "text-xs font-semibold uppercase tracking-[0.16em]";

export default function Home() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <LandingNav />

      {/* Hero */}
      <section className="relative overflow-hidden">
        <Kowhaiwhai
          className="pointer-events-none absolute -right-40 -top-28 hidden w-[680px] opacity-[0.05] lg:block"
        />
        <div className="mx-auto grid max-w-6xl gap-12 px-6 pb-24 pt-20 sm:pb-32 sm:pt-28 lg:grid-cols-2 lg:items-center lg:gap-16">
          <motion.div {...fadeUp} className="relative">
            <Eyebrow className="text-primary">Nau mai · Haere mai</Eyebrow>
            <h1 className="mt-4 font-serif text-4xl font-light leading-[1.04] tracking-tight sm:text-5xl lg:text-[3.75rem]">
              Every meal is
              <br />
              an act of <span className="text-primary">aroha</span>
            </h1>
            <p className="mt-6 max-w-lg text-lg leading-relaxed text-muted-foreground">
              For over 125 years, Compassion Soup Kitchen has nourished our
              community with kai, kindness, and connection. Join our whānau of
              volunteers and help restore mana, one meal at a time.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Button size="lg" asChild>
                <a href="/register">
                  Become a volunteer
                  <RiArrowRightLine data-icon="inline-end" className="size-4" />
                </a>
              </Button>
              <Button variant="outline" size="lg" asChild>
                <a href="/login">
                  <RiTimeLine data-icon="inline-start" className="size-4" />
                  See upcoming shifts
                </a>
              </Button>
            </div>
          </motion.div>

          <motion.div
            {...fadeUp}
            transition={{ duration: 0.6, delay: 0.2, ease }}
            className="relative"
          >
            <div className="overflow-hidden rounded-3xl ring-1 ring-foreground/10">
              <Image
                src="/hero.jpg"
                alt="Suzanne Aubert Compassion Centre & Soup Kitchen, 132 Tory Street, Wellington"
                width={3600}
                height={2625}
                priority
                className="h-auto w-full object-cover"
              />
            </div>
          </motion.div>
        </div>
      </section>

      {/* Stats strip */}
      <section className="border-y border-border bg-card">
        <div className="mx-auto grid max-w-6xl grid-cols-2 divide-x divide-y divide-border sm:divide-y-0 lg:grid-cols-4">
          {stats.map((stat, i) => (
            <motion.div
              key={stat.label}
              {...stagger}
              transition={{ duration: 0.4, delay: i * 0.1, ease }}
              className="px-6 py-9 text-center"
            >
              <p className="font-serif text-4xl font-light tabular-nums tracking-tight text-foreground sm:text-5xl">
                {stat.value}
              </p>
              <p className="mt-2 text-sm font-medium text-foreground">{stat.label}</p>
              <p className="mt-0.5 text-xs italic text-muted-foreground">{stat.subtext}</p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* About / Story */}
      <section id="about" className="scroll-mt-16">
        <div className="mx-auto max-w-6xl px-6 py-24 sm:py-32">
          <div className="grid gap-16 lg:grid-cols-2 lg:gap-20">
            <motion.div {...fadeUp}>
              <SectionHeading eyebrow="Tō mātou kōrero · Our story">
                More than a meal.
                <br />A place of belonging.
              </SectionHeading>
              <div className="mt-7 space-y-4 text-base leading-relaxed text-muted-foreground">
                <p>
                  Founded by the Sisters of Compassion, Te Pūaroha has been a
                  beacon of manaakitanga in our community for over a century. What
                  began as a simple kitchen serving soup has grown into a
                  wraparound service that nourishes body, mind, and spirit.
                </p>
                <p>
                  We serve anyone who walks through our doors, no questions asked.
                  Every plate of kai carries with it the aroha of hundreds of
                  volunteers who give their time, skills, and heart to this kaupapa.
                </p>
                <p>
                  Our mahi extends beyond the kitchen. We advocate for food
                  security, connect whānau with support services, and work to
                  address the root causes of poverty and homelessness in Aotearoa.
                </p>
              </div>
            </motion.div>

            <motion.div
              {...fadeUp}
              transition={{ duration: 0.5, delay: 0.15, ease }}
              className="flex items-center"
            >
              <div className="relative w-full overflow-hidden rounded-3xl bg-primary px-8 py-12 text-primary-foreground sm:px-12 sm:py-14">
                <Kowhaiwhai
                  tone="light"
                  className="pointer-events-none absolute -bottom-16 -right-16 w-72 opacity-[0.12]"
                />
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

      {/* Volunteer Roles */}
      <section id="volunteer" className="scroll-mt-16 border-t border-border bg-card">
        <div className="mx-auto max-w-6xl px-6 py-24 sm:py-32">
          <motion.div {...fadeUp} className="max-w-xl">
            <SectionHeading eyebrow="Āwhina mai · Get involved">
              Your time makes
              <br />
              all the difference
            </SectionHeading>
            <p className="mt-5 text-base leading-relaxed text-muted-foreground">
              Whether you have an hour or a day, there&apos;s a place for you in
              our whānau. Every volunteer role contributes to our shared kaupapa
              of compassion and community.
            </p>
          </motion.div>

          <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {volunteerRoles.map((role, i) => (
              <motion.div
                key={role.title}
                {...stagger}
                transition={{ duration: 0.4, delay: i * 0.08, ease }}
              >
                <Card className="h-full transition-colors hover:border-primary/25">
                  <CardHeader>
                    <Illustration name={role.illustration} size={72} className="mb-1" />
                    <CardTitle className="font-serif text-xl font-normal">
                      {role.title}
                    </CardTitle>
                    <CardDescription className="text-sm leading-relaxed">
                      {role.description}
                    </CardDescription>
                  </CardHeader>
                </Card>
              </motion.div>
            ))}
          </div>

          <motion.div {...fadeUp} className="mt-10">
            <Button size="lg" asChild>
              <a href="/register">
                View available shifts
                <RiArrowRightLine data-icon="inline-end" className="size-4" />
              </a>
            </Button>
          </motion.div>
        </div>
      </section>

      {/* Impact / Testimonials */}
      <section id="impact" className="scroll-mt-16">
        <div className="mx-auto max-w-6xl px-6 py-24 sm:py-32">
          <motion.div {...fadeUp} className="mx-auto max-w-2xl">
            <SectionHeading eyebrow="Ngā kōrero · Voices" align="center">
              Stories from our whānau
            </SectionHeading>
          </motion.div>

          <div className="mt-14 grid gap-4 md:grid-cols-3">
            {[
              {
                quote:
                  "Volunteering here changed my perspective entirely. You come to give, but you receive so much more: the connections, the laughter, the sense of purpose.",
                name: "Sarah T.",
                role: "Kitchen volunteer, 3 years",
                feature: false,
              },
              {
                quote:
                  "This place saved me when I had nothing. Now I volunteer every week because I want others to feel the same warmth I felt when I first walked through those doors.",
                name: "James K.",
                role: "Former guest, now volunteer",
                feature: true,
              },
              {
                quote:
                  "Our school group volunteers here each term. The rangatahi always leave inspired and with a deeper understanding of manaakitanga in action.",
                name: "Aroha M.",
                role: "School coordinator",
                feature: false,
              },
            ].map((t, i) => (
              <motion.div
                key={t.name}
                {...stagger}
                transition={{ duration: 0.4, delay: i * 0.08, ease }}
              >
                <Card className={`h-full ${t.feature ? "border-primary/25 bg-primary/[0.04]" : ""}`}>
                  <CardContent>
                    <RiHeartLine className="mb-3 size-5 text-primary" />
                    <blockquote className="text-base leading-relaxed text-foreground/85">
                      {t.quote}
                    </blockquote>
                    <div className="mt-5">
                      <p className="text-sm font-semibold">{t.name}</p>
                      <p className="text-xs text-muted-foreground">{t.role}</p>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="px-6 pb-24 sm:pb-32">
        <motion.div {...fadeUp} className="mx-auto max-w-6xl">
          <div className="relative overflow-hidden rounded-[1.75rem] bg-ink px-8 py-16 text-center text-paper sm:px-12 sm:py-20">
            <Kowhaiwhai
              tone="light"
              className="pointer-events-none absolute -right-28 -top-20 w-[460px] opacity-[0.06]"
            />
            <div className="relative mx-auto max-w-xl">
              <p className={`${eyebrowOnDark} text-paper/55`}>Tono ināianei · Join us</p>
              <h2 className="mt-3 font-serif text-3xl font-light tracking-tight sm:text-4xl">
                Ready to make a difference?
              </h2>
              <span aria-hidden className="mx-auto mt-4 block h-0.5 w-16 rounded-full bg-primary" />
              <p className="mt-5 text-base leading-relaxed text-paper/75">
                Join hundreds of volunteers who give their time and aroha to
                Te{" "}Pūaroha. Sign up today and we&apos;ll match you with
                shifts that work for your schedule.
              </p>
              <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
                <Button size="lg" asChild>
                  <a href="/register">
                    Create your account
                    <RiArrowRightLine data-icon="inline-end" className="size-4" />
                  </a>
                </Button>
                <Button
                  variant="outline"
                  size="lg"
                  className="border-paper/30 bg-transparent text-paper hover:bg-paper/10 hover:text-paper"
                  asChild
                >
                  <a href="#about">Learn more</a>
                </Button>
              </div>
              <p className="mt-4 text-xs text-paper/55">
                No commitment required. Volunteer as often as suits you.
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
              <Wordmark className="h-8" />
              <p className="mt-4 max-w-xs text-sm leading-relaxed text-muted-foreground">
                Compassion Soup Kitchen has served the community of Aotearoa with
                aroha since 1901.
              </p>
              <div className="mt-5 flex gap-2">
                <Button variant="ghost" size="icon-sm" asChild>
                  <a
                    href="https://www.facebook.com/compassionsoupkitchen"
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label="Facebook"
                  >
                    <RiFacebookCircleLine className="size-4" />
                  </a>
                </Button>
                <Button variant="ghost" size="icon-sm" asChild>
                  <a
                    href="https://www.instagram.com/compassionsoupkitchen"
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label="Instagram"
                  >
                    <RiInstagramLine className="size-4" />
                  </a>
                </Button>
              </div>
            </div>

            <FooterColumn
              title="Volunteer"
              links={[
                { label: "Sign up", href: "/register" },
                { label: "Available shifts", href: "/login" },
                { label: "Volunteer FAQ", href: "https://www.compassion.org.nz/volunteer", external: true },
                { label: "Group volunteering", href: "https://www.compassion.org.nz/volunteer", external: true },
              ]}
            />
            <FooterColumn
              title="Support us"
              links={[
                { label: "Donate", href: "https://www.compassion.org.nz/donate", external: true },
                { label: "Sponsor a meal", href: "https://www.compassion.org.nz/donate", external: true },
                { label: "Corporate partnerships", href: "https://www.compassion.org.nz/about", external: true },
                { label: "Donate kai", href: "https://www.compassion.org.nz/donate", external: true },
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
            </div>
          </div>

          <Separator className="my-8" />

          <div className="flex flex-col items-center justify-between gap-4 sm:flex-row">
            <div className="space-y-1 text-center sm:text-left">
              <p className="text-xs text-muted-foreground">
                &copy; 2025 Compassion Soup Kitchen · Te Pūaroha. All rights reserved.
              </p>
              <p className="text-xs text-muted-foreground">
                Registered Charity{" "}
                <a
                  href="https://www.register.charities.govt.nz/Charity/CC10246"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="underline underline-offset-2 transition-colors hover:text-primary"
                >
                  CC 10246
                </a>
                <span className="mx-2 text-muted-foreground/40" aria-hidden>
                  ·
                </span>
                <span className="font-mono tracking-tight tabular-nums text-muted-foreground/60">
                  v{APP_VERSION}
                </span>
              </p>
            </div>
            <div className="flex items-center gap-3 text-xs italic text-muted-foreground">
              <span className="flex items-center gap-1">
                <RiHandHeartLine className="size-3.5" />
                Manaakitanga
              </span>
              <span className="flex items-center gap-1">
                <RiHeartLine className="size-3.5" />
                Aroha
              </span>
              <span className="flex items-center gap-1">
                <RiCrossLine className="size-3.5" />
                Whakapono
              </span>
            </div>
          </div>
        </div>
      </footer>
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
