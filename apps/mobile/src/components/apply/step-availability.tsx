import { View } from 'react-native';

import { Chip, Text } from '@/components/ui';
import { Spacing } from '@/constants/theme';
import {
  AVAILABILITY_DAYS,
  AVAILABILITY_SLOTS,
  type AvailabilityDay,
  type AvailabilitySlot,
} from '@/types/models';

import type { ApplicationDraft } from './draft';

const DAY_LABELS: Record<AvailabilityDay, string> = {
  monday: 'Mon',
  tuesday: 'Tue',
  wednesday: 'Wed',
  thursday: 'Thu',
  friday: 'Fri',
  saturday: 'Sat',
  sunday: 'Sun',
};

const SLOT_LABELS: Record<AvailabilitySlot, { title: string; hint: string }> = {
  morning: { title: 'Mornings', hint: 'Prep, food rescue and the lunch build-up' },
  afternoon: { title: 'Afternoons', hint: 'Lunch service and the clean-down' },
  evening: { title: 'Evenings', hint: 'Dinner service' },
};

export function StepAvailability({
  draft,
  patch,
  errors,
}: {
  draft: ApplicationDraft;
  patch: (update: Partial<ApplicationDraft>) => void;
  errors: Record<string, string>;
}) {
  function toggle(day: AvailabilityDay, slot: AvailabilitySlot) {
    const slots = draft.availability[day] ?? [];
    const next = slots.includes(slot) ? slots.filter((s) => s !== slot) : [...slots, slot];
    patch({ availability: { ...draft.availability, [day]: next } });
  }

  return (
    <View style={{ gap: Spacing.xxl }}>
      <Text variant="body" color="textSecondary">
        Tap the days you&apos;re generally free - it helps us find shifts that fit your week. You can
        always change this later.
      </Text>
      {errors.availability ? (
        <Text variant="caption" color="destructive" role="alert">
          {errors.availability}
        </Text>
      ) : null}

      {AVAILABILITY_SLOTS.map((slot) => (
        <View key={slot} style={{ gap: Spacing.md }}>
          <View style={{ gap: 2 }}>
            <Text variant="subheading">{SLOT_LABELS[slot].title}</Text>
            <Text variant="caption" color="textTertiary">
              {SLOT_LABELS[slot].hint}
            </Text>
          </View>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm }}>
            {AVAILABILITY_DAYS.map((day) => (
              <Chip
                key={day}
                label={DAY_LABELS[day]}
                selected={(draft.availability[day] ?? []).includes(slot)}
                onPress={() => toggle(day, slot)}
              />
            ))}
          </View>
        </View>
      ))}
    </View>
  );
}
