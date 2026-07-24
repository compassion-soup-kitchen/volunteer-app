"use client";

import { useId, useState } from "react";
import { RiEyeLine, RiEyeOffLine } from "@remixicon/react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

/**
 * Password field with a reveal toggle. Typing a password you can't see is the
 * single biggest source of "wrong password" errors on a change-password form,
 * so the toggle is part of the field rather than an optional extra.
 */
export function PasswordInput({
  className,
  ...props
}: Omit<React.ComponentProps<typeof Input>, "type">) {
  const [revealed, setRevealed] = useState(false);
  const fallbackId = useId();
  const inputId = props.id ?? fallbackId;

  return (
    <div className="relative">
      <Input
        {...props}
        id={inputId}
        type={revealed ? "text" : "password"}
        className={cn("pr-11", className)}
      />
      <button
        type="button"
        onClick={() => setRevealed((shown) => !shown)}
        aria-label={revealed ? "Hide password" : "Show password"}
        aria-pressed={revealed}
        aria-controls={inputId}
        className="absolute inset-y-0 right-0 flex w-11 items-center justify-center rounded-r-md text-muted-foreground transition-colors hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring/30 focus-visible:outline-none"
      >
        {revealed ? (
          <RiEyeOffLine className="size-4" />
        ) : (
          <RiEyeLine className="size-4" />
        )}
      </button>
    </div>
  );
}
