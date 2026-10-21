"use client";

import { MotionConfig } from "motion/react";

/**
 * Every `motion` component in the app honours the reader's "reduce motion"
 * setting: things still fade, but nothing slides, scales or turns. It sits in
 * the root layout so a new animation can't forget to ask, and it's a client
 * boundary because MotionConfig is a context provider.
 */
export function MotionProvider({ children }: { children: React.ReactNode }) {
  return <MotionConfig reducedMotion="user">{children}</MotionConfig>;
}
