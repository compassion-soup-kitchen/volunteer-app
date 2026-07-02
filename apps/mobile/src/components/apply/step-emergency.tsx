import { View } from 'react-native';

import { Text, TextField } from '@/components/ui';
import { Spacing } from '@/constants/theme';

import type { ApplicationDraft } from './draft';

export function StepEmergency({
  draft,
  patch,
  errors,
}: {
  draft: ApplicationDraft;
  patch: (update: Partial<ApplicationDraft>) => void;
  errors: Record<string, string>;
}) {
  return (
    <View style={{ gap: Spacing.lg }}>
      <Text variant="body" color="textSecondary">
        Someone we can reach if anything happens while you&apos;re with us.
      </Text>
      <TextField
        label="Contact name"
        value={draft.emergencyContactName}
        onChangeText={(emergencyContactName) => patch({ emergencyContactName })}
        placeholder="Full name"
        autoCapitalize="words"
        error={errors.emergencyContactName}
      />
      <TextField
        label="Contact phone"
        value={draft.emergencyContactPhone}
        onChangeText={(emergencyContactPhone) => patch({ emergencyContactPhone })}
        placeholder="021 987 6543"
        keyboardType="phone-pad"
        error={errors.emergencyContactPhone}
      />
      <TextField
        label="Relationship"
        value={draft.emergencyContactRelationship}
        onChangeText={(emergencyContactRelationship) => patch({ emergencyContactRelationship })}
        placeholder="e.g. Partner, parent, friend"
        autoCapitalize="sentences"
        error={errors.emergencyContactRelationship}
      />
    </View>
  );
}
