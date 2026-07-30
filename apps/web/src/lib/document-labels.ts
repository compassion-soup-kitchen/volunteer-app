/**
 * One name per kind of file, wherever it appears.
 *
 * The same document type is listed in the staff file manager, in a volunteer's
 * own resources, and on their record in the directory. The counterpart to
 * `agreementLabel` in `./agreement-labels`, which names signed agreements.
 */
const DOCUMENT_TYPE_LABELS: Record<string, string> = {
  ID: "ID document",
  MOJ_FORM: "MoJ form",
  SIGNED_AGREEMENT: "Signed agreement",
  POLICY: "Policy",
  TRAINING_MATERIAL: "Training material",
};

/**
 * The human name for a document type. A type added to the enum before this copy
 * catches up is sentence-cased rather than shown as a raw SCREAMING_SNAKE value.
 */
export function documentTypeLabel(documentType: string): string {
  const known = DOCUMENT_TYPE_LABELS[documentType];
  if (known) return known;

  const words = documentType.replaceAll("_", " ").toLowerCase();
  return words.charAt(0).toUpperCase() + words.slice(1);
}
