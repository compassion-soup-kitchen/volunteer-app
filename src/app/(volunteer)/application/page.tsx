import type { Metadata } from "next";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { RiFileListLine } from "@remixicon/react";

export const metadata: Metadata = {
  title: "Volunteer Application | Te Pūaroha",
};

export default function ApplicationPage() {
  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">
          Volunteer Application
        </h1>
        <p className="text-muted-foreground">
          Tēnā koe — thank you for your interest in volunteering
        </p>
      </div>

      <Card>
        <CardHeader className="text-center">
          <div className="mx-auto mb-2 flex size-12 items-center justify-center rounded-full bg-primary/10">
            <RiFileListLine className="size-6 text-primary" />
          </div>
          <CardTitle>Application Form Coming Soon</CardTitle>
          <CardDescription className="mx-auto max-w-sm">
            We&apos;re preparing the volunteer application form. Check back
            shortly — we can&apos;t wait to welcome you to the whānau.
          </CardDescription>
        </CardHeader>
        <CardContent />
      </Card>
    </div>
  );
}
