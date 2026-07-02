import { View } from 'react-native';

import { TextField } from '@/components/ui';
import { Spacing } from '@/constants/theme';

import type { ApplicationDraft } from './draft';

export function StepContact({
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
      <TextField
        label="Phone number"
        value={draft.phone}
        onChangeText={(phone) => patch({ phone })}
        placeholder="021 123 4567"
        keyboardType="phone-pad"
        autoComplete="tel"
        textContentType="telephoneNumber"
        error={errors.phone}
      />
      <TextField
        label="Home address"
        value={draft.address}
        onChangeText={(address) => patch({ address })}
        placeholder="Street, suburb, city"
        autoComplete="street-address"
        textContentType="fullStreetAddress"
        error={errors.address}
      />
      <TextField
        label="Date of birth"
        value={draft.dateOfBirth}
        onChangeText={(dateOfBirth) => patch({ dateOfBirth })}
        placeholder="DD/MM/YYYY"
        keyboardType="numbers-and-punctuation"
        error={errors.dateOfBirth}
        hint="Optional - helps us match you with appropriate mahi."
      />
    </View>
  );
}
