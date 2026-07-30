import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { isSessionAccountActive } from "@/lib/data/session-account";
import { VolunteerNav } from "./volunteer-nav";
import { VolunteerFooter } from "./volunteer-footer";

export default async function VolunteerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();

  if (!session?.user) {
    redirect("/login");
  }

  // Staff should use the staff dashboard
  if (session.user.role === "COORDINATOR" || session.user.role === "ADMIN") {
    redirect("/staff/dashboard");
  }

  // The session is a JWT, so it outlives the account it names - someone
  // deleted or archived mid-session would otherwise keep browsing here. Sent
  // via the sign-out route, not straight to /login: the token still reads as
  // signed in, so the proxy would bounce it back here for ever.
  if (!(await isSessionAccountActive(session.user.id))) {
    redirect("/api/auth/session-ended");
  }

  return (
    <div className="flex min-h-dvh flex-col bg-background pb-16 sm:pb-0">
      <VolunteerNav user={session.user} />
      {/* Editorial column on mobile, opening out to the full width on desktop */}
      <main className="mx-auto w-full max-w-6xl flex-1 px-5 pt-6 pb-4 sm:px-8 sm:pt-8">
        {children}
      </main>
      <VolunteerFooter />
    </div>
  );
}
