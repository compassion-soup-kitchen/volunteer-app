import type { Metadata } from "next";
import { Fraunces, Geist_Mono } from "next/font/google";
import localFont from "next/font/local";
import { ThemeProvider } from "@/components/theme-provider";
import { SessionProvider } from "@/components/session-provider";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import "./globals.css";

// UI / body — Mona Sans (the parent brand's grotesque), self-hosted variable font.
const monaSans = localFont({
  src: "./fonts/MonaSans.woff2",
  variable: "--font-mona",
  display: "swap",
  weight: "200 900",
});

// Display / voice — Fraunces, a free editorial serif standing in for GT Alpina.
// opsz axis + auto optical sizing gives the high-contrast elegance at large sizes.
const fraunces = Fraunces({
  subsets: ["latin"],
  variable: "--font-fraunces",
  display: "swap",
  axes: ["opsz"],
});

// Mono — tabular figures / code contexts.
const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Te Pūaroha | Compassion Soup Kitchen — Volunteer",
  description:
    "Nau mai, haere mai. Join Compassion Soup Kitchen volunteers in serving meals, building community, and restoring mana in Aotearoa New Zealand.",
  icons: {
    icon: [
      { url: "/favicon-32x32.png", sizes: "32x32", type: "image/png" },
      { url: "/favicon-192x192.png", sizes: "192x192", type: "image/png" },
    ],
    apple: "/apple-touch-icon.png",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${monaSans.variable} ${fraunces.variable} ${geistMono.variable}`}
      suppressHydrationWarning
    >
      <body className="antialiased">
        <SessionProvider>
          <ThemeProvider
            attribute="class"
            defaultTheme="system"
            enableSystem
            disableTransitionOnChange
          >
            <TooltipProvider>
              {children}
            </TooltipProvider>
            <Toaster richColors />
          </ThemeProvider>
        </SessionProvider>
      </body>
    </html>
  );
}
