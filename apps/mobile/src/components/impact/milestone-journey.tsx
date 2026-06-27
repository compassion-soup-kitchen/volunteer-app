import { useState } from 'react';
import { View } from 'react-native';

import { Illustration } from '@/components/brand';
import { Card, Icon, IconChip, Text } from '@/components/ui';
import { FontFamily, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { formatDuration } from '@/lib/format';
import type { Milestone } from '@/types/models';

const DOT = 16;

/**
 * The volunteer's milestone journey, redesigned as a rank ladder. Promoted high
 * on the impact screen because the Te Reo honorifics are the motivational spine:
 * a clear current standing, a live bullet toward the next term, and the full
 * ladder of earned / locked ranks at a glance.
 */
export function MilestoneJourney({ milestones, totalHours }: { milestones: Milestone[]; totalHours: number }) {
  const { colors } = useTheme();
  const [w, setW] = useState(0);

  const reached = milestones.filter((m) => m.reached);
  const current = reached.at(-1) ?? null;
  const next = milestones.find((m) => !m.reached) ?? null;
  const floor = current?.hours ?? 0;
  const progress = next ? Math.max(0, Math.min(1, (totalHours - floor) / (next.hours - floor))) : 1;
  const remaining = next ? Math.max(0, next.hours - totalHours) : 0;

  const n = milestones.length;
  const cellW = n > 0 ? w / n : 0;
  const trackLeft = cellW * 0.5;
  const trackSpan = Math.max(0, w - cellW); // first-node centre → last-node centre
  const lastReachedIdx = reached.length - 1; // -1 when none reached yet
  // Position along the track, including partial progress into the live segment.
  const liveFrac = next
    ? Math.max(0, (lastReachedIdx + progress) / (n - 1))
    : 1;
  const fillWidth = Math.max(0, Math.min(1, liveFrac)) * trackSpan;

  return (
    <Card style={{ gap: Spacing.lg }}>
      {/* Header */}
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: Spacing.md }}>
        <IconChip icon="trophy" tone="warning" size={40} />
        <View style={{ flex: 1, gap: 1 }}>
          <Text variant="overline" color="primary">
            Te ara · Your journey
          </Text>
          <Text variant="caption" color="textSecondary">
            {reached.length} of {n} honorifics earned
          </Text>
        </View>
      </View>

      {/* Current standing + live progress */}
      {next ? (
        <View style={{ gap: Spacing.sm }}>
          <View style={{ flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', gap: Spacing.md }}>
            <Text style={{ fontFamily: FontFamily.serif, fontSize: 24, lineHeight: 28, color: colors.text, letterSpacing: -0.3 }}>
              {current?.term ?? 'Te tīmatanga'}
            </Text>
            <Text variant="caption" color="textTertiary">
              {current ? current.label : 'Getting started'}
            </Text>
          </View>
          <Text variant="caption" color="textSecondary">
            <Text variant="caption" color="warning" weight="bold">
              {formatDuration(remaining)}
            </Text>{' '}
            of mahi until{' '}
            <Text variant="caption" color="primary" weight="bold">
              {next.term}
            </Text>{' '}
            ({next.label})
          </Text>
        </View>
      ) : (
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: Spacing.sm }}>
          <Illustration name="rata" height={32} color="success" />
          <View style={{ flex: 1, gap: 1 }}>
            <Text style={{ fontFamily: FontFamily.serif, fontSize: 22, lineHeight: 26, color: colors.text }}>
              {current?.term ?? ''}
            </Text>
            <Text variant="caption" color="success" weight="bold">
              Every honorific earned — tino pai!
            </Text>
          </View>
        </View>
      )}

      {/* The ladder */}
      <View onLayout={(e) => setW(e.nativeEvent.layout.width)} style={{ paddingTop: Spacing.xs }}>
        {w > 0 ? (
          <>
            {/* base + filled track, vertically centred on the dot row */}
            <View
              style={{
                position: 'absolute',
                left: trackLeft,
                width: trackSpan,
                top: Spacing.xs + DOT / 2 - 1,
                height: 2,
                borderRadius: 1,
                backgroundColor: colors.surfaceMuted,
              }}
            />
            <View
              style={{
                position: 'absolute',
                left: trackLeft,
                width: fillWidth,
                top: Spacing.xs + DOT / 2 - 1,
                height: 2,
                borderRadius: 1,
                backgroundColor: colors.warning,
              }}
            />
            <View style={{ flexDirection: 'row' }}>
              {milestones.map((m) => {
                const isReached = m.reached;
                const isNext = next?.hours === m.hours;
                return (
                  <View key={m.hours} style={{ flex: 1, alignItems: 'center', gap: 6 }}>
                    <View
                      style={{
                        width: DOT,
                        height: DOT,
                        borderRadius: DOT / 2,
                        alignItems: 'center',
                        justifyContent: 'center',
                        borderWidth: 2,
                        backgroundColor: isReached ? colors.warning : colors.surface,
                        borderColor: isReached || isNext ? colors.warning : colors.borderStrong,
                      }}>
                      {isReached ? <Icon name="checkmark" size={9} raw={colors.warningForeground} /> : null}
                    </View>
                    <Text
                      variant="overline"
                      center
                      color={isReached ? 'text' : isNext ? 'warning' : 'textTertiary'}
                      style={{ fontSize: 9, letterSpacing: 0.2 }}>
                      {m.hours}
                    </Text>
                  </View>
                );
              })}
            </View>
          </>
        ) : (
          <View style={{ height: DOT + 22 }} />
        )}
      </View>
    </Card>
  );
}
