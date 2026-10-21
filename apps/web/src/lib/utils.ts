import { clsx, type ClassValue } from "clsx"
import { extendTailwindMerge } from "tailwind-merge"

// Teach tailwind-merge the font sizes globals.css adds to the scale, or it
// reads `text-2xs` as a colour and drops it beside `text-muted-foreground`.
const twMerge = extendTailwindMerge({
  extend: {
    theme: {
      text: ["2xs"],
    },
  },
})

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}
