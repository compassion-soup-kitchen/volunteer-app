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
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-6 sm:px-6">
        {children}
      </main>
      <VolunteerFooter />
    </div>
  );
}
