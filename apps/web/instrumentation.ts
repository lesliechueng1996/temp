import { initLogger } from './util/logger';

export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    await initLogger();
  }
}
