import path from 'node:path';
import { defineConfig } from 'vitest/config';

/**
 * Unit tests for pure logic under `src/lib` only - no React Native renderer.
 *
 * Component tests would need the RN preset and a native-module mock for every
 * `@expo/ui` / `expo-glass-effect` import, which buys little for a UI that is
 * verified on a simulator anyway. Screens and components stay out of `include`
 * deliberately; the helpers they delegate to are what gets tested.
 */
export default defineConfig({
  test: {
    environment: 'node',
    globals: true,
    include: ['src/lib/**/*.{test,spec}.ts'],
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  // React Native's `__DEV__`, which modules under test read at import time.
  define: {
    __DEV__: 'false',
  },
});
