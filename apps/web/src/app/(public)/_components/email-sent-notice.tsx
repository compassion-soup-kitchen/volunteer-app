import { RiMailSendLine } from "@remixicon/react";

/**
 * "Check your inbox" notice shown after we've (maybe) sent someone an email -
 * shared by the forgot-password, register, and resend-verification flows so
 * the moment looks and reads the same everywhere.
 */
export function EmailSentNotice({ message }: { message: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-border bg-secondary/60 p-5">
      <div className="flex items-start gap-3">
        <RiMailSendLine className="mt-0.5 size-5 shrink-0 text-success" />
        <div className="space-y-2 text-sm">
          <p className="font-medium text-foreground">Check your inbox</p>
          <p className="leading-relaxed text-muted-foreground">{message}</p>
          <p className="leading-relaxed text-muted-foreground">
            Nothing after a few minutes? Have a look in your spam folder.
          </p>
        </div>
      </div>
    </div>
  );
}
