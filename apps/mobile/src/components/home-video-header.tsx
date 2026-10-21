import { Image } from 'expo-image';
import { useFocusEffect } from 'expo-router';
import { useVideoPlayer, VideoView } from 'expo-video';
import { type ReactNode, useCallback, useEffect } from 'react';
import { AppState, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Layout, Spacing } from '@/constants/theme';
import { useReduceMotion } from '@/hooks/use-reduce-motion';
import { useTheme } from '@/hooks/use-theme';

// Reuses the bundled sign-in footage so the home hero echoes the welcome screen.
const HOME_VIDEO = require('../../assets/video/login-bg.mp4');
// The footage's opening frame: shown instead of it when Reduce Motion is on,
// and beneath it while it loads.
const HOME_POSTER = require('../../assets/video/login-bg-poster.jpg');

/** The scrim's warm ink at a given opacity. */
const INK = (alpha: number) => `rgba(20,16,12,${alpha})`;

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
  // A looping video is exactly the motion Reduce Motion asks apps to drop.
  // Unknown (`null`) counts as reduced, so the footage never starts and stops.
  const reduceMotion = useReduceMotion();
  const animate = reduceMotion === false;

  const player = useVideoPlayer(HOME_VIDEO, (p) => {
    p.loop = true;
    p.muted = true;
    p.audioMixingMode = 'mixWithOthers';
  });

  useEffect(() => {
    if (animate) player.play();
    else player.pause();
  }, [animate, player]);

  // `loop` keeps the footage running, but iOS pauses the player when the screen
  // loses focus or the app backgrounds, and expo-video doesn't auto-resume. Nudge
  // it back to playing whenever the tab regains focus (tab switch, sheet dismiss)…
  useFocusEffect(
    useCallback(() => {
      if (animate) player.play();
    }, [animate, player]),
  );

  // …and whenever the app returns to the foreground.
  useEffect(() => {
    if (!animate) return;
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') player.play();
    });
    return () => sub.remove();
  }, [animate, player]);

  const bg = hexToRgb(colors.background);
  // Visible band height, plus the top safe area we bleed up into behind the island.
  const height = 242 + insets.top;

  return (
    <View style={{ height, marginTop: -insets.top, width: '100%', backgroundColor: colors.inkSurface }}>
      {/* Media + scrims are clipped to the header; the content layer is not, so
          the greeting's drop shadow can render in full without being cropped. */}
      <View
        style={[StyleSheet.absoluteFill, { overflow: 'hidden' }]}
        pointerEvents="none"
        accessibilityElementsHidden
        importantForAccessibility="no-hide-descendants">
        <Image source={HOME_POSTER} style={StyleSheet.absoluteFill} contentFit="cover" />
        {animate ? (
          <VideoView
            player={player}
            style={StyleSheet.absoluteFill}
            contentFit="cover"
            nativeControls={false}
            allowsPictureInPicture={false}
          />
        ) : null}
        {/* Light, even ink wash over the whole band */}
        <View style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(16,14,10,0.16)' }]} />
        {/* The footage is mostly white sky and a cream facade, so the wordmark
            (its "te pūaroha" is a fixed light grey) and the white greeting each
            get a band of ink behind them, with the
            footage left clearer between. The dissolve into the paper canvas
            starts below the greeting, never behind it. */}
        <View
          style={[
            StyleSheet.absoluteFill,
            {
              experimental_backgroundImage: `linear-gradient(180deg, ${INK(0.66)} 0%, ${INK(0.56)} 36%, ${INK(0.24)} 52%, ${INK(0.62)} 70%, ${INK(0.62)} 82%, rgba(${bg},0.9) 95%, rgba(${bg},1) 100%)`,
            },
          ]}
        />
      </View>

      <View
        style={{
          flex: 1,
          paddingTop: insets.top + Spacing.lg,
          // Lifts the greeting clear of the bottom dissolve.
          paddingBottom: Spacing.huge,
          paddingHorizontal: Layout.screenPadding,
          justifyContent: 'space-between',
        }}>
        {children}
      </View>
    </View>
  );
}
