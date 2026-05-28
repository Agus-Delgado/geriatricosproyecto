import { writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Obtener commit desde variables de entorno
const commit = 
  process.env.VERCEL_GIT_COMMIT_SHA || 
  process.env.GIT_COMMIT_SHA || 
  process.env.GITHUB_SHA || 
  process.env.BUILD_ID || 
  'dev';

const commitShort = commit.slice(0, 7);
const builtAt = new Date().toISOString();
const buildId = `${builtAt}-${commitShort}`;

const payload = {
  buildId,
  commit,
  commitShort,
  builtAt,
};

const publicDir = join(__dirname, '..', 'public');
const versionPath = join(publicDir, 'version.json');

writeFileSync(versionPath, JSON.stringify(payload, null, 2), 'utf-8');

console.log(`[generate-version] Generated version.json with buildId: ${buildId}`);