// https://docs.expo.dev/guides/using-eslint/
const { defineConfig } = require('eslint/config');
const expoConfig = require('eslint-config-expo/flat');

// Crash reporting and analytics may only run in the parent app (docs/analytics.md).
// Shared packages ship to the family page, so they may never import them.
const appOnlySdks = {
  'no-restricted-imports': [
    'error',
    {
      patterns: [
        {
          group: [
            '@sentry/*', '@aptabase/*', 'firebase', 'firebase/*', '@react-native-firebase/*',
            '@vercel/analytics', '@vercel/speed-insights', 'posthog*', 'mixpanel*', '@amplitude/*',
            '@segment/*', 'react-ga*', '@bugsnag/*', '@datadog/*', 'logrocket*', 'expo-insights',
          ],
          message: 'Not allowed on the family page or in shared packages. Use it in apps/mobile only.',
        },
      ],
    },
  ],
};

module.exports = defineConfig([
  expoConfig,
  {
    ignores: ['**/dist/*', '**/.expo/*', 'design/**', 'design_brainstorm/**', 'supabase/**'],
  },
  {
    // Resolve each app's "@/..." paths from its own tsconfig.
    settings: {
      'import/resolver': {
        typescript: { project: ['apps/*/tsconfig.json'] },
        node: true,
      },
    },
  },
  {
    files: ['apps/family/**', 'packages/**'],
    rules: appOnlySdks,
  },
]);
