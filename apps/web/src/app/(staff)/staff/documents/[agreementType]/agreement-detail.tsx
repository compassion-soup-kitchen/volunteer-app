"use client";

import { useState, useTransition } from "react";
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { StatusBadge } from "@/components/brand/status-badge";
import { StatFigure } from "@/components/brand/stat-figure";
import {
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

function initials(name: string) {
  return (
    name
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0]!.toUpperCase())
      .join("") || "?"
  );
}

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
        <CardHeader>
          <CardTitle>
            {TYPE_LABELS[detail.agreementType] || detail.title}
          </CardTitle>
          <CardDescription>
            Current version: {detail.version} · Updated{" "}
            {new Date(detail.updatedAt).toLocaleDateString("en-NZ", {
              day: "numeric",
              month: "short",
              year: "numeric",
            })}
          </CardDescription>
          {!editing && (
            <CardAction>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setEditing(true)}
              >
                <RiEditLine className="size-3.5" />
                Edit
              </Button>
            </CardAction>
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
                <Label htmlFor="content">Agreement content</Label>
                <Textarea
                  id="content"
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  rows={12}
                  className="tabular-nums text-sm"
                />
              </div>
              <div className="flex gap-2">
                <Button onClick={handleSave} disabled={isPending}>
                  {isPending ? (
                    <RiLoader4Line className="size-3.5 animate-spin" />
                  ) : (
                    <RiSaveLine className="size-3.5" />
                  )}
                  Save changes
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
            <div className="max-h-64 overflow-y-auto rounded-md bg-muted p-4 text-sm/relaxed whitespace-pre-wrap">
              {detail.content}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Signing Status */}
      <Card>
        <CardHeader>
          <CardTitle>Signing status</CardTitle>
        </CardHeader>
        <CardContent>
          {/* Summary */}
          <div className="flex flex-wrap gap-x-8 gap-y-3">
            <div>
              <p className="eyebrow text-[0.62rem] text-muted-foreground">
                Signed v{detail.version}
              </p>
              <StatFigure
                size="md"
                value={signedCurrent.length}
                className="mt-1"
              />
            </div>
            {signedOutdated.length > 0 && (
              <div>
                <p className="eyebrow text-[0.62rem] text-muted-foreground">
                  Outdated
                </p>
                <StatFigure
                  size="md"
                  value={signedOutdated.length}
                  className="mt-1"
                />
              </div>
            )}
            {unsigned.length > 0 && (
              <div>
                <p className="eyebrow text-[0.62rem] text-muted-foreground">
                  Not signed
                </p>
                <StatFigure
                  size="md"
                  value={unsigned.length}
                  className="mt-1"
                />
              </div>
            )}
          </div>
        </CardContent>

        {/* Volunteer list */}
        <div className="border-t border-border">
          <ul className="divide-y divide-border">
            {detail.volunteers.map((vol) => (
              <li key={vol.id} className="flex items-center gap-3 px-5 py-3">
                <span
                  aria-hidden
                  className="flex size-8 shrink-0 items-center justify-center rounded-full bg-secondary text-xs font-semibold text-secondary-foreground"
                >
                  {initials(vol.userName)}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold">
                    {vol.userName}
                  </p>
                  <p className="truncate text-xs text-muted-foreground">
                    {vol.userEmail}
                  </p>
                </div>
                {vol.isCurrent ? (
                  <StatusBadge
                    status="COMPLETED"
                    label={`Signed v${vol.signedVersion}`}
                  />
                ) : vol.signedVersion ? (
                  <StatusBadge
                    status="PENDING"
                    label={`v${vol.signedVersion} · outdated`}
                  />
                ) : (
                  <StatusBadge status="NOT_STARTED" label="Not signed" />
                )}
              </li>
            ))}
          </ul>

          {detail.volunteers.length === 0 && (
            <p className="px-5 py-6 text-center text-sm text-muted-foreground">
              No active volunteers
            </p>
          )}
        </div>
      </Card>
    </div>
  );
}
