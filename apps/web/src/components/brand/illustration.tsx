import { cn } from "@/lib/utils";

/** The hand-painted two-ink spot illustrations available under /public/brand/illustrations. */
export const ILLUSTRATIONS = {
  book: "Ako · learning & training",
  aotearoa: "Aotearoa · place",
  dove: "Manaaki · care",
  prayer: "Wairua · spirit",
  icecream: "Reka · treats",
  "rata-flower": "Rātā · growth",
  candle: "Aroha mau · remembrance",
  give: "Tuku · giving",
  heart: "Aroha · love",
  korero: "Pānui · news & kōrero",
  cafe: "Te Pūaroha · the kitchen",
  tree: "Tupu · growing",
  coffee: "Kai · food & drink",
  kowhai: "Whakanui · milestones",
} as const;

export type IllustrationName = keyof typeof ILLUSTRATIONS;

interface IllustrationProps extends Omit<React.ComponentProps<"img">, "src" | "width" | "height"> {
  name: IllustrationName;
  /** Rendered square size in px (the source art is portrait but object-contain centres it). */
  size?: number;
}

/**
 * Illustration — a named brand spot illustration. These have opaque light
 * backgrounds, so place them on white/paper surfaces (or inside a white tile
 * when over a coloured panel), never tinted onto dark backgrounds.
 */
export function Illustration({ name, size = 96, alt = "", className, style, ...props }: IllustrationProps) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={`/brand/illustrations/${name}.webp`}
      alt={alt}
      width={size}
      height={size}
      loading="lazy"
      decoding="async"
      className={cn("object-contain", className)}
      style={{ width: size, height: size, ...style }}
      {...props}
    />
  );
}
