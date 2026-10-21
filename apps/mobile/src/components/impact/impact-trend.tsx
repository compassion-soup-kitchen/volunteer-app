import { useState } from 'react';
import { View } from 'react-native';
import Svg, { Circle, Defs, Line, LinearGradient, Path, Stop } from 'react-native-svg';

import { Card, Text } from '@/components/ui';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import type { HoursByMonth } from '@/types/models';

const CHART_H = 124;
const PAD_TOP = 20; // headroom for the latest-value label
const PAD_BOTTOM = 6;
const PAD_X = 8; // keeps end dots off the card edge

const AXIS_LABEL_W = 44;

type Pt = { x: number; y: number };

/** What the chart shows, for VoiceOver: `Hours by month. March, 4 hours. April, 6 hours.` */
function trendLabel(data: HoursByMonth[]): string {
  return ['Hours by month', ...data.map((m) => `${m.label}, ${m.hours} ${m.hours === 1 ? 'hour' : 'hours'}`)].join('. ');
}

/** Catmull-Rom → cubic-bézier smoothing for a soft, editorial trend line. */
function smoothPath(p: Pt[]): string {
  if (p.length === 0) return '';
  if (p.length === 1) return `M ${p[0].x} ${p[0].y}`;
  let d = `M ${p[0].x} ${p[0].y}`;
  for (let i = 0; i < p.length - 1; i++) {
    const p0 = p[i - 1] ?? p[i];
    const p1 = p[i];
    const p2 = p[i + 1];
    const p3 = p[i + 2] ?? p2;
    const cp1x = p1.x + (p2.x - p0.x) / 6;
    const cp1y = p1.y + (p2.y - p0.y) / 6;
    const cp2x = p2.x - (p3.x - p1.x) / 6;
    const cp2y = p2.y - (p3.y - p1.y) / 6;
    d += ` C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${p2.x} ${p2.y}`;
  }
  return d;
}

/**
 * Monthly hours as a smooth area chart. The latest month is picked out with a
 * filled marker and its value; a quiet monthly average sits in the header. Far
 * more legible than disconnected, valueless bars — the trend tells the story of
 * a volunteer's rhythm over the year.
 */
export function ImpactTrend({ data }: { data: HoursByMonth[] }) {
  const { colors } = useTheme();
  const [w, setW] = useState(0);

  const n = data.length;
  const max = Math.max(...data.map((m) => m.hours), 1);
  const yMax = max * 1.15; // headroom so the peak never kisses the ceiling
  const avg = Math.round((data.reduce((s, m) => s + m.hours, 0) / n) * 10) / 10;
  const latest = data[n - 1];

  const plotH = CHART_H - PAD_TOP - PAD_BOTTOM;
  const innerW = Math.max(0, w - PAD_X * 2);
  const baseY = PAD_TOP + plotH;

  const pts: Pt[] = data.map((m, i) => ({
    x: PAD_X + (n === 1 ? innerW / 2 : (i / (n - 1)) * innerW),
    y: PAD_TOP + plotH * (1 - m.hours / yMax),
  }));

  const line = smoothPath(pts);
  const last = pts[pts.length - 1];
  const area = w > 0 ? `${line} L ${last.x} ${baseY} L ${pts[0].x} ${baseY} Z` : '';

  // Auto-skip month labels so they never crowd on a narrow phone.
  const step = Math.ceil(n / 6);
  const labelClamp = last ? Math.min(Math.max(last.x - 18, PAD_X), Math.max(PAD_X, w - 40)) : 0;

  return (
    <Card style={{ gap: Spacing.lg }}>
      <View style={{ flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', gap: Spacing.md }}>
        <Text variant="heading">Hours by month</Text>
        <Text variant="caption" color="textSecondary">
          ≈{avg}h / month
        </Text>
      </View>

      <View
        onLayout={(e) => setW(e.nativeEvent.layout.width)}
        accessible
        accessibilityRole="image"
        accessibilityLabel={trendLabel(data)}>
        {w > 0 ? (
          <Svg width={w} height={CHART_H}>
            <Defs>
              <LinearGradient id="trendFill" x1="0" y1="0" x2="0" y2="1">
                <Stop offset="0" stopColor={colors.primary} stopOpacity={0.22} />
                <Stop offset="1" stopColor={colors.primary} stopOpacity={0.02} />
              </LinearGradient>
            </Defs>

            {/* baseline */}
            <Line x1={PAD_X} y1={baseY} x2={w - PAD_X} y2={baseY} stroke={colors.border} strokeWidth={1} />

            <Path d={area} fill="url(#trendFill)" />
            <Path d={line} stroke={colors.primary} strokeWidth={2.5} fill="none" strokeLinecap="round" strokeLinejoin="round" />

            {/* quiet markers on each month, the latest one emphasised */}
            {pts.map((pt, i) => {
              const isLast = i === pts.length - 1;
              return (
                <Circle
                  key={data[i].month}
                  cx={pt.x}
                  cy={pt.y}
                  r={isLast ? 4.5 : 2.5}
                  fill={isLast ? colors.primary : colors.surface}
                  stroke={colors.primary}
                  strokeWidth={isLast ? 2.5 : 1.5}
                />
              );
            })}
          </Svg>
        ) : (
          <View style={{ height: CHART_H }} />
        )}

        {/* Latest-value label, clamped within the chart width. Backed with the
            card's surface so the trend line can't run through the figure. */}
        {w > 0 && last ? (
          <View
            style={{
              position: 'absolute',
              left: labelClamp,
              top: Math.max(0, last.y - PAD_TOP),
              paddingHorizontal: 3,
              borderRadius: 4,
              backgroundColor: colors.surface,
            }}>
            <Text variant="caption" color="primary" weight="bold">
              {latest.hours}h
            </Text>
          </View>
        ) : null}
      </View>

      {/* Month axis: each label centred under its point. At a readable size a
          label is wider than a month's share of the axis, so they are placed,
          not laid out in a row. The invisible "M" gives the axis its height. */}
      <View accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
        <Text variant="overline" maxFontSizeMultiplier={1.3} style={{ opacity: 0 }}>
          M
        </Text>
        {w > 0
          ? data.map((m, i) =>
              i % step === 0 || i === n - 1 ? (
                <Text
                  key={m.month}
                  variant="overline"
                  center
                  numberOfLines={1}
                  maxFontSizeMultiplier={1.3}
                  color={i === n - 1 ? 'primary' : 'textTertiary'}
                  style={{ position: 'absolute', top: 0, left: pts[i].x - AXIS_LABEL_W / 2, width: AXIS_LABEL_W }}>
                  {m.label.slice(0, 3)}
                </Text>
              ) : null,
            )
          : null}
      </View>
    </Card>
  );
}
