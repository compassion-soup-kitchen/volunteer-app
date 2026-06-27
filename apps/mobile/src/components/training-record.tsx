import { format, parseISO } from 'date-fns';
import { Fragment } from 'react';
import { View } from 'react-native';

import { trainingTypeMeta } from '@/components/meta';
import { Card, Divider, IconChip, Text } from '@/components/ui';
import { Spacing } from '@/constants/theme';
import type { TrainingHistoryItem } from '@/types/models';

/**
 * The volunteer's completed training, as a quiet record — a proof-of-progress
 * ledger that closes the loop on the readiness hero. Each line pairs a calm
 * success tick with the module and the date it was completed.
 */
export function TrainingRecord({ items }: { items: TrainingHistoryItem[] }) {
  return (
    <Card style={{ gap: Spacing.md }}>
      {items.map((item, i) => (
        <Fragment key={item.id}>
          {i > 0 ? <Divider /> : null}
          <RecordRow item={item} />
        </Fragment>
      ))}
    </Card>
  );
}

function RecordRow({ item }: { item: TrainingHistoryItem }) {
  const meta = trainingTypeMeta(item.type);
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: Spacing.md }}>
      <IconChip icon="checkmark" tone="success" size={36} />
      <View style={{ flex: 1, gap: 2 }}>
        <Text variant="bodyStrong" numberOfLines={1}>
          {item.title}
        </Text>
        <Text variant="caption" color="textTertiary">
          {meta.label}
        </Text>
      </View>
      <Text variant="mono" color="textSecondary">
        {format(parseISO(item.date), 'd MMM yyyy')}
      </Text>
    </View>
  );
}
