import { View } from 'react-native';

import { Kowhaiwhai, Wordmark } from '@/components/brand';
import { Text } from '@/components/ui/text';

export type AuthHeroProps = {
  overline: string;
  title: string;
  subtitle?: string;
};

/** Brand wordmark + welcome copy shared by the sign-in and register screens. */
export function AuthHero({ overline, title, subtitle }: AuthHeroProps) {
  return (
    <View style={{ alignItems: 'center', gap: 18 }}>
      {/* Wordmark with the kōwhaiwhai motif breathing softly behind it */}
      <View style={{ alignItems: 'center', justifyContent: 'center', paddingVertical: 10 }}>
        <View
          pointerEvents="none"
          style={{ position: 'absolute', left: 0, right: 0, top: 0, bottom: 0, alignItems: 'center', justifyContent: 'center' }}>
          <Kowhaiwhai width={236} color="primary" opacity={0.08} />
        </View>
        <Wordmark height={30} />
      </View>

      <View style={{ alignItems: 'center', gap: 6 }}>
        <Text variant="overline" color="primary">
          {overline}
        </Text>
        <Text variant="titleXl" center>
          {title}
        </Text>
        {subtitle ? (
          <Text variant="body" color="textSecondary" center style={{ maxWidth: 320 }}>
            {subtitle}
          </Text>
        ) : null}
      </View>
    </View>
  );
}
