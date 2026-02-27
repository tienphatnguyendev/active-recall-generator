import { rm } from 'fs/promises';
import { resolve } from 'path';

async function clearCache() {
  try {
    const nextDir = resolve(process.cwd(), '.next');
    await rm(nextDir, { recursive: true, force: true });
    console.log('[v0] Build cache cleared successfully');
    process.exit(0);
  } catch (error) {
    console.error('[v0] Error clearing cache:', error.message);
    process.exit(1);
  }
}

clearCache();
