"use client";

import { useState, useTransition, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { IconChip } from "@/components/brand/icon-chip";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  RiUploadLine,
  RiDeleteBinLine,
  RiDownloadLine,
  RiLoader4Line,
  RiFileTextLine,
} from "@remixicon/react";
import { toast } from "sonner";
import {
  uploadDocument,
  deleteDocument,
  getDocumentDownloadUrl,
  type UploadedDocument,
} from "@/lib/document-actions";
import {
  checkUploadFile,
  formatFileSize,
  MAX_UPLOAD_BYTES,
  UPLOAD_ACCEPT_ATTR,
} from "@/lib/uploads";

const TYPE_LABELS: Record<string, string> = {
  POLICY: "Policy",
  TRAINING_MATERIAL: "Training material",
  ID: "ID document",
  MOJ_FORM: "MoJ form",
  SIGNED_AGREEMENT: "Signed agreement",
};

const TYPE_VARIANTS: Record<
  string,
  "info" | "default" | "neutral" | "warning"
> = {
  POLICY: "info",
  TRAINING_MATERIAL: "default",
  ID: "neutral",
  MOJ_FORM: "neutral",
  SIGNED_AGREEMENT: "warning",
};

export function FileManager({ documents }: { documents: UploadedDocument[] }) {
  const [uploading, startUpload] = useTransition();
  const [, startDelete] = useTransition();
  const [downloading, setDownloading] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [docType, setDocType] = useState("POLICY");
  const fileRef = useRef<HTMLInputElement>(null);

  function handleUpload(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const formData = new FormData(form);
    formData.set("type", docType);

    const file = formData.get("file");
    if (!(file instanceof File) || file.size === 0) {
      toast.error("Choose a file to upload.");
      return;
    }

    // Catch the obvious rejections here so nobody waits out an upload that was
    // never going to be accepted. The action re-checks all of this.
    const rejection = checkUploadFile(file);
    if (rejection) {
      toast.error(rejection);
      return;
    }

    startUpload(async () => {
      try {
        const result = await uploadDocument(formData);
        if (result?.error) {
          toast.error(result.error);
          return;
        }
        toast.success(`"${file.name}" uploaded.`);
        form.reset();
        if (fileRef.current) fileRef.current.value = "";
      } catch (err) {
        // A payload past the server's body limit never reaches the action, so
        // this is the only place that failure can be reported.
        console.error("Document upload failed:", err);
        toast.error(
          "The upload failed. If the file is large, try a smaller one."
        );
      }
    });
  }

  function handleDelete(id: string, fileName: string) {
    setDeletingId(null);
    startDelete(async () => {
      try {
        const result = await deleteDocument(id);
        if (result?.error) {
          toast.error(result.error);
          return;
        }
        toast.success(`"${fileName}" deleted.`);
      } catch (err) {
        console.error("Document delete failed:", err);
        toast.error("Something went wrong. Please try again.");
      }
    });
  }

  async function handleDownload(id: string, fileName: string) {
    setDownloading(id);
    try {
      const url = await getDocumentDownloadUrl(id);
      if (!url) {
        toast.error("That file couldn't be opened. Please try again.");
        return;
      }
      const a = document.createElement("a");
      a.href = url;
      a.download = fileName;
      a.target = "_blank";
      a.click();
    } catch (err) {
      console.error("Document download failed:", err);
      toast.error("That file couldn't be opened. Please try again.");
    } finally {
      setDownloading(null);
    }
  }

  return (
    <div className="space-y-4">
      {/* Upload Form */}
      <Card>
        <CardHeader>
          <CardTitle>Upload a document</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleUpload} className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="doc-type">Document type</Label>
                <Select value={docType} onValueChange={setDocType}>
                  <SelectTrigger id="doc-type">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="POLICY">Policy</SelectItem>
                    <SelectItem value="TRAINING_MATERIAL">
                      Training material
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="file">File</Label>
                <Input
                  ref={fileRef}
                  id="file"
                  name="file"
                  type="file"
                  accept={UPLOAD_ACCEPT_ATTR}
                  required
                />
                <p className="text-xs text-muted-foreground">
                  PDF, Word, or image — up to {formatFileSize(MAX_UPLOAD_BYTES)}
                </p>
              </div>
            </div>
            <Button type="submit" disabled={uploading} size="sm">
              {uploading ? (
                <RiLoader4Line className="size-3.5 animate-spin" />
              ) : (
                <RiUploadLine className="size-3.5" />
              )}
              Upload
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Document List */}
      {documents.length > 0 ? (
        <Card>
          <ul className="divide-y divide-border">
            {documents.map((doc) => (
              <li key={doc.id} className="flex items-center gap-3 px-5 py-3">
                <IconChip size="sm">
                  <RiFileTextLine />
                </IconChip>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold">
                    {doc.fileName}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {new Date(doc.uploadedAt).toLocaleDateString("en-NZ", {
                      day: "numeric",
                      month: "short",
                      year: "numeric",
                    })}
                    {doc.uploadedByName && ` · ${doc.uploadedByName}`}
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <Badge
                    variant={TYPE_VARIANTS[doc.type] ?? "neutral"}
                    className="hidden sm:inline-flex"
                  >
                    {TYPE_LABELS[doc.type] || doc.type}
                  </Badge>
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    onClick={() => handleDownload(doc.id, doc.fileName)}
                    disabled={downloading === doc.id}
                    aria-label="Download"
                  >
                    {downloading === doc.id ? (
                      <RiLoader4Line className="size-3.5 animate-spin" />
                    ) : (
                      <RiDownloadLine className="size-3.5" />
                    )}
                  </Button>

                  <AlertDialog
                    open={deletingId === doc.id}
                    onOpenChange={(open) => !open && setDeletingId(null)}
                  >
                    <AlertDialogTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        onClick={() => setDeletingId(doc.id)}
                        aria-label="Delete"
                      >
                        <RiDeleteBinLine className="size-3.5 text-destructive" />
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Delete document</AlertDialogTitle>
                        <AlertDialogDescription>
                          Are you sure you want to delete &ldquo;{doc.fileName}
                          &rdquo;? This cannot be undone.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                          variant="destructive"
                          onClick={() => handleDelete(doc.id, doc.fileName)}
                        >
                          Delete
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </li>
            ))}
          </ul>
        </Card>
      ) : (
        <Card>
          <CardContent className="flex flex-col items-center gap-3 py-10 text-center">
            <IconChip size="lg">
              <RiFileTextLine />
            </IconChip>
            <div>
              <p className="font-serif text-lg font-medium tracking-tight">
                No files yet
              </p>
              <p className="mt-1 text-sm text-muted-foreground">
                Uploaded policies and training material will appear here.
              </p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
