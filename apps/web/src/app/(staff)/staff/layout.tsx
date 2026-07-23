import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
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
