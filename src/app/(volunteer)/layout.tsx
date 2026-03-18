import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { VolunteerNav } from "./volunteer-nav";

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
    <div className="min-h-dvh bg-background">
      <VolunteerNav user={session.user} />
      <main className="mx-auto max-w-6xl px-4 py-6 sm:px-6">{children}</main>
    </div>
  );
}
