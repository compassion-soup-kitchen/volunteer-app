import { type DimensionValue, View } from 'react-native';

import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

import { Card } from './card';

export function Skeleton({ height = 16, width = '100%', radius = Radius.sm }: { height?: number; width?: DimensionValue; radius?: number }) {
  const { colors } = useTheme();
  return <View style={{ height, width, borderRadius: radius, backgroundColor: colors.surfaceMuted }} />;
}

/** A card-shaped placeholder while a screen's data loads. */
export function SkeletonCard() {
  return (
    <Card style={{ gap: Spacing.md }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: Spacing.md }}>
        <Skeleton height={52} width={54} radius={Radius.md} />
        <View style={{ flex: 1, gap: 8 }}>
          <Skeleton height={16} width="60%" />
          <Skeleton height={12} width="40%" />
        </View>
      </View>
      <Skeleton height={12} width="80%" />
    </Card>
  );
}
