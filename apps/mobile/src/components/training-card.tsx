import { View } from 'react-native';

import { trainingTypeMeta } from '@/components/meta';
import { Badge, Button, Card, Icon, IconChip, Text } from '@/components/ui';
import { Spacing } from '@/constants/theme';
import { formatTimeRange, relativeDay } from '@/lib/format';
import type { TrainingSessionWithDetails } from '@/types/models';

export type TrainingCardProps = {
  session: TrainingSessionWithDetails;
  pending: boolean;
  onToggle: () => void;
};

function Row({ icon, text }: { icon: 'time-outline' | 'location-outline' | 'people-outline'; text: string }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
      <Icon name={icon} size={15} color="textTertiary" />
      <Text variant="caption" color="textSecondary" style={{ flex: 1 }}>
        {text}
      </Text>
    </View>
  );
}

export function TrainingCard({ session, pending, onToggle }: TrainingCardProps) {
  const meta = trainingTypeMeta(session.type);
  const registered = session.userAttendanceStatus === 'REGISTERED';
  const spotsLeft = session.capacity - session.registeredCount;
  const isFull = spotsLeft <= 0 && !registered;

  return (
    <Card style={{ gap: Spacing.md }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: Spacing.md }}>
        <IconChip icon={meta.icon} tone={meta.tone} size={44} />
        <View style={{ flex: 1, gap: 4 }}>
          <Badge label={meta.label} tone={meta.tone} />
          <Text variant="heading" numberOfLines={2}>
            {session.title}
          </Text>
        </View>
      </View>

      <Text variant="body" color="textSecondary" numberOfLines={3}>
        {session.description}
      </Text>

      <View style={{ gap: 6 }}>
        <Row icon="time-outline" text={`${relativeDay(session.date)} · ${formatTimeRange(session.startTime, session.endTime)}`} />
        {session.location ? <Row icon="location-outline" text={session.location} /> : null}
        <Row
          icon="people-outline"
          text={`${session.registeredCount} of ${session.capacity} registered${isFull ? ' · full' : ''}`}
        />
      </View>

      {registered ? (
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: Spacing.md }}>
          <Badge label="You're registered" tone="success" icon="checkmark-circle" />
          <Button title="Cancel" variant="ghost" size="md" fullWidth={false} loading={pending} onPress={onToggle} />
        </View>
      ) : isFull ? (
        <Button title="Session full" variant="secondary" size="md" disabled onPress={() => {}} />
      ) : (
        <Button title="Register" icon="add" size="md" loading={pending} onPress={onToggle} />
      )}
    </Card>
  );
}
