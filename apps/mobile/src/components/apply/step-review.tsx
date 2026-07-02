import { Pressable, View } from 'react-native';

import { Badge, Card, Icon, Text } from '@/components/ui';
import { Spacing } from '@/constants/theme';
import { AVAILABILITY_DAYS, type ServiceArea } from '@/types/models';

import type { ApplicationDraft } from './draft';

function ReviewSection({
  title,
  onEdit,
  children,
}: {
  title: string;
  onEdit: () => void;
  children: React.ReactNode;
}) {
  return (
    <Card style={{ gap: Spacing.md }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        <Text variant="subheading">{title}</Text>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Edit ${title}`}
          onPress={onEdit}
          hitSlop={8}
          style={({ pressed }) => ({
            flexDirection: 'row',
            alignItems: 'center',
            gap: 1,
            opacity: pressed ? 0.55 : 1,
          })}>
          <Text variant="label" color="accent">
            Edit
          </Text>
          <Icon name="chevron-forward" size={14} color="accent" />
        </Pressable>
      </View>
      {children}
    </Card>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <View style={{ gap: 1 }}>
      <Text variant="caption" color="textTertiary">
        {label}
      </Text>
      <Text variant="callout">{value}</Text>
    </View>
  );
}

export function StepReview({
  draft,
  serviceAreas,
  goToStep,
}: {
  draft: ApplicationDraft;
  serviceAreas: ServiceArea[];
  goToStep: (step: number) => void;
}) {
  const areaNames = serviceAreas
    .filter((a) => draft.serviceAreaIds.includes(a.id))
    .map((a) => a.name);

  const availabilityLines = AVAILABILITY_DAYS.filter(
    (day) => (draft.availability[day] ?? []).length > 0,
  ).map((day) => {
    const label = day.charAt(0).toUpperCase() + day.slice(1);
    return `${label} - ${(draft.availability[day] ?? []).join(', ')}`;
  });

  const bothSigned = Boolean(draft.cocSignature.trim() && draft.safeguardingSignature.trim());

  return (
    <View style={{ gap: Spacing.lg }}>
      <Text variant="body" color="textSecondary">
        One last look before you send it. Tap Edit to change anything.
      </Text>

      <ReviewSection title="Contact" onEdit={() => goToStep(0)}>
        <Row label="Phone" value={draft.phone || 'Not provided'} />
        <Row label="Address" value={draft.address || 'Not provided'} />
        <Row label="Date of birth" value={draft.dateOfBirth || 'Not provided'} />
      </ReviewSection>

      <ReviewSection title="Emergency contact" onEdit={() => goToStep(1)}>
        <Row label="Name" value={draft.emergencyContactName || 'Not provided'} />
        <Row label="Phone" value={draft.emergencyContactPhone || 'Not provided'} />
        <Row label="Relationship" value={draft.emergencyContactRelationship || 'Not provided'} />
      </ReviewSection>

      <ReviewSection title="Availability" onEdit={() => goToStep(2)}>
        {availabilityLines.length > 0 ? (
          <View style={{ gap: 4 }}>
            {availabilityLines.map((line) => (
              <Text key={line} variant="callout">
                {line}
              </Text>
            ))}
          </View>
        ) : (
          <Text variant="callout" color="textTertiary">
            None selected
          </Text>
        )}
      </ReviewSection>

      <ReviewSection title="Interests & skills" onEdit={() => goToStep(3)}>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm }}>
          {areaNames.map((name) => (
            <Badge key={name} label={name} tone="brand" />
          ))}
          {draft.skills.map((skill) => (
            <Badge key={skill} label={skill} tone="navy" />
          ))}
        </View>
        {draft.bio.trim() ? <Row label="About you" value={draft.bio.trim()} /> : null}
      </ReviewSection>

      <ReviewSection title="Agreements" onEdit={() => goToStep(4)}>
        <Badge
          label={bothSigned ? 'Both agreements signed' : 'Signatures missing'}
          tone={bothSigned ? 'success' : 'warning'}
          icon={bothSigned ? 'checkmark-circle-outline' : 'alert-circle-outline'}
        />
      </ReviewSection>
    </View>
  );
}
