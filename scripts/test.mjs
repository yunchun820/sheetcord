import { startVitest } from 'vitest/node';

const watch = process.argv.includes('--watch');
const context = await startVitest('test', [], {
  config: false,
  environment: 'happy-dom',
  include: ['tests/**/*.test.ts'],
  watch,
  restoreMocks: true,
  maxWorkers: 2,
  minWorkers: 1,
}, { configFile: false });
if (!context) process.exitCode = 1;
else if (!watch) await context.close();
