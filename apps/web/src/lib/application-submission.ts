/**
 * The server's contract for a volunteer application submitted from the web
 * form. It is a guardrail on top of the form's own step validation, so it
 * must never be stricter than the form: anything the form lets through has to
 * pass here too, or the applicant reaches the last step and is turned away
 * with nothing they can fix.
 *
 * Kept free of server-only imports so it can be tested without a database.
 */

import { z } from "zod";

const required = (missing: string, tooLong: string, max: number) =>
  z.string().trim().min(1, missing).max(max, tooLong);

export const applicationSubmissionSchema = z.object({
  phone: required("Please add a phone number.", "That phone number is too long.", 30),
  address: required("Please add your address.", "That address is too long.", 300),
  // Optional on the form, so an empty string means "not given".
  dateOfBirth: z
    .string()
    .refine(
      (v) => v === "" || !Number.isNaN(Date.parse(v)),
      "Please check your date of birth."
    ),
  emergencyContactName: required(
    "Please add your emergency contact's name.",
    "That emergency contact name is too long.",
    120
  ),
  emergencyContactPhone: required(
    "Please add your emergency contact's phone number.",
    "That emergency contact phone number is too long.",
    30
  ),
  emergencyContactRelationship: required(
    "Please say how you know your emergency contact.",
    "That relationship is too long.",
    60
  ),
  availability: z.record(z.string(), z.array(z.string().max(30)).max(10)),
  serviceAreaIds: z.array(z.string().max(40)).max(30),
  skills: z.array(z.string().max(120)).max(50),
  bio: z.string().max(3000, "Your note about yourself is too long."),
  agreements: z.array(
    z.object({
      type: z.enum(["CODE_OF_CONDUCT", "SAFEGUARDING"]),
      signatureData: z
        .string()
        .min(1, "Please sign both agreements.")
        .max(500_000, "Your signature is too large - please clear it and sign again."),
    })
  ),
});

export type ApplicationSubmission = z.infer<typeof applicationSubmissionSchema>;

export type ApplicationSubmissionCheck =
  | { ok: true; data: ApplicationSubmission }
  | { ok: false; error: string };

/**
 * Parse a submission, returning the first problem in words the applicant can
 * act on rather than a blanket "check your details".
 */
export function checkApplicationSubmission(input: unknown): ApplicationSubmissionCheck {
  const parsed = applicationSubmissionSchema.safeParse(input);
  if (parsed.success) return { ok: true, data: parsed.data };
  return {
    ok: false,
    error:
      parsed.error.issues[0]?.message ??
      "Please check your application details and try again.",
  };
}
