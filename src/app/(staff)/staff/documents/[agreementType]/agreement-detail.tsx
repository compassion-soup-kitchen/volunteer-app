"use client";

import { useState, useTransition } from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import {
  RiCheckLine,
  RiAlertLine,
  RiCloseLine,
  RiEditLine,
  RiSaveLine,
  RiLoader4Line,
} from "@remixicon/react";
import {
  updateAgreementTemplate,
  type AgreementDetail,
} from "@/lib/document-actions";

const TYPE_LABELS: Record<string, string> = {
  CODE_OF_CONDUCT: "Te Tikanga — Code of Conduct",
  SAFEGUARDING: "Safeguarding Policy",
  VOLUNTEER_APPLICATION: "Volunteer Application Agreement",
  POLICIES: "General Policies",
};

export function AgreementDetailView({
  detail,
}: {
  detail: AgreementDetail;
}) {
  const [editing, setEditing] = useState(false);
  const [title, setTitle] = useState(detail.title);
  const [content, setContent] = useState(detail.content);
  const [version, setVersion] = useState(detail.version);
  const [isPending, startTransition] = useTransition();

  function handleSave() {
    startTransition(async () => {
      await updateAgreementTemplate(detail.agreementType, {
        title,
        content,
        version,
      });
      setEditing(false);
    });
  }

  const signedCurrent = detail.volunteers.filter((v) => v.isCurrent);
  const signedOutdated = detail.volunteers.filter(
    (v) => v.signedVersion && !v.isCurrent
  );
  const unsigned = detail.volunteers.filter((v) => !v.signedVersion);

  return (
    <div className="space-y-6">
      {/* Template Card */}
      <Card>
        <CardHeader className="flex-row items-start justify-between gap-4">
          <div>
            <CardTitle>
              {TYPE_LABELS[detail.agreementType] || detail.title}
            </CardTitle>
            <p className="mt-1 text-sm text-muted-foreground">
              Current version: {detail.version} · Updated{" "}
              {new Date(detail.updatedAt).toLocaleDateString("en-NZ", {
                day: "numeric",
                month: "short",
                year: "numeric",
              })}
            </p>
          </div>
          {!editing && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setEditing(true)}
            >
              <RiEditLine className="mr-1.5 size-3.5" />
              Edit
            </Button>
          )}
        </CardHeader>
        <CardContent>
          {editing ? (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="title">Title</Label>
                <Input
                  id="title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                />
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="version">Version</Label>
                  <Input
                    id="version"
                    value={version}
                    onChange={(e) => setVersion(e.target.value)}
                    placeholder="e.g. 2.0"
                  />
                  <p className="text-xs text-muted-foreground">
                    Changing the version will require all volunteers to re-sign
                  </p>
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="content">Agreement Content</Label>
                <Textarea
                  id="content"
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  rows={12}
                  className="font-mono text-sm"
                />
              </div>
              <div className="flex gap-2">
                <Button onClick={handleSave} disabled={isPending}>
                  {isPending ? (
                    <RiLoader4Line className="mr-1.5 size-3.5 animate-spin" />
                  ) : (
                    <RiSaveLine className="mr-1.5 size-3.5" />
                  )}
                  Save Changes
                </Button>
                <Button
                  variant="ghost"
                  onClick={() => {
                    setTitle(detail.title);
                    setContent(detail.content);
                    setVersion(detail.version);
                    setEditing(false);
                  }}
                  disabled={isPending}
                >
                  Cancel
                </Button>
              </div>
            </div>
          ) : (
            <div className="max-h-64 overflow-y-auto rounded-md border border-border bg-muted/30 p-4 text-sm leading-relaxed whitespace-pre-wrap">
              {detail.content}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Signing Status */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Signing Status</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Summary */}
          <div className="flex flex-wrap gap-4">
            <div className="flex items-center gap-1.5">
              <RiCheckLine className="size-4 text-green-600" />
              <span className="text-sm font-medium">
                {signedCurrent.length} signed (v{detail.version})
              </span>
            </div>
            {signedOutdated.length > 0 && (
              <div className="flex items-center gap-1.5">
                <RiAlertLine className="size-4 text-amber-600" />
                <span className="text-sm font-medium">
                  {signedOutdated.length} outdated
                </span>
              </div>
            )}
            {unsigned.length > 0 && (
              <div className="flex items-center gap-1.5">
                <RiCloseLine className="size-4 text-muted-foreground" />
                <span className="text-sm font-medium">
                  {unsigned.length} not signed
                </span>
              </div>
            )}
          </div>

          <Separator />

          {/* Volunteer list */}
          <div className="space-y-2">
            {detail.volunteers.map((vol) => (
              <div
                key={vol.id}
                className="flex items-center justify-between rounded-md border border-border p-3"
              >
                <div>
                  <p className="text-sm font-medium">{vol.userName}</p>
                  <p className="text-xs text-muted-foreground">
                    {vol.userEmail}
                  </p>
                </div>
                {vol.isCurrent ? (
                  <Badge
                    variant="outline"
                    className="text-xs text-green-600 border-green-200"
                  >
                    <RiCheckLine className="mr-1 size-3" />
                    v{vol.signedVersion}
                  </Badge>
                ) : vol.signedVersion ? (
                  <Badge
                    variant="outline"
                    className="text-xs text-amber-600 border-amber-200"
                  >
                    <RiAlertLine className="mr-1 size-3" />
                    v{vol.signedVersion} (outdated)
                  </Badge>
                ) : (
                  <Badge variant="outline" className="text-xs">
                    Not signed
                  </Badge>
                )}
              </div>
            ))}

            {detail.volunteers.length === 0 && (
              <p className="py-4 text-center text-sm text-muted-foreground">
                No active volunteers
              </p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
