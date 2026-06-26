import { useVideoPlayer, VideoView } from 'expo-video';
import { StyleSheet, View } from 'react-native';

// Bundled so the sign-in backdrop is always present, even offline.
const LOGIN_VIDEO = require('../../assets/video/login-bg.mp4');

/**
 * Full-bleed looping video backdrop for the auth screens. Muted, autoplaying and
 * non-interactive — purely atmospheric. A layered ink scrim sits on top so the
 * liquid-glass card and its light text stay legible over the moving footage.
 */
export function AuthVideoBackground() {
  const player = useVideoPlayer(LOGIN_VIDEO, (p) => {
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
      {/* Ink scrim — darker at the edges for vignette and contrast */}
      <View style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(16,14,10,0.42)' }]} />
      <View
        style={[
          StyleSheet.absoluteFill,
          {
            experimental_backgroundImage:
              'linear-gradient(180deg, rgba(16,14,10,0.55) 0%, rgba(16,14,10,0.15) 32%, rgba(16,14,10,0.35) 70%, rgba(16,14,10,0.82) 100%)',
          },
        ]}
      />
    </View>
  );
}
