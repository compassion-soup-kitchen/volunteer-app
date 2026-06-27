import { View } from 'react-native';

import { CapacityMeter, availability, spotsLabel } from '@/components/capacity-meter';
import { DateBlock } from '@/components/date-block';
import { trainingTypeMeta } from '@/components/meta';
import { Badge, Button, Card, Icon, type IconName, Text } from '@/components/ui';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { formatTimeRange, relativeDay } from '@/lib/format';
import type { TrainingListItem } from '@/types/models';

export type TrainingCardProps = {
  session: TrainingListItem;
  pending: boolean;
  onRegister: () => void;
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
 * One open training session in the browse list. Reads the way a volunteer
 * decides: *when* (the serif date block), *what* (type + title, with a Required
 * flag when it's an outstanding core module), then the warm one-line "why",
 * *where/when* in detail, and finally how full it is beside the action. Shares
 * the date block and seat meter with the Shifts tab so the two browse
 * experiences feel like one app.
 */
export function TrainingCard({ session, pending, onRegister }: TrainingCardProps) {
  const { colors } = useTheme();
  const meta = trainingTypeMeta(session.type);
  const { full, scarce } = availability(session.registeredCount, session.capacity);

  return (
    <Card style={{ gap: Spacing.md }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: Spacing.lg }}>
        <DateBlock date={session.date} />
        <View style={{ width: 1, alignSelf: 'stretch', backgroundColor: colors.border }} />
        <View style={{ flex: 1, gap: 6 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, flexWrap: 'wrap' }}>
            <Badge label={meta.label} tone={meta.tone} />
            {session.recommended ? <Badge label="Required" tone="warning" icon="alert-circle" /> : null}
            {session.refresher ? <Badge label="Refresher" tone="neutral" /> : null}
          </View>
          <Text variant="heading" numberOfLines={2}>
            {session.title}
          </Text>
        </View>
      </View>

      <Text variant="body" color="textSecondary" numberOfLines={2}>
        {session.description}
      </Text>

      <View style={{ gap: 6 }}>
        <InfoRow icon="time-outline" text={`${relativeDay(session.date)} · ${formatTimeRange(session.startTime, session.endTime)}`} />
        {session.location ? <InfoRow icon="location-outline" text={session.location} /> : null}
      </View>

      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: Spacing.md }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, flex: 1 }}>
          <CapacityMeter taken={session.registeredCount} capacity={session.capacity} />
          <Text variant="caption" weight="bold" color={full ? 'textTertiary' : scarce ? 'primary' : 'textSecondary'}>
            {spotsLabel(session.registeredCount, session.capacity)}
          </Text>
        </View>
        {full ? (
          <Badge label="Full" tone="neutral" />
        ) : (
          <Button title="Register" icon="add" size="md" fullWidth={false} loading={pending} onPress={onRegister} />
        )}
      </View>
    </Card>
  );
}
