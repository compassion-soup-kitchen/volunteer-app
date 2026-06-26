import { StyleSheet, type StyleProp, View, type ViewStyle } from 'react-native';

import { useTheme } from '@/hooks/use-theme';

export function Divider({ style }: { style?: StyleProp<ViewStyle> }) {
  const { colors } = useTheme();
  return <View style={[{ height: StyleSheet.hairlineWidth, backgroundColor: colors.border }, style]} />;
}
