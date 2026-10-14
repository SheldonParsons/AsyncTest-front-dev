import net from 'node:net';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { randomBytes, randomUUID, timingSafeEqual } from 'node:crypto';
import { atomicWrite, hash } from '../generator/reportStore.node.js';
import { REPORT_VERSION } from '../generator/core/schema.js';

export function reportLaunchConfig({ appPath, executable, bindingPath, identity, packaged, connection }) {
  const scriptPath = path.join(appPath, 'electron', 'mcp', 'asynctest-report-mcp.mjs');
  const command = executable, args = [scriptPath, '--binding', bindingPath, '--installation', identity.installationId, '--profile', identity.profileId];
  const env = { ELECTRON_RUN_AS_NODE: '1' };
  const quote = value => JSON.stringify(String(value));
  const config = { command, args, env };
  return { serverName: 'asynctest-report', version: REPORT_VERSION, transport: 'stdio', runtime: packaged ? 'packaged' : 'development', identity, connection, ...config,
    codexToml: ['[mcp_servers.asynctest-report]', `command = ${quote(command)}`, `args = [${args.map(quote).join(', ')}]`, 'env = { ELECTRON_RUN_AS_NODE = "1" }'].join('\n'),
    stdioJsonText: JSON.stringify({ mcpServers: { 'asynctest-report': config } }, null, 2),
    note: '保持 AsyncTest 桌面运行；报告页面可以关闭。配置绑定当前安装与用户配置，重连时核验当前实例。',
  };
}
export async function startReportBridge(service) {
  const token = randomBytes(32).toString('hex'); const clients = new Set();
  const socketDirectory = await fs.mkdtemp(path.join(os.tmpdir(), 'ast-report-')); await fs.chmod(socketDirectory, 0o700);
  const endpoint = process.platform === 'win32' ? `\\.\pipe\asynctest-report-${hash(service.identity).slice(0, 32)}` : path.join(socketDirectory, 'report.sock');
  const bindingPath = path.join(service.store.root, 'bridge.json');
  const server = net.createServer(socket => {
    socket.setEncoding('utf8');
    clients.add(socket); let buffer = '', authenticated = false, sessionId;
    const send = value => { if (!socket.destroyed) socket.write(`${JSON.stringify(value)}\n`); };
    socket.on('data', chunk => {
      buffer += chunk.toString('utf8'); if (Buffer.byteLength(buffer) > 1024 * 1024) { socket.destroy(); return; }
      let end;
      while ((end = buffer.indexOf('\n')) >= 0) {
        const line = buffer.slice(0, end); buffer = buffer.slice(end + 1);
        void (async () => {
          let message;
          try {
            message = JSON.parse(line);
            if (!authenticated) {
              const provided = Buffer.from(String(message.token || ''));
              if (message.method !== 'handshake' || provided.length !== token.length || !timingSafeEqual(provided, Buffer.from(token)) || ['installationId', 'profileId', 'instanceId'].some(key => message.identity?.[key] !== service.identity[key])) { send({ id: message.id, error: { code: 'PROFILE_MISMATCH', message: '报告实例握手失败' } }); socket.end(); return; }
              authenticated = true; sessionId = `mcp:${randomUUID()}`; service.connect(sessionId); send({ id: message.id, result: { identity: service.identity, sessionId, version: REPORT_VERSION } }); return;
            }
            const result = await service.call(message.method, message.args || {}, { sessionId, desktop: false }); send({ id: message.id, result });
          } catch { send({ id: message?.id || null, error: { code: 'INVALID_PARAMS', message: '报告桥接参数无效' } }); }
        })();
      }
    });
    socket.on('error', () => {}); socket.on('close', () => { clients.delete(socket); if (sessionId) service.disconnect(sessionId); });
  });
  await new Promise((resolve, reject) => { server.once('error', reject); server.listen(endpoint, resolve); });
  if (process.platform !== 'win32') await fs.chmod(endpoint, 0o600);
  await atomicWrite(bindingPath, JSON.stringify({ endpoint, token, identity: service.identity, version: REPORT_VERSION, pid: process.pid }));
  return { bindingPath, close: async () => { for (const client of clients) client.destroy(); await new Promise(resolve => server.close(resolve)); await fs.rm(bindingPath, { force: true }); await fs.rm(socketDirectory, { recursive: true, force: true }); } };
}
