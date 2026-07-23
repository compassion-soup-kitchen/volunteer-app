import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
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
