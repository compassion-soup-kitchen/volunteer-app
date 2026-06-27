import { View } from 'react-native';

import { DateBlock } from '@/components/date-block';
import { trainingTypeMeta } from '@/components/meta';
import { Badge, Button, Card, Icon, type IconName, Text } from '@/components/ui';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { formatTimeRange, relativeDay } from '@/lib/format';
import type { TrainingListItem } from '@/types/models';

export type NextTrainingCardProps = {
  session: TrainingListItem;
  pending: boolean;
  onCancel: () => void;
};

function InfoRow({ icon, text }: { icon: IconName; text: string }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
      <Icon name={icon} size={14} color="textTertiary" />
      <Text variant="caption" color="textSecondary" style={{ flex: 1 }}>
        {text}
      </Text>
    </View>
  );
}

/**
 * The volunteer's booked session — their personal anchor, mirroring the roster
 * rail on the Shifts tab. A brand mission-rail and a relative-day date block
 * answer "when am I next learning?" before they browse for more, and a quiet
 * Cancel keeps the destructive action subordinate to the confirmation.
 */
export function NextTrainingCard({ session, pending, onCancel }: NextTrainingCardProps) {
  const { colors } = useTheme();
  const meta = trainingTypeMeta(session.type);

  return (
    <Card padding={0} style={{ flexDirection: 'row', alignItems: 'stretch', overflow: 'hidden' }}>
      <View style={{ width: 4, backgroundColor: colors.primary }} />

      <View style={{ flex: 1, padding: Spacing.lg, gap: Spacing.md }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: Spacing.lg }}>
          <DateBlock date={session.date} />
          <View style={{ flex: 1, gap: 6 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, flexWrap: 'wrap' }}>
              <Badge label={meta.label} tone={meta.tone} />
              <Badge label="Registered" tone="success" icon="checkmark-circle" />
            </View>
            <Text variant="heading" numberOfLines={2}>
              {session.title}
            </Text>
          </View>
        </View>

        <View style={{ gap: 6 }}>
          <InfoRow icon="time-outline" text={`${relativeDay(session.date)} · ${formatTimeRange(session.startTime, session.endTime)}`} />
          {session.location ? <InfoRow icon="location-outline" text={session.location} /> : null}
        </View>

        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: Spacing.md }}>
          <Text variant="caption" color="textTertiary" style={{ flex: 1 }}>
            {"Kia kaha — we'll see you there."}
          </Text>
          <Button title="Cancel" variant="ghost" size="md" fullWidth={false} loading={pending} onPress={onCancel} />
        </View>
      </View>
    </Card>
  );
}
