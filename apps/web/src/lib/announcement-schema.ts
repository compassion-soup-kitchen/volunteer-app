import { z } from "zod";

/**
 * Pure validation and notification rules for announcements, kept out of
 * the server actions so they can be unit-tested and imported from client
 * components (form field limits) without pulling in server-only modules.
 */

export const ANNOUNCEMENT_AUDIENCES = [
  "ALL",
  "VOLUNTEERS",
  "COORDINATORS",
] as const;

export type AnnouncementAudience = (typeof ANNOUNCEMENT_AUDIENCES)[number];

export const ANNOUNCEMENT_TITLE_MAX = 120;
export const ANNOUNCEMENT_BODY_MAX = 5000;

/**
 * How many files one pānui may carry. Lives here rather than beside the upload
 * action because a `"use server"` module may only export async functions.
 */
export const MAX_ANNOUNCEMENT_ATTACHMENTS = 5;

export const announcementInputSchema = z.object({
  title: z
    .string("Give the pānui a title.")
    .trim()
    .min(1, "Give the pānui a title.")
    .max(
      ANNOUNCEMENT_TITLE_MAX,
      `Keep the title under ${ANNOUNCEMENT_TITLE_MAX} characters.`
    ),
  body: z
    .string("Write a message to share.")
    .trim()
    .min(1, "Write a message to share.")
    .max(
      ANNOUNCEMENT_BODY_MAX,
      `Keep the message under ${ANNOUNCEMENT_BODY_MAX} characters.`
    ),
  audience: z.enum(ANNOUNCEMENT_AUDIENCES, "Choose who this pānui is for."),
});

export type AnnouncementInput = z.infer<typeof announcementInputSchema>;

export type ParsedAnnouncementInput =
  | { data: AnnouncementInput; error?: undefined }
  | { data?: undefined; error: string };

/** Validate raw form input, returning the first human-readable issue. */
export function parseAnnouncementInput(
  input: unknown
): ParsedAnnouncementInput {
  const parsed = announcementInputSchema.safeParse(input);
  if (!parsed.success) {
    return {
      error: parsed.error.issues[0]?.message ?? "That pānui doesn't look right.",
    };
  }
  return { data: parsed.data };
}

/** Whether volunteers can see announcements for this audience. */
export function audienceIncludesVolunteers(
  audience: AnnouncementAudience
): boolean {
  return audience === "ALL" || audience === "VOLUNTEERS";
}

/**
 * Volunteers get a push only when an announcement first goes live
 * (draft → published) and only if the audience lets them see it.
 * Edits to an already-published pānui must stay quiet.
 */
export function shouldNotifyVolunteersOnPublish(
  previousSentAt: Date | null,
  audience: AnnouncementAudience
): boolean {
  return previousSentAt === null && audienceIncludesVolunteers(audience);
}

const PUSH_BODY_MAX = 140;

/** Collapse whitespace and truncate the body to fit a push notification. */
export function announcementPushBody(body: string): string {
  const collapsed = body.replace(/\s+/g, " ").trim();
  if (collapsed.length <= PUSH_BODY_MAX) return collapsed;
  return `${collapsed.slice(0, PUSH_BODY_MAX - 1).trimEnd()}…`;
}
