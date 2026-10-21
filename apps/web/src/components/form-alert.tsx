/**
 * Inline destructive alert for form errors - shared by the auth forms and the
 * account page so the error state looks and reads the same everywhere.
 */
export function FormAlert({ children }: { children: React.ReactNode }) {
  return (
    <div
      role="alert"
      className="rounded-md bg-destructive-tint px-3 py-2.5 text-sm text-destructive-tint-foreground"
    >
      {children}
    </div>
  );
}
