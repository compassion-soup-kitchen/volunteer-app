"use client";

import { useTheme } from "next-themes";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { RiSunLine, RiMoonLine, RiComputerLine } from "@remixicon/react";

export function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  if (!mounted) {
    return <Button variant="ghost" size="icon-sm" aria-label="Toggle theme" />;
  }

  const next =
    theme === "light" ? "dark" : theme === "dark" ? "system" : "light";

  const label =
    theme === "light"
      ? "Switch to dark mode"
      : theme === "dark"
        ? "Switch to system theme"
        : "Switch to light mode";

  return (
    <Button
      variant="ghost"
      size="icon-sm"
      onClick={() => setTheme(next)}
      aria-label={label}
    >
      {theme === "light" && <RiSunLine className="size-4" />}
      {theme === "dark" && <RiMoonLine className="size-4" />}
      {theme === "system" && <RiComputerLine className="size-4" />}
    </Button>
  );
}
