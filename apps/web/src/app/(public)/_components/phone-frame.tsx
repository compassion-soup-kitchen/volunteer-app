import Image from "next/image";
import { cn } from "@/lib/utils";

/**
 * PhoneShot — a hardware bezel wrapped around a real app screenshot. The
 * screenshots already carry their own status bar and bottom tab bar, so the
 * frame only adds the device shell + Dynamic Island. Screens are 1206×2622
 * (iPhone), framed at that exact aspect so nothing is stretched or cropped.
 */
export function PhoneShot({
  src,
  alt,
  priority = false,
  glow = false,
  className,
}: {
  src: string;
  alt: string;
  priority?: boolean;
  glow?: boolean;
  className?: string;
}) {
  return (
    <div
      className={cn("relative w-full max-w-[300px] rounded-[2.75rem] p-[9px]", className)}
      style={{
        background: "linear-gradient(155deg, var(--device-bezel-top), var(--device-bezel-bottom))",
        boxShadow: glow ? "var(--device-shadow-glow)" : "var(--device-shadow)",
      }}
    >
      <div className="relative aspect-[1206/2622] overflow-hidden rounded-[2.2rem] bg-[var(--device-screen)]">
        <Image
          src={src}
          alt={alt}
          fill
          priority={priority}
          sizes="300px"
          className="object-cover object-top"
        />
        {/* Dynamic Island */}
        <div className="pointer-events-none absolute left-1/2 top-2 z-30 h-[20px] w-[72px] -translate-x-1/2 rounded-full bg-black" />
      </div>
    </div>
  );
}
