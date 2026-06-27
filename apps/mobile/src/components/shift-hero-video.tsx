import { useVideoPlayer, VideoView } from 'expo-video';
import { StyleSheet, View } from 'react-native';

// Reuse the bundled sign-in footage as a stand-in hero until shifts carry their
// own photos. Bundled so it's always present, even offline.
const HERO_VIDEO = require('../../assets/video/login-bg.mp4');

/**
 * Full-bleed looping video backdrop for the shift-detail hero. Muted,
 * autoplaying and non-interactive — purely atmospheric. A soft ink gradient
 * sits on top (darker at the edges) so the white hero controls and any
 * overlaid text stay legible over the moving footage.
 */
export function ShiftHeroVideo() {
  const player = useVideoPlayer(HERO_VIDEO, (p) => {
    p.loop = true;
    p.muted = true;
    p.audioMixingMode = 'mixWithOthers';
    p.play();
  });

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      <VideoView
        player={player}
        style={StyleSheet.absoluteFill}
        contentFit="cover"
        nativeControls={false}
        allowsPictureInPicture={false}
      />
      <View
        style={[
          StyleSheet.absoluteFill,
          {
            experimental_backgroundImage:
              'linear-gradient(180deg, rgba(16,14,10,0.50) 0%, rgba(16,14,10,0.12) 30%, rgba(16,14,10,0.28) 100%)',
          },
        ]}
      />
    </View>
  );
}
