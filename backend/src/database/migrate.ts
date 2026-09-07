import { validateConfig } from '../config';
import { initDatabase, pool } from './index';

async function main() {
  validateConfig();
  await initDatabase();
}
if (require.main === module) {
  main().catch(error => { console.error('Migration failed:', error.message); process.exitCode = 1; })
    .finally(() => pool.end());
}
