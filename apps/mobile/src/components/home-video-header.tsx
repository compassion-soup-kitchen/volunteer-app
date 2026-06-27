import { useVideoPlayer, VideoView } from 'expo-video';
import { type ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Layout, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

// Reuses the bundled sign-in footage so the home hero echoes the welcome screen.
const HOME_VIDEO = require('../../assets/video/login-bg.mp4');

/** `#FBF7F2` → `251, 247, 242` so the fade can resolve to the live theme background. */
function hexToRgb(hex: string): string {
  const h = hex.replace('#', '');
  const full = h.length === 3 ? h.split('').map((c) => c + c).join('') : h;
  const n = parseInt(full, 16);
  return `${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}`;
}

/**
 * A full-bleed looping video band at the top of the dashboard. The footage runs
 * edge-to-edge and is anchored to the very top of the screen — it bleeds up
 * behind the status bar and Dynamic Island so the island appears to float over
 * the moving footage. An ink scrim keeps text legible and a gradient dissolves
 * the bottom of the video into the page's paper canvas, so it reads as a soft,
 * atmospheric header rather than a hard-edged banner. Overlaid content (wordmark,
 * greeting) is passed as children in light text and padded clear of the island.
 *
 * The enclosing Screen renders this band as the first item in a full-screen
 * ScrollView whose content is inset below the safe area. We negate that inset
 * with `marginTop` and add it back to the height + inner padding, so the video
 * fills the area under the island while the greeting stays exactly in place.
 */
export function HomeVideoHeader({ children }: { children: ReactNode }) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();

  const player = useVideoPlayer(HOME_VIDEO, (p) => {
    p.loop = true;
    p.muted = true;
    p.audioMixingMode = 'mixWithOthers';
    p.play();
  });

  const bg = hexToRgb(colors.background);
  // Visible band height, plus the top safe area we bleed up into behind the island.
  const height = 218 + insets.top;

  return (
    <View style={{ height, marginTop: -insets.top, width: '100%', backgroundColor: colors.inkSurface }}>
      {/* Media + scrims are clipped to the header; the content layer is not, so
          the greeting's drop shadow can render in full without being cropped. */}
      <View style={[StyleSheet.absoluteFill, { overflow: 'hidden' }]} pointerEvents="none">
        <VideoView
          player={player}
          style={StyleSheet.absoluteFill}
          contentFit="cover"
          nativeControls={false}
          allowsPictureInPicture={false}
        />
        {/* Light, even ink wash — keeps text legible without hiding the footage */}
        <View style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(16,14,10,0.16)' }]} />
        {/* Gentle top darken for the wordmark; bottom fade dissolves into the paper canvas */}
        <View
          style={[
            StyleSheet.absoluteFill,
            {
              experimental_backgroundImage: `linear-gradient(180deg, rgba(20,16,12,0.24) 0%, rgba(20,16,12,0.04) 30%, rgba(${bg},0) 56%, rgba(${bg},0.88) 87%, rgba(${bg},1) 100%)`,
            },
          ]}
        />
      </View>

      <View
        style={{
          flex: 1,
          paddingTop: insets.top + Spacing.lg,
          paddingBottom: Spacing.xxl,
          paddingHorizontal: Layout.screenPadding,
          justifyContent: 'space-between',
        }}>
        {children}
      </View>
    </View>
  );
}
