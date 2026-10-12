import { createApp } from './app';
import { buildDeps } from './bootstrap';
import { loadConfig } from './config';

const config = loadConfig();
const deps = buildDeps(config);
const app = createApp(deps);

const server = app.listen(config.port, () => {
  deps.logger.info(
    {
      port: config.port,
      ai: deps.ai.providerName,
      model: deps.ai.model,
      emulators: config.firebase.usingEmulators,
      budgetUsd: config.ai.monthlyBudgetUsd,
    },
    'CivicCircle API listening',
  );
});

function shutdown(signal: string) {
  deps.logger.info({ signal }, 'shutting down');
  server.close(() => process.exit(0));
  setTimeout(() => process.exit(1), 10_000).unref();
}
process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));
