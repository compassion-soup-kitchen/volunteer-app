"use client";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import {
  RiHeartLine,
  RiTimeLine,
  RiTeamLine,
  RiHandHeartLine,
  RiCalendarLine,
  RiArrowRightLine,
  RiMenuLine,
  RiCloseLine,
  RiMapPinLine,
  RiMailLine,
  RiPhoneLine,
  RiInstagramLine,
  RiFacebookCircleLine,
} from "@remixicon/react";
import { ThemeToggle } from "@/components/theme-toggle";
import * as motion from "motion/react-client";
import { useState } from "react";

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

const volunteerRoles = [
  {
    icon: RiHeartLine,
    title: "Kitchen Mahi",
    description:
      "Prepare and serve kai alongside our kitchen whānau. No experience needed — just aroha.",
  },
  {
    icon: RiTeamLine,
    title: "Community Outreach",
    description:
      "Connect with whānau in need through our street outreach and community programmes.",
  },
  {
    icon: RiCalendarLine,
    title: "Events & Fundraising",
    description:
      "Help organise community events, food drives, and fundraising kaupapa.",
  },
  {
    icon: RiHandHeartLine,
    title: "Advocacy & Support",
    description:
      "Support our mahi in policy advocacy and wrap-around social services.",
  },
];

export default function Home() {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Navigation */}
      <nav className="sticky top-0 z-50 border-b border-border/50 bg-background/95 backdrop-blur-sm">
        <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-6">
          <a href="/" className="flex items-center gap-2.5">
            <div className="flex size-8 items-center justify-center bg-primary">
              <RiHeartLine className="size-4 text-primary-foreground" />
            </div>
            <div className="leading-none">
              <span className="text-sm font-semibold tracking-tight">
                Te Pūaroha
              </span>
              <span className="ml-1.5 hidden text-xs text-muted-foreground sm:inline">
                Compassion Soup Kitchen
              </span>
            </div>
          </a>

          {/* Desktop nav */}
          <div className="hidden items-center gap-6 md:flex">
            <a
              href="#about"
              className="text-xs text-muted-foreground transition-colors hover:text-foreground"
            >
              Our Story
            </a>
            <a
              href="#volunteer"
              className="text-xs text-muted-foreground transition-colors hover:text-foreground"
            >
              Volunteer
            </a>
            <a
              href="#impact"
              className="text-xs text-muted-foreground transition-colors hover:text-foreground"
            >
              Impact
            </a>
            <a
              href="#contact"
              className="text-xs text-muted-foreground transition-colors hover:text-foreground"
            >
              Contact
            </a>
            <ThemeToggle />
            <Button size="sm">
              Sign Up
              <RiArrowRightLine data-icon="inline-end" className="size-3.5" />
            </Button>
          </div>

          {/* Mobile menu toggle */}
          <Button
            variant="ghost"
            size="icon"
            className="md:hidden"
            onClick={() => setMenuOpen(!menuOpen)}
            aria-label={menuOpen ? "Close menu" : "Open menu"}
          >
            {menuOpen ? (
              <RiCloseLine className="size-5" />
            ) : (
              <RiMenuLine className="size-5" />
            )}
          </Button>
        </div>

        {/* Mobile menu */}
        {menuOpen && (
          <div className="border-t border-border/50 bg-background px-6 py-4 md:hidden">
            <div className="flex flex-col gap-3">
              <a
                href="#about"
                className="text-sm text-muted-foreground transition-colors hover:text-foreground"
                onClick={() => setMenuOpen(false)}
              >
                Our Story
              </a>
              <a
                href="#volunteer"
                className="text-sm text-muted-foreground transition-colors hover:text-foreground"
                onClick={() => setMenuOpen(false)}
              >
                Volunteer
              </a>
              <a
                href="#impact"
                className="text-sm text-muted-foreground transition-colors hover:text-foreground"
                onClick={() => setMenuOpen(false)}
              >
                Impact
              </a>
              <a
                href="#contact"
                className="text-sm text-muted-foreground transition-colors hover:text-foreground"
                onClick={() => setMenuOpen(false)}
              >
                Contact
              </a>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Theme</span>
                <ThemeToggle />
              </div>
              <Separator />
              <Button size="sm" className="w-full">
                Sign Up
              </Button>
            </div>
          </div>
        )}
      </nav>

      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="mx-auto max-w-6xl px-6 pb-24 pt-20 sm:pb-32 sm:pt-28">
          <motion.div {...fadeUp} className="max-w-2xl">
            <p className="mb-4 text-xs font-medium tracking-widest text-primary uppercase">
              Nau mai, haere mai
            </p>
            <h1 className="text-4xl font-bold leading-[1.1] tracking-tight sm:text-5xl lg:text-6xl">
              Every meal is an act
              <br />
              <span className="text-primary">of aroha</span>
            </h1>
            <p className="mt-6 max-w-lg text-base leading-relaxed text-muted-foreground sm:text-lg">
              For over 125 years, Compassion Soup Kitchen has nourished our
              community with kai, kindness, and connection. Join our whānau of
              volunteers and help restore mana, one meal at a time.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Button size="lg" className="px-6">
                Become a Volunteer
                <RiArrowRightLine
                  data-icon="inline-end"
                  className="size-3.5"
                />
              </Button>
              <Button variant="outline" size="lg" className="px-6">
                <RiTimeLine data-icon="inline-start" className="size-3.5" />
                See Upcoming Shifts
              </Button>
            </div>
          </motion.div>

          {/* Decorative element */}
          <div
            aria-hidden="true"
            className="pointer-events-none absolute -right-20 top-10 hidden size-80 rounded-full bg-primary/5 blur-3xl lg:block"
          />
        </div>
      </section>

      {/* Stats strip */}
      <section className="border-y border-border bg-muted/30">
        <div className="mx-auto grid max-w-6xl grid-cols-2 divide-x divide-border lg:grid-cols-4">
          {stats.map((stat, i) => (
            <motion.div
              key={stat.label}
              {...stagger}
              transition={{
                duration: 0.4,
                delay: i * 0.1,
                ease,
              }}
              className="px-6 py-8 text-center"
            >
              <p className="font-mono text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
                {stat.value}
              </p>
              <p className="mt-1 text-xs font-medium text-foreground">
                {stat.label}
              </p>
              <p className="mt-0.5 text-[11px] italic text-muted-foreground">
                {stat.subtext}
              </p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* About / Story */}
      <section id="about" className="scroll-mt-16">
        <div className="mx-auto max-w-6xl px-6 py-24 sm:py-32">
          <div className="grid gap-16 lg:grid-cols-2 lg:gap-20">
            <motion.div {...fadeUp}>
              <p className="mb-3 text-xs font-medium tracking-widest text-primary uppercase">
                Tō mātou kōrero &middot; Our Story
              </p>
              <h2 className="text-3xl font-bold leading-tight tracking-tight sm:text-4xl">
                More than a meal.
                <br />A place of belonging.
              </h2>
              <div className="mt-6 space-y-4 text-sm leading-relaxed text-muted-foreground">
                <p>
                  Founded by the Sisters of Compassion, Te Pūaroha has been a
                  beacon of manaakitanga in our community for over a century. What
                  began as a simple kitchen serving soup has grown into a
                  wraparound service that nourishes body, mind, and spirit.
                </p>
                <p>
                  We serve anyone who walks through our doors &mdash; no
                  questions asked. Every plate of kai carries with it the aroha
                  of hundreds of volunteers who give their time, skills, and
                  heart to this kaupapa.
                </p>
                <p>
                  Our mahi extends beyond the kitchen. We advocate for food
                  security, connect whānau with support services, and work to
                  address the root causes of poverty and homelessness in
                  Aotearoa.
                </p>
              </div>
            </motion.div>

            <motion.div
              {...fadeUp}
              transition={{ duration: 0.5, delay: 0.15, ease }}
              className="flex items-center"
            >
              <div className="w-full space-y-4">
                <Card>
                  <CardContent>
                    <blockquote className="border-l-2 border-primary pl-4 italic text-muted-foreground">
                      &ldquo;He aha te mea nui o te ao? He tangata, he tangata,
                      he tangata.&rdquo;
                    </blockquote>
                    <p className="mt-3 text-xs text-muted-foreground">
                      What is the most important thing in the world? It is
                      people, it is people, it is people.
                    </p>
                  </CardContent>
                </Card>
                <div className="grid grid-cols-2 gap-4">
                  <Card>
                    <CardContent className="text-center">
                      <p className="font-mono text-2xl font-bold text-primary">
                        1901
                      </p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        Year founded
                      </p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="text-center">
                      <p className="font-mono text-2xl font-bold text-primary">
                        7 days
                      </p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        Open every week
                      </p>
                    </CardContent>
                  </Card>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Volunteer Roles */}
      <section id="volunteer" className="scroll-mt-16 border-t border-border bg-muted/20">
        <div className="mx-auto max-w-6xl px-6 py-24 sm:py-32">
          <motion.div {...fadeUp} className="max-w-lg">
            <p className="mb-3 text-xs font-medium tracking-widest text-primary uppercase">
              Āwhina mai &middot; Get Involved
            </p>
            <h2 className="text-3xl font-bold leading-tight tracking-tight sm:text-4xl">
              Your time makes
              <br />
              all the difference
            </h2>
            <p className="mt-4 text-sm leading-relaxed text-muted-foreground">
              Whether you have an hour or a day, there&apos;s a place for you in
              our whānau. Every volunteer role contributes to our shared
              kaupapa of compassion and community.
            </p>
          </motion.div>

          <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {volunteerRoles.map((role, i) => (
              <motion.div
                key={role.title}
                {...stagger}
                transition={{
                  duration: 0.4,
                  delay: i * 0.08,
                  ease,
                }}
              >
                <Card className="h-full transition-colors hover:bg-muted/40">
                  <CardHeader>
                    <div className="mb-2 flex size-9 items-center justify-center bg-primary/10">
                      <role.icon className="size-4 text-primary" />
                    </div>
                    <CardTitle>{role.title}</CardTitle>
                    <CardDescription>{role.description}</CardDescription>
                  </CardHeader>
                </Card>
              </motion.div>
            ))}
          </div>

          <motion.div {...fadeUp} className="mt-10 text-center">
            <Button size="lg" className="px-6">
              View Available Shifts
              <RiArrowRightLine data-icon="inline-end" className="size-3.5" />
            </Button>
          </motion.div>
        </div>
      </section>

      {/* Impact / Testimonial */}
      <section id="impact" className="scroll-mt-16">
        <div className="mx-auto max-w-6xl px-6 py-24 sm:py-32">
          <motion.div {...fadeUp} className="mx-auto max-w-2xl text-center">
            <p className="mb-3 text-xs font-medium tracking-widest text-primary uppercase">
              Ngā kōrero &middot; Voices
            </p>
            <h2 className="text-3xl font-bold leading-tight tracking-tight sm:text-4xl">
              Stories from our whānau
            </h2>
          </motion.div>

          <div className="mt-14 grid gap-4 md:grid-cols-3">
            <motion.div
              {...stagger}
              transition={{ duration: 0.4, ease }}
            >
              <Card className="h-full">
                <CardContent>
                  <blockquote className="text-sm leading-relaxed text-muted-foreground">
                    &ldquo;Volunteering here changed my perspective entirely. You
                    come to give, but you receive so much more &mdash; the
                    connections, the laughter, the sense of purpose.&rdquo;
                  </blockquote>
                  <div className="mt-4">
                    <p className="text-xs font-medium">Sarah T.</p>
                    <p className="text-[11px] text-muted-foreground">
                      Kitchen volunteer, 3 years
                    </p>
                  </div>
                </CardContent>
              </Card>
            </motion.div>

            <motion.div
              {...stagger}
              transition={{
                duration: 0.4,
                delay: 0.08,
                ease,
              }}
            >
              <Card className="h-full border-primary/20 bg-primary/[0.03]">
                <CardContent>
                  <blockquote className="text-sm leading-relaxed text-muted-foreground">
                    &ldquo;This place saved me when I had nothing. Now I
                    volunteer every week because I want others to feel the same
                    warmth I felt when I first walked through those doors.&rdquo;
                  </blockquote>
                  <div className="mt-4">
                    <p className="text-xs font-medium">James K.</p>
                    <p className="text-[11px] text-muted-foreground">
                      Former guest, now volunteer
                    </p>
                  </div>
                </CardContent>
              </Card>
            </motion.div>

            <motion.div
              {...stagger}
              transition={{
                duration: 0.4,
                delay: 0.16,
                ease,
              }}
            >
              <Card className="h-full">
                <CardContent>
                  <blockquote className="text-sm leading-relaxed text-muted-foreground">
                    &ldquo;Our school group volunteers here each term. The
                    rangatahi always leave inspired and with a deeper
                    understanding of manaakitanga in action.&rdquo;
                  </blockquote>
                  <div className="mt-4">
                    <p className="text-xs font-medium">Aroha M.</p>
                    <p className="text-[11px] text-muted-foreground">
                      School coordinator
                    </p>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="border-t border-border bg-primary/[0.03]">
        <div className="mx-auto max-w-6xl px-6 py-24 sm:py-32">
          <motion.div {...fadeUp} className="mx-auto max-w-xl text-center">
            <h2 className="text-3xl font-bold leading-tight tracking-tight sm:text-4xl">
              Ready to make
              <br />a difference?
            </h2>
            <p className="mt-4 text-sm leading-relaxed text-muted-foreground">
              Join hundreds of volunteers who give their time and aroha to
              Te{"\u00A0"}Pūaroha. Sign up today and we&apos;ll match you with shifts
              that work for your schedule.
            </p>
            <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
              <Button size="lg" className="px-8">
                Create Your Account
                <RiArrowRightLine
                  data-icon="inline-end"
                  className="size-3.5"
                />
              </Button>
              <Button variant="outline" size="lg" className="px-6">
                Learn More
              </Button>
            </div>
            <p className="mt-4 text-[11px] text-muted-foreground">
              No commitment required. Volunteer as often as suits you.
            </p>
          </motion.div>
        </div>
      </section>

      {/* Footer */}
      <footer id="contact" className="scroll-mt-16 border-t border-border">
        <div className="mx-auto max-w-6xl px-6 py-16">
          <div className="grid gap-12 sm:grid-cols-2 lg:grid-cols-4">
            <div className="sm:col-span-2 lg:col-span-1">
              <div className="flex items-center gap-2.5">
                <div className="flex size-8 items-center justify-center bg-primary">
                  <RiHeartLine className="size-4 text-primary-foreground" />
                </div>
                <div className="leading-none">
                  <p className="text-sm font-semibold tracking-tight">
                    Te Pūaroha
                  </p>
                </div>
              </div>
              <p className="mt-3 text-xs leading-relaxed text-muted-foreground">
                Compassion Soup Kitchen has served the community of Aotearoa
                with aroha since 1901.
              </p>
              <div className="mt-4 flex gap-2">
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

            <div>
              <p className="text-xs font-semibold uppercase tracking-wider">
                Volunteer
              </p>
              <ul className="mt-3 space-y-2">
                <li>
                  <a
                    href="#"
                    className="text-xs text-muted-foreground transition-colors hover:text-foreground"
                  >
                    Sign Up
                  </a>
                </li>
                <li>
                  <a
                    href="#"
                    className="text-xs text-muted-foreground transition-colors hover:text-foreground"
                  >
                    Available Shifts
                  </a>
                </li>
                <li>
                  <a
                    href="#"
                    className="text-xs text-muted-foreground transition-colors hover:text-foreground"
                  >
                    Volunteer FAQ
                  </a>
                </li>
                <li>
                  <a
                    href="#"
                    className="text-xs text-muted-foreground transition-colors hover:text-foreground"
                  >
                    Group Volunteering
                  </a>
                </li>
              </ul>
            </div>

            <div>
              <p className="text-xs font-semibold uppercase tracking-wider">
                Support Us
              </p>
              <ul className="mt-3 space-y-2">
                <li>
                  <a
                    href="#"
                    className="text-xs text-muted-foreground transition-colors hover:text-foreground"
                  >
                    Donate
                  </a>
                </li>
                <li>
                  <a
                    href="#"
                    className="text-xs text-muted-foreground transition-colors hover:text-foreground"
                  >
                    Sponsor a Meal
                  </a>
                </li>
                <li>
                  <a
                    href="#"
                    className="text-xs text-muted-foreground transition-colors hover:text-foreground"
                  >
                    Corporate Partnerships
                  </a>
                </li>
                <li>
                  <a
                    href="#"
                    className="text-xs text-muted-foreground transition-colors hover:text-foreground"
                  >
                    Donate Kai
                  </a>
                </li>
              </ul>
            </div>

            <div>
              <p className="text-xs font-semibold uppercase tracking-wider">
                Contact
              </p>
              <ul className="mt-3 space-y-2.5">
                <li className="flex items-start gap-2">
                  <RiMapPinLine className="mt-0.5 size-3.5 shrink-0 text-muted-foreground" />
                  <span className="text-xs text-muted-foreground">
                    Wellington, Aotearoa
                    <br />
                    New Zealand
                  </span>
                </li>
                <li className="flex items-center gap-2">
                  <RiMailLine className="size-3.5 shrink-0 text-muted-foreground" />
                  <a
                    href="mailto:info@soupkitchen.org.nz"
                    className="text-xs text-muted-foreground transition-colors hover:text-foreground"
                  >
                    info@soupkitchen.org.nz
                  </a>
                </li>
                <li className="flex items-center gap-2">
                  <RiPhoneLine className="size-3.5 shrink-0 text-muted-foreground" />
                  <a
                    href="tel:+6443892288"
                    className="text-xs text-muted-foreground transition-colors hover:text-foreground"
                  >
                    (04) 389 2288
                  </a>
                </li>
              </ul>
            </div>
          </div>

          <Separator className="my-8" />

          <div className="flex flex-col items-center justify-between gap-4 sm:flex-row">
            <p className="text-[11px] text-muted-foreground">
              &copy; {new Date().getFullYear()} Compassion Soup Kitchen &mdash;
              Te Pūaroha. All rights reserved.
            </p>
            <p className="text-[11px] italic text-muted-foreground">
              Manaakitanga &middot; Aroha &middot; Whakapono
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
