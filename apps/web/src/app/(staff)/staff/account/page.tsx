import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { connection } from "next/server";
import { RiGoogleFill, RiShieldCheckLine } from "@remixicon/react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader } from "@/components/brand/page-header";
import { getMyAccount } from "@/lib/account-actions";
import { DeleteAccountCard } from "@/components/account/delete-account-card";
import { AccountDetailsForm } from "./account-details-form";
import { ChangePasswordForm } from "./change-password-form";

export const metadata: Metadata = {
  title: "My Account | Te Pūaroha",
};

const ROLE_LABELS: Record<string, string> = {
  ADMIN: "Administrator",
  COORDINATOR: "Coordinator",
};

function initialsOf(name: string | null, email: string) {
  const source = name?.trim() || email;
  const parts = source.split(/[\s@.]+/).filter(Boolean).slice(0, 2);
  return parts.map((part) => part[0]?.toUpperCase()).join("") || "TP";
}

/**
 * Self-service account page for coordinators and admins: the one place staff
 * change their own name and password without going through another admin.
 * Route access is already gated to COORDINATOR/ADMIN by the (staff) layout.
 */
export default async function StaffAccountPage() {
  await connection();
  const account = await getMyAccount();

  if (!account) {
    redirect("/login");
  }

  const roleLabel = ROLE_LABELS[account.role] ?? account.role;

  return (
    <div className="max-w-3xl space-y-6">
      <PageHeader
        eyebrow="Tō pūkete · Your account"
        title="My account"
        description="Keep your own details current and manage how you sign in"
      />

      {/* Identity summary — read-only anchor for the forms below */}
      <Card>
        <CardContent className="flex flex-wrap items-center gap-4">
          <Avatar className="size-14">
            {account.image && <AvatarImage src={account.image} alt="" />}
            <AvatarFallback className="text-base font-semibold">
              {initialsOf(account.name, account.email)}
            </AvatarFallback>
          </Avatar>
          <div className="min-w-0 flex-1 space-y-1">
            <p className="truncate font-serif text-xl font-medium tracking-tight">
              {account.name ?? "No name set"}
            </p>
            <p className="truncate text-sm text-muted-foreground">
              {account.email}
            </p>
          </div>
          <Badge variant="neutral" className="gap-1.5">
            <RiShieldCheckLine className="size-3.5" />
            {roleLabel}
          </Badge>
        </CardContent>
      </Card>

      {/* Details */}
      <Card>
        <CardHeader className="border-b">
          <CardTitle>Your details</CardTitle>
        </CardHeader>
        <CardContent>
          <AccountDetailsForm
            name={account.name ?? ""}
            email={account.email}
          />
        </CardContent>
      </Card>

      {/* Password */}
      <Card>
        <CardHeader className="border-b">
          <CardTitle>Password</CardTitle>
        </CardHeader>
        <CardContent>
          {account.hasPassword ? (
            <ChangePasswordForm />
          ) : (
            <div className="space-y-4">
              <div className="flex items-start gap-3 rounded-md bg-muted px-3.5 py-3 text-sm">
                <RiGoogleFill className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
                <div className="space-y-1">
                  <p className="font-medium">You sign in with Google</p>
                  <p className="leading-relaxed text-muted-foreground">
                    There&apos;s no password on this account yet. If you&apos;d
                    like one as a backup, request a reset link and choose a
                    password from the email.
                  </p>
                </div>
              </div>
              <Link
                href="/forgot-password"
                className="inline-block text-sm font-medium text-primary underline-offset-4 hover:underline"
              >
                Set a password by email
              </Link>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Deleting your own account. Last on the page and visually apart, the
          way irreversible things should be - but self-service, because an
          account you can't erase yourself isn't one we should be keeping. */}
      <Card className="border-destructive/40">
        <CardHeader className="border-b">
          <CardTitle className="text-destructive">Delete account</CardTitle>
        </CardHeader>
        <CardContent>
          <DeleteAccountCard />
        </CardContent>
      </Card>
    </div>
  );
}
