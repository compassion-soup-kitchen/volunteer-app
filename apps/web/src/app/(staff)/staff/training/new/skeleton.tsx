import { FormCardSkeleton } from "@/components/brand/page-skeleton";

/** The new-session form while it loads: shared by the page's Suspense and loading.tsx. */
export function TrainingFormSkeleton() {
  return <FormCardSkeleton fields={7} className="max-w-xl" />;
}
