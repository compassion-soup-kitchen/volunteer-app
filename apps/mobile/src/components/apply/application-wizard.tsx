import { useMutation } from '@tanstack/react-query';
import { useRef, useState } from 'react';
import { ScrollView, View } from 'react-native';

import { Button, ProgressBar, Text } from '@/components/ui';
import { Spacing } from '@/constants/theme';
import { useToast } from '@/providers/toast-provider';
import { submitApplication } from '@/services/application-service';
import type { ServiceArea } from '@/types/models';

import { type ApplicationDraft, draftToSubmission, EMPTY_DRAFT } from './draft';
import { StepAgreements } from './step-agreements';
import { StepAvailability } from './step-availability';
import { StepContact } from './step-contact';
import { StepEmergency } from './step-emergency';
import { StepInterests } from './step-interests';
import { StepReview } from './step-review';

const STEPS = [
  { key: 'contact', title: 'How can we reach you?' },
  { key: 'emergency', title: 'Your emergency contact' },
  { key: 'availability', title: 'When can you help?' },
  { key: 'interests', title: 'Your mahi' },
  { key: 'agreements', title: 'Our agreements' },
  { key: 'review', title: 'Check & send' },
] as const;

function validateStep(step: number, draft: ApplicationDraft): Record<string, string> {
  const errors: Record<string, string> = {};
  switch (STEPS[step].key) {
    case 'contact':
      if (!draft.phone.trim()) errors.phone = 'Please add a phone number.';
      if (!draft.address.trim()) errors.address = 'Please add your address.';
      break;
    case 'emergency':
      if (!draft.emergencyContactName.trim()) errors.emergencyContactName = 'Please add a name.';
      if (!draft.emergencyContactPhone.trim())
        errors.emergencyContactPhone = 'Please add a phone number.';
      if (!draft.emergencyContactRelationship.trim())
        errors.emergencyContactRelationship = 'Please tell us how you know them.';
      break;
    case 'availability':
      if (Object.values(draft.availability).every((slots) => !slots || slots.length === 0))
        errors.availability = "Pick at least one time you're generally free.";
      break;
    case 'interests':
      if (draft.serviceAreaIds.length === 0)
        errors.interests = 'Choose at least one area of mahi.';
      break;
    case 'agreements':
      if (!draft.cocAgreed) errors.cocAgreed = 'Please agree to the Code of Conduct.';
      else if (!draft.cocSignature.trim())
        errors.cocSignature = 'Please sign by typing your full name.';
      if (!draft.safeguardingAgreed)
        errors.safeguardingAgreed = 'Please agree to the Safeguarding Policy.';
      else if (!draft.safeguardingSignature.trim())
        errors.safeguardingSignature = 'Please sign by typing your full name.';
      break;
    case 'review':
      break;
  }
  return errors;
}

export function ApplicationWizard({
  serviceAreas,
  onSubmitted,
}: {
  serviceAreas: ServiceArea[];
  onSubmitted: () => void;
}) {
  const toast = useToast();
  const scrollRef = useRef<ScrollView>(null);

  const [step, setStep] = useState(0);
  const [draft, setDraft] = useState<ApplicationDraft>(EMPTY_DRAFT);
  const [errors, setErrors] = useState<Record<string, string>>({});

  function patch(update: Partial<ApplicationDraft>) {
    setDraft((d) => ({ ...d, ...update }));
  }

  function goToStep(next: number) {
    setErrors({});
    setStep(next);
    scrollRef.current?.scrollTo({ y: 0, animated: false });
  }

  function goNext() {
    const stepErrors = validateStep(step, draft);
    setErrors(stepErrors);
    if (Object.keys(stepErrors).length > 0) return;
    goToStep(Math.min(step + 1, STEPS.length - 1));
  }

  const submit = useMutation({
    mutationFn: () => submitApplication(draftToSubmission(draft)),
    onSuccess: (result) => {
      if (result.error) {
        toast.error(result.error);
        return;
      }
      toast.success("Tono received - we'll be in touch soon.");
      onSubmitted();
    },
    onError: () => toast.error("Something went wrong. Please try again."),
  });

  const isLast = step === STEPS.length - 1;

  return (
    <ScrollView
      ref={scrollRef}
      keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator={false}
      contentContainerStyle={{ paddingBottom: Spacing.xxxl, gap: Spacing.xl }}>
      {/* Progress header */}
      <View style={{ gap: Spacing.md }}>
        <View style={{ flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between' }}>
          <Text variant="overline" color="primary">
            Step {step + 1} of {STEPS.length}
          </Text>
          {step > 0 ? (
            <Text variant="caption" color="textTertiary">
              {STEPS[step - 1].title} ✓
            </Text>
          ) : null}
        </View>
        <ProgressBar value={(step + 1) / STEPS.length} />
        <Text variant="title">{STEPS[step].title}</Text>
      </View>

      {/* Step content */}
      {STEPS[step].key === 'contact' ? <StepContact draft={draft} patch={patch} errors={errors} /> : null}
      {STEPS[step].key === 'emergency' ? <StepEmergency draft={draft} patch={patch} errors={errors} /> : null}
      {STEPS[step].key === 'availability' ? (
        <StepAvailability draft={draft} patch={patch} errors={errors} />
      ) : null}
      {STEPS[step].key === 'interests' ? (
        <StepInterests draft={draft} patch={patch} errors={errors} serviceAreas={serviceAreas} />
      ) : null}
      {STEPS[step].key === 'agreements' ? (
        <StepAgreements draft={draft} patch={patch} errors={errors} />
      ) : null}
      {STEPS[step].key === 'review' ? (
        <StepReview draft={draft} serviceAreas={serviceAreas} goToStep={goToStep} />
      ) : null}

      {/* Navigation */}
      <View style={{ flexDirection: 'row', gap: Spacing.md, marginTop: Spacing.sm }}>
        {step > 0 ? (
          <View style={{ flex: 1 }}>
            <Button
              title="Back"
              variant="secondary"
              disabled={submit.isPending}
              onPress={() => goToStep(step - 1)}
            />
          </View>
        ) : null}
        <View style={{ flex: 2 }}>
          {isLast ? (
            <Button
              title="Send application"
              icon="paper-plane-outline"
              loading={submit.isPending}
              onPress={() => submit.mutate()}
            />
          ) : (
            <Button title="Continue" icon="arrow-forward-outline" onPress={goNext} />
          )}
        </View>
      </View>
    </ScrollView>
  );
}
