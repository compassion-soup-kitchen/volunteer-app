import { View } from 'react-native';

import { IconChip, ProgressBar, Text } from '@/components/ui';
import { Spacing } from '@/constants/theme';
import { formatDuration } from '@/lib/format';
import type { Milestone } from '@/types/models';

/** Shows milestones reached and progress toward the next Te Reo honorific. */
export function MilestoneProgress({ milestones, totalHours }: { milestones: Milestone[]; totalHours: number }) {
  const reached = milestones.filter((m) => m.reached);
  const next = milestones.find((m) => !m.reached) ?? null;
  const floor = reached.length ? reached[reached.length - 1].hours : 0;
  const progress = next ? (totalHours - floor) / (next.hours - floor) : 1;
  const remaining = next ? Math.max(0, next.hours - totalHours) : 0;

  return (
    <View style={{ gap: Spacing.md }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: Spacing.md }}>
        <IconChip icon="trophy" tone="warning" size={40} />
        <View style={{ flex: 1, gap: 1 }}>
          <Text variant="subheading">Milestones</Text>
          <Text variant="caption" color="textSecondary">
            {reached.length} of {milestones.length} reached
            {reached.length ? ` · ${reached[reached.length - 1].term}` : ''}
          </Text>
        </View>
      </View>

      {next ? (
        <View style={{ gap: 6 }}>
          <ProgressBar value={progress} />
          <Text variant="caption" color="textSecondary">
            {formatDuration(remaining)} of mahi until{' '}
            <Text variant="caption" color="primary" style={{ fontWeight: '700' }}>
              {next.term}
            </Text>{' '}
            ({next.label})
          </Text>
        </View>
      ) : (
        <Text variant="caption" color="success" style={{ fontWeight: '700' }}>
          Every milestone reached — tino pai!
        </Text>
      )}
    </View>
  );
}
