"use client";

import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { AgreementTemplateInput } from "@/lib/agreement-templates";

/**
 * The fields behind an agreement, shared by "Add agreement" and the edit form
 * on an agreement's own page - the two must ask for exactly the same things,
 * and they drifted the moment they were written twice.
 */
export function AgreementFields({
  value,
  onChange,
  disabled,
  idPrefix,
  versionHint,
}: {
  value: AgreementTemplateInput;
  onChange: (next: AgreementTemplateInput) => void;
  disabled?: boolean;
  /** Keeps label/input ids unique when both forms are on the page. */
  idPrefix: string;
  versionHint?: string;
}) {
  const set = <K extends keyof AgreementTemplateInput>(
    key: K,
    next: AgreementTemplateInput[K]
  ) => onChange({ ...value, [key]: next });

  return (
    <div className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-[1fr_10rem]">
        <div className="space-y-2">
          <Label htmlFor={`${idPrefix}-title`}>Title</Label>
          <Input
            id={`${idPrefix}-title`}
            value={value.title}
            onChange={(e) => set("title", e.target.value)}
            placeholder="e.g. Health & Safety Policy"
            disabled={disabled}
            maxLength={120}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor={`${idPrefix}-version`}>Version</Label>
          <Input
            id={`${idPrefix}-version`}
            value={value.version}
            onChange={(e) => set("version", e.target.value)}
            placeholder="e.g. 2.0"
            disabled={disabled}
            maxLength={20}
          />
        </div>
      </div>
      {versionHint ? (
        <p className="-mt-1 text-xs text-muted-foreground">{versionHint}</p>
      ) : null}

      <div className="space-y-2">
        <Label htmlFor={`${idPrefix}-content`}>Wording</Label>
        <Textarea
          id={`${idPrefix}-content`}
          value={value.content}
          onChange={(e) => set("content", e.target.value)}
          rows={12}
          disabled={disabled}
          placeholder="What volunteers are agreeing to. Plain language, one commitment per line."
          // `field-sizing-content` on the base Textarea makes it grow with what
          // is typed and ignore `rows`, so an empty box would open at 4rem -
          // too cramped to draft a policy in. The floor gives it room to start.
          className="min-h-64 text-sm/relaxed"
        />
        <p className="text-xs text-muted-foreground">
          Volunteers read this in full before they can confirm.
        </p>
      </div>

      <div className="rounded-lg border border-border bg-secondary/30 p-4">
        <div className="flex items-start gap-3">
          <Checkbox
            id={`${idPrefix}-signature`}
            checked={value.requiresSignature}
            onCheckedChange={(checked) =>
              set("requiresSignature", checked === true)
            }
            disabled={disabled}
            className="mt-1"
          />
          <div className="space-y-1">
            <Label
              htmlFor={`${idPrefix}-signature`}
              className="font-semibold leading-snug"
            >
              Also ask for a signature
            </Label>
            <p className="text-xs text-muted-foreground">
              Everyone ticks to confirm they have read and understood. Turn this
              on as well for the agreements that want a drawn signature on
              record - a code of conduct, say, rather than a short policy note.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
