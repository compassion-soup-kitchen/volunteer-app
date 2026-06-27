import { format, parseISO } from 'date-fns';
import { View } from 'react-native';

import { Card, Icon, Text } from '@/components/ui';
import { FontFamily, Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { relativeDay } from '@/lib/format';
import type { TrainingModule, TrainingReadiness as Readiness } from '@/types/models';

/**
 * The Training tab's anchor: a dark "ink" hero that answers the one question
 * that matters most for a volunteer org — *am I trained and ready to help?*
 *
 * It reads top-down: a headline standing (how many core modules are complete),
 * a segmented bar for an at-a-glance sense of progress, then a labelled
 * checklist of every required module so the status is never colour-only. Booked
 * modules read as "on the way", not-yet-started as gentle prompts.
 */
export function TrainingReadiness({ readiness }: { readiness: Readiness }) {
  const { colors } = useTheme();
  const { complete, total, fullyTrained, modules } = readiness;

  return (
    <Card tone="ink" elevated padding={Spacing.xl} style={{ gap: Spacing.lg, overflow: 'hidden' }}>
      {/* Warm brand glow, echoing the Hours hero */}
      <View
        style={{
          position: 'absolute',
          right: -34,
          top: -34,
          width: 140,
          height: 140,
          borderRadius: 70,
          backgroundColor: 'rgba(228,0,43,0.20)',
        }}
      />

      <Text variant="overline" style={{ color: colors.onInkMuted, letterSpacing: 1.4 }}>
        Tō takatūtanga · Your readiness
      </Text>

      <View style={{ flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', gap: Spacing.md }}>
        <View style={{ flex: 1, gap: 2 }}>
          <Text
            style={{
              fontFamily: FontFamily.serif,
              fontSize: 46,
              lineHeight: 50,
              letterSpacing: -0.6,
              color: colors.onInk,
            }}>
            {complete}
            <Text style={{ fontFamily: FontFamily.serif, fontSize: 24, color: colors.onInkMuted }}>{` / ${total}`}</Text>
          </Text>
          <Text variant="callout" style={{ color: colors.onInkMuted }}>
            {fullyTrained ? 'Every core module complete — ka rawe.' : 'core modules complete'}
          </Text>
        </View>

        {fullyTrained ? (
          <View
            style={{
              width: 46,
              height: 46,
              borderRadius: 23,
              backgroundColor: colors.primary,
              alignItems: 'center',
              justifyContent: 'center',
            }}>
            <Icon name="trophy" size={22} raw={colors.primaryForeground} />
          </View>
        ) : null}
      </View>

      {/* Segmented progress — one segment per required module */}
      <View style={{ flexDirection: 'row', gap: 6 }}>
        {modules.map((m) => (
          <Segment key={m.type} state={m.state} />
        ))}
      </View>

      <View style={{ height: 1, backgroundColor: colors.onInk, opacity: 0.12 }} />

      {/* Per-module checklist */}
      <View style={{ gap: Spacing.md }}>
        {modules.map((m) => (
          <ModuleRow key={m.type} module={m} />
        ))}
      </View>
    </Card>
  );
}

function Segment({ state }: { state: TrainingModule['state'] }) {
  const { colors } = useTheme();
  const base = {
    flex: 1,
    height: 6,
    borderRadius: Radius.pill,
    backgroundColor: colors.onInk,
  } as const;

  if (state === 'COMPLETE') return <View style={[base, { backgroundColor: colors.primary }]} />;
  if (state === 'BOOKED') return <View style={[base, { backgroundColor: colors.primary, opacity: 0.42 }]} />;
  return <View style={[base, { opacity: 0.14 }]} />;
}

/** A circular status marker: filled+tick = done, brand ring = booked, faint ring = to do. */
function StatusDot({ state }: { state: TrainingModule['state'] }) {
  const { colors } = useTheme();
  const size = 24;

  if (state === 'COMPLETE') {
    return (
      <View
        style={{
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: colors.primary,
          alignItems: 'center',
          justifyContent: 'center',
        }}>
        <Icon name="checkmark" size={14} raw={colors.primaryForeground} />
      </View>
    );
  }

  if (state === 'BOOKED') {
    return (
      <View
        style={{
          width: size,
          height: size,
          borderRadius: size / 2,
          borderWidth: 2,
          borderColor: colors.primary,
        }}
      />
    );
  }

  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: size / 2,
        borderWidth: 1.5,
        borderColor: colors.onInk,
        opacity: 0.28,
      }}
    />
  );
}

function ModuleRow({ module }: { module: TrainingModule }) {
  const { colors } = useTheme();

  const status =
    module.state === 'COMPLETE' && module.date
      ? `Done · ${format(parseISO(module.date), 'd MMM')}`
      : module.state === 'BOOKED' && module.date
        ? `Booked · ${relativeDay(module.date)}`
        : 'Not booked';

  const dim = module.state === 'NOT_STARTED';

  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: Spacing.md }}>
      <StatusDot state={module.state} />
      <Text variant="bodyStrong" style={{ flex: 1, color: dim ? colors.onInkMuted : colors.onInk }}>
        {module.label}
      </Text>
      <Text variant="caption" style={{ color: colors.onInkMuted }}>
        {status}
      </Text>
    </View>
  );
}
