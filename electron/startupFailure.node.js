import fs from 'node:fs';
import path from 'node:path';

// Keep startup failures observable even before the first renderer exists.
// Only exception details are recorded; no settings, credentials or report data.
export function writeStartupFailure({ error, stage, version, userDataPath, fallbackDirectory }) {
  const message = String(error?.message || error || '未知启动错误');
  const record = {
    at: new Date().toISOString(), version, platform: process.platform, arch: process.arch, stage,
    error: { name: error?.name || 'Error', code: error?.code || null, message, stack: String(error?.stack || '').slice(0, 24000) },
  };
  const destinations = [
    path.join(userDataPath, 'logs', 'startup-error.log'),
    path.join(fallbackDirectory, 'asynctest-startup-error.log'),
  ];
  for (const logPath of destinations) {
    try {
      fs.mkdirSync(path.dirname(logPath), { recursive: true });
      fs.writeFileSync(logPath, JSON.stringify(record, null, 2), { mode: 0o600 });
      return { message, logPath };
    } catch { /* A read-only user profile must not prevent the error dialog. */ }
  }
  return { message, logPath: null };
}
