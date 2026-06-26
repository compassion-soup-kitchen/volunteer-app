import { View } from 'react-native';

import { Icon } from '@/components/ui/icon';
import { Text } from '@/components/ui/text';
import { Shadows } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

export type AuthHeroProps = {
  overline: string;
  title: string;
  subtitle?: string;
};

/** Brand mark + welcome copy shared by the sign-in and register screens. */
export function AuthHero({ overline, title, subtitle }: AuthHeroProps) {
  const { colors } = useTheme();
  return (
    <View style={{ alignItems: 'center', gap: 16 }}>
      <View
        style={{
          width: 76,
          height: 76,
          borderRadius: 999,
          backgroundColor: colors.primary,
          alignItems: 'center',
          justifyContent: 'center',
          boxShadow: Shadows.primary,
        }}>
        <Icon name="heart" size={36} raw={colors.primaryForeground} />
      </View>
      <View style={{ alignItems: 'center', gap: 4 }}>
        <Text variant="overline" color="primary">
          {overline}
        </Text>
        <Text variant="titleXl" center>
          {title}
        </Text>
        {subtitle ? (
          <Text variant="body" color="textSecondary" center style={{ maxWidth: 300 }}>
            {subtitle}
          </Text>
        ) : null}
      </View>
    </View>
  );
}
