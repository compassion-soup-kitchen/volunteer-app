import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { isSessionAccountActive } from "@/lib/data/session-account";
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

  if (session.user.role !== "COORDINATOR" && session.user.role !== "ADMIN") {
    redirect("/dashboard");
  }

  // The session is a JWT, so it outlives the account it names - someone
  // deleted or archived mid-session would otherwise keep working here. Sent
  // via the sign-out route, not straight to /login: the token still reads as
  // signed in, so the proxy would bounce it back here for ever.
  if (!(await isSessionAccountActive(session.user.id))) {
    redirect("/api/auth/session-ended");
  }

  return (
    <div className="min-h-dvh bg-background">
      <StaffNav user={session.user} />
      <div className="lg:pl-64">
        <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-10 lg:py-8">
          {children}
        </main>
      </div>
    </div>
  );
}
