"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import {
  RiEditLine,
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
  const [isEditing, setIsEditing] = useState(false);
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
    setIsEditing(false);
  }

  function handleSave() {
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
        setIsEditing(false);
      }
    });
  }

  if (!isEditing) {
    return (
      <div className="flex justify-center">
        <Button
          variant="outline"
          onClick={() => setIsEditing(true)}
          className="gap-1.5"
        >
          <RiEditLine className="size-4" />
          Edit Profile
        </Button>
      </div>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Edit Your Details</CardTitle>
        <CardDescription>
          Update your contact and emergency information
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Contact */}
        <div className="space-y-4">
          <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
            Contact
          </h3>
          <div className="space-y-2">
            <Label htmlFor="edit-phone">Phone</Label>
            <Input
              id="edit-phone"
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="edit-address">Address</Label>
            <AddressAutocomplete
              id="edit-address"
              value={address}
              onChange={setAddress}
            />
          </div>
        </div>

        {/* Emergency Contact */}
        <div className="space-y-4">
          <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
            Emergency Contact
          </h3>
          <div className="space-y-2">
            <Label htmlFor="edit-ec-name">Name</Label>
            <Input
              id="edit-ec-name"
              value={ecName}
              onChange={(e) => setEcName(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="edit-ec-phone">Phone</Label>
            <Input
              id="edit-ec-phone"
              type="tel"
              value={ecPhone}
              onChange={(e) => setEcPhone(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="edit-ec-rel">Relationship</Label>
            <Input
              id="edit-ec-rel"
              value={ecRelationship}
              onChange={(e) => setEcRelationship(e.target.value)}
            />
          </div>
        </div>

        {/* About */}
        <div className="space-y-4">
          <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
            About You
          </h3>
          <div className="space-y-2">
            <Label htmlFor="edit-bio">Bio</Label>
            <Textarea
              id="edit-bio"
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              rows={3}
            />
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-end gap-2">
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
            type="button"
            onClick={handleSave}
            disabled={isPending}
            className="gap-1.5"
          >
            {isPending ? (
              <>
                <RiLoader4Line className="size-4 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <RiCheckLine className="size-4" />
                Save Changes
              </>
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
