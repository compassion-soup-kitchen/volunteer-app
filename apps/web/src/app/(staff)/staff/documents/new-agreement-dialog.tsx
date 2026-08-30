"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { RiAddLine, RiLoader4Line } from "@remixicon/react";
import { createAgreementTemplate } from "@/lib/document-actions";
import type { AgreementTemplateInput } from "@/lib/agreement-templates";
import { AgreementFields } from "./agreement-fields";

const BLANK: AgreementTemplateInput = {
  title: "",
  content: "",
  version: "1.0",
  requiresSignature: true,
};

export function NewAgreementDialog() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [value, setValue] = useState<AgreementTemplateInput>(BLANK);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleSubmit() {
    setError(null);
    startTransition(async () => {
      const result = await createAgreementTemplate(value);
      if ("error" in result && result.error) {
        setError(result.error);
        return;
      }
      toast.success(`${value.title.trim()} added`);
      setOpen(false);
      setValue(BLANK);
      if ("agreementType" in result) {
        router.push(`/staff/documents/${result.agreementType}`);
      }
    });
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (isPending) return;
        setOpen(next);
        if (!next) {
          setValue(BLANK);
          setError(null);
        }
      }}
    >
      <DialogTrigger asChild>
        <Button size="sm">
          <RiAddLine className="size-3.5" />
          Add agreement
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[85vh] gap-0 overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Add an agreement</DialogTitle>
          <DialogDescription>
            It appears in every volunteer&apos;s documents straight away, and
            they confirm they have read it.
          </DialogDescription>
        </DialogHeader>

        <div className="py-5">
          <AgreementFields
            idPrefix="new-agreement"
            value={value}
            onChange={setValue}
            disabled={isPending}
          />
        </div>

        {error ? (
          <p role="alert" className="pb-3 text-sm font-medium text-destructive">
            {error}
          </p>
        ) : null}

        <DialogFooter>
          <Button
            variant="ghost"
            onClick={() => setOpen(false)}
            disabled={isPending}
          >
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={isPending}>
            {isPending ? (
              <RiLoader4Line className="size-3.5 animate-spin" />
            ) : (
              <RiAddLine className="size-3.5" />
            )}
            Add agreement
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
