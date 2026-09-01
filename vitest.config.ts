import { defineConfig } from 'vitest/config';
import path from 'node:path';

/** Unit tests for the calculation layer and the chart registry. */
export default defineConfig({
  resolve: { alias: { '@': path.resolve(__dirname, './src') } },
  test: {
    environment: 'node',
    // The proxy under api/ is security-relevant, so it is covered too.
    include: ['src/**/*.test.ts', 'api/**/*.test.ts'],
  },
});
