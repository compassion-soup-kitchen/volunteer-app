"use client";

import { useState, useTransition, type FormEvent } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Field, FieldControl, FieldLabel } from "@/components/ui/field";
import { Textarea } from "@/components/ui/textarea";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import {
  RiCloseLine,
  RiCheckLine,
  RiLoader4Line,
} from "@remixicon/react";
import { AddressAutocomplete } from "@/components/address-autocomplete";
import { updateVolunteerProfile } from "@/lib/application-actions";

interface ProfileEditFormProps {
  profile: {
    phone: string | null;
    address: string | null;
    emergencyContactName: string | null;
    emergencyContactPhone: string | null;
    emergencyContactRelationship: string | null;
    bio: string | null;
    skills: string[];
  };
}

export function ProfileEditForm({ profile }: ProfileEditFormProps) {
  const [isPending, startTransition] = useTransition();

  const [phone, setPhone] = useState(profile.phone || "");
  const [address, setAddress] = useState(profile.address || "");
  const [ecName, setEcName] = useState(profile.emergencyContactName || "");
  const [ecPhone, setEcPhone] = useState(profile.emergencyContactPhone || "");
  const [ecRelationship, setEcRelationship] = useState(
    profile.emergencyContactRelationship || ""
  );
  const [bio, setBio] = useState(profile.bio || "");

  function handleCancel() {
    setPhone(profile.phone || "");
    setAddress(profile.address || "");
    setEcName(profile.emergencyContactName || "");
    setEcPhone(profile.emergencyContactPhone || "");
    setEcRelationship(profile.emergencyContactRelationship || "");
    setBio(profile.bio || "");
    window.history.back();
  }

  function handleSave(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    startTransition(async () => {
      const result = await updateVolunteerProfile({
        phone,
        address,
        emergencyContactName: ecName,
        emergencyContactPhone: ecPhone,
        emergencyContactRelationship: ecRelationship,
        bio,
      });

      if (result.error) {
        toast.error(result.error);
      } else {
        toast.success("Profile updated");
        window.history.back();
      }
    });
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Edit your details</CardTitle>
        <CardDescription>
          Update your contact and emergency information
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSave} className="space-y-6">
          {/* Contact */}
          <div className="space-y-4">
            <h3 className="eyebrow text-muted-foreground">Contact</h3>
            <Field id="edit-phone">
              <FieldLabel>Phone</FieldLabel>
              <FieldControl>
                <Input
                  type="tel"
                  autoComplete="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                />
              </FieldControl>
            </Field>
            <Field id="edit-address">
              <FieldLabel>Address</FieldLabel>
              <FieldControl>
                <AddressAutocomplete value={address} onChange={setAddress} />
              </FieldControl>
            </Field>
          </div>

          {/* Emergency Contact */}
          <div className="space-y-4 border-t border-border pt-6">
            <h3 className="eyebrow text-muted-foreground">Emergency contact</h3>
            {/* Someone else's details, so the browser shouldn't fill in yours. */}
            <Field id="edit-ec-name">
              <FieldLabel>Name</FieldLabel>
              <FieldControl>
                <Input
                  autoComplete="off"
                  value={ecName}
                  onChange={(e) => setEcName(e.target.value)}
                />
              </FieldControl>
            </Field>
            <Field id="edit-ec-phone">
              <FieldLabel>Phone</FieldLabel>
              <FieldControl>
                <Input
                  type="tel"
                  autoComplete="off"
                  value={ecPhone}
                  onChange={(e) => setEcPhone(e.target.value)}
                />
              </FieldControl>
            </Field>
            <Field id="edit-ec-rel">
              <FieldLabel>Relationship</FieldLabel>
              <FieldControl>
                <Input
                  autoComplete="off"
                  value={ecRelationship}
                  onChange={(e) => setEcRelationship(e.target.value)}
                />
              </FieldControl>
            </Field>
          </div>

          {/* About - named "About you" as on the application, where it was first written */}
          <Field id="edit-bio" className="space-y-4 border-t border-border pt-6">
            <FieldLabel className="eyebrow text-muted-foreground">About you</FieldLabel>
            <FieldControl>
              <Textarea
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                rows={3}
              />
            </FieldControl>
          </Field>

          {/* Actions */}
          <div className="flex items-center justify-end gap-2 border-t border-border pt-5">
            <Button
              type="button"
              variant="outline"
              onClick={handleCancel}
              disabled={isPending}
              className="gap-1.5"
            >
              <RiCloseLine className="size-4" />
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isPending}
              className="gap-1.5"
            >
              {isPending ? (
                <>
                  <RiLoader4Line className="size-4 animate-spin" />
                  Saving…
                </>
              ) : (
                <>
                  <RiCheckLine className="size-4" />
                  Save changes
                </>
              )}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
