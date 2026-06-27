import { Fragment } from 'react';
import { View } from 'react-native';

import { serviceAreaMeta } from '@/components/meta';
import { Card, Divider, IconChip, ProgressBar, Text } from '@/components/ui';
import { type Tone } from '@/components/ui/tones';
import { FontFamily, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import type { HoursByArea } from '@/types/models';

/** Map a service-area tone onto the tints the ProgressBar understands. */
const barTint: Record<Tone, 'primary' | 'success' | 'navy' | 'accent' | 'warning'> = {
  brand: 'primary',
  navy: 'navy',
  success: 'success',
  warning: 'warning',
  accent: 'accent',
  neutral: 'primary',
  ink: 'primary',
};

/**
 * Where the volunteer's time goes — a ranked contribution ledger. Each area
 * carries its hours, share of total time, and the shifts / meals behind it, with
 * a tone-matched bar so the split reads at a glance.
 */
export function AreaLedger({ areas, totalHours }: { areas: HoursByArea[]; totalHours: number }) {
  const { colors } = useTheme();
  const max = Math.max(...areas.map((a) => a.hours), 1);

  return (
    <Card style={{ gap: Spacing.lg }}>
      {areas.map((a, i) => {
        const meta = serviceAreaMeta(a.serviceAreaId);
        const share = totalHours > 0 ? Math.round((a.hours / totalHours) * 100) : 0;
        return (
          <Fragment key={a.serviceAreaId}>
            {i > 0 ? <Divider /> : null}
            <View style={{ gap: Spacing.sm }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: Spacing.md }}>
                <IconChip icon={meta.icon} tone={meta.tone} size={34} />
                <View style={{ flex: 1, gap: 1 }}>
                  <Text variant="bodyStrong" numberOfLines={1}>
                    {a.serviceAreaName}
                  </Text>
                  <Text variant="caption" color="textTertiary">
                    {a.shifts} {a.shifts === 1 ? 'shift' : 'shifts'}
                    {a.meals > 0 ? ` · ${a.meals} meals` : ''}
                  </Text>
                </View>
                <View style={{ alignItems: 'flex-end', gap: 1 }}>
                  <Text variant="stat">
                    {a.hours}
                    <Text style={{ fontFamily: FontFamily.serif, fontSize: 13, color: colors.textSecondary }}>h</Text>
                  </Text>
                  <Text variant="caption" color="textTertiary">
                    {share}%
                  </Text>
                </View>
              </View>
              <ProgressBar value={a.hours / max} tint={barTint[meta.tone]} />
            </View>
          </Fragment>
        );
      })}
    </Card>
  );
}
