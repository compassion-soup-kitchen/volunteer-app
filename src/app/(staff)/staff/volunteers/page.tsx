import type { Metadata } from "next";
import { getVolunteersList } from "@/lib/staff-actions";
import { VolunteerDirectory } from "./volunteer-directory";

export const metadata: Metadata = {
  title: "Volunteers | Te Pūaroha",
};

export default async function VolunteersPage() {
  const volunteers = await getVolunteersList();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Volunteers</h1>
        <p className="text-muted-foreground">
          Manage your volunteer whānau — te whānau kaimahi tūao
        </p>
      </div>

      <VolunteerDirectory initialVolunteers={volunteers} />
    </div>
  );
}
