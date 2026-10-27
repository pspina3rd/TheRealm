import { defineConfig } from 'vitest/config';

export default defineConfig({
  // Relative base so the build works from any static host or subfolder.
  base: './',
  // Keep bundled files apart from the hand-placed art in public/assets.
  build: { assetsDir: 'static' },
  test: {
    environment: 'node',
    include: ['tests/**/*.test.ts'],
    coverage: {
      provider: 'v8',
      include: ['src/**/*.ts'],
      // Rendering and DOM wiring are verified by running the game, not unit tests.
      exclude: ['src/main.ts', 'src/ui/*.ts', 'src/ui/screens/**', 'src/ui/art/atlas.ts'],
      // The logic layers stay fully line-covered; `npm run coverage` fails if one slips.
      thresholds: Object.fromEntries(
        ['core', 'game', 'battle', 'data', 'world', 'ui/art'].map((dir) => [
          `src/${dir}/**/*.ts`,
          { lines: 100 },
        ]),
      ),
    },
  },
});
