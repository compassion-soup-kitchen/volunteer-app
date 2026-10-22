import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { loadSessionAccess } from "@/lib/data/session-account";
import { MAIN_CONTENT_ID, SkipLink } from "@/components/skip-link";
import { StaffNav } from "./staff-nav";

export default async function StaffLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();

  if (!session?.user) {
    redirect("/login");
  }

  // The session is a JWT, so it outlives the account it names - someone
  // deleted or archived mid-session would otherwise keep working here. Sent
  // via the sign-out route, not straight to /login: the token still reads as
  // signed in, so the proxy would bounce it back here for ever.
  //
  // Asked of whoever the session *belongs to* - the admin, when this is an
  // impersonation - so that deleting the impersonated account doesn't take
  // the admin's own session down with it. See `sessionOwnerId`.
  const access = await loadSessionAccess(session.user);
  if (!access.alive) {
    redirect("/api/auth/session-ended");
  }

  // The role comes from the database, not the token: a coordinator demoted
  // mid-session must lose these pages straight away, not when they next sign
  // in. The proxy deliberately doesn't gate /staff on the token's role for
  // the same reason - it would disagree with this and loop.
  if (access.role !== "COORDINATOR" && access.role !== "ADMIN") {
    redirect("/dashboard");
  }
  const user = { ...session.user, role: access.role };

  return (
    <div className="min-h-dvh bg-background">
      <SkipLink />
      <StaffNav user={user} />
      <div className="lg:pl-64">
        <main
          id={MAIN_CONTENT_ID}
          tabIndex={-1}
          className="mx-auto max-w-7xl px-4 py-6 outline-none sm:px-6 lg:px-10 lg:py-8"
        >
          {children}
        </main>
      </div>
    </div>
  );
}
