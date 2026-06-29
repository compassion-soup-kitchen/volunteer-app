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
        background: "linear-gradient(155deg, #2a2622, #100d0b)",
        boxShadow: glow
          ? "0 40px 80px -30px rgba(28,18,12,0.55), 0 0 0 1px rgba(28,18,12,0.6), inset 0 0 0 2px rgba(255,255,255,0.06)"
          : "0 30px 60px -28px rgba(28,18,12,0.45), 0 0 0 1px rgba(28,18,12,0.6), inset 0 0 0 2px rgba(255,255,255,0.06)",
      }}
    >
      <div className="relative aspect-[1206/2622] overflow-hidden rounded-[2.2rem] bg-[#FBF7F2]">
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
