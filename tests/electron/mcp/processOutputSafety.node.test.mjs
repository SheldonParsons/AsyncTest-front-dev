import assert from 'node:assert/strict';
import { EventEmitter } from 'node:events';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';

import { createRecentStore } from '../../../electron/amind/recentStore.js';
import {
  installProcessOutputSafety,
  isClosedProcessOutputError,
} from '../../../electron/processOutputSafety.node.js';

test('closed stdout and stderr pipes are treated as normal process shutdown', () => {
  const stdout = new EventEmitter();
  const stderr = new EventEmitter();
  const closedStreams = [];
  const safety = installProcessOutputSafety({
    stdout,
    stderr,
    onBrokenPipe: ({ streamName }) => closedStreams.push(streamName),
  });

  stdout.emit('error', Object.assign(new Error('broken pipe'), { code: 'EPIPE' }));
  stderr.emit('error', Object.assign(new Error('stream destroyed'), { code: 'ERR_STREAM_DESTROYED' }));

  assert.deepEqual(closedStreams, ['stdout', 'stderr']);
  assert.equal(safety.hasClosedOutput(), true);
  assert.equal(isClosedProcessOutputError({ code: 'ERR_STREAM_WRITE_AFTER_END' }), true);
  assert.equal(isClosedProcessOutputError({ code: 'EACCES' }), false);
  safety.dispose();
});

test('recent entries without a preview stay valid without writing warnings', async () => {
  const userDataPath = await fs.mkdtemp(path.join(os.tmpdir(), 'asynctest-recent-store-'));
  const store = createRecentStore({ userDataPath });
  const originalWarn = console.warn;
  const warnings = [];
  console.warn = (...args) => warnings.push(args);

  try {
    await store.add(path.join(userDataPath, 'missing-preview.amind'), { title: 'Missing preview' });
    const entries = await store.loadRendererEntries();
    assert.equal(entries.length, 1);
    assert.equal(entries[0].previewUrl, null);
    assert.deepEqual(warnings, []);
  } finally {
    console.warn = originalWarn;
    await fs.rm(userDataPath, { recursive: true, force: true });
  }
});

test('a new development profile can migrate recent files from the production profile', async () => {
  const rootPath = await fs.mkdtemp(path.join(os.tmpdir(), 'asynctest-recent-migration-'));
  const productionPath = path.join(rootPath, 'async-test');
  const developmentPath = path.join(rootPath, 'async-test-dev');
  const productionStore = createRecentStore({ userDataPath: productionPath });
  const developmentStore = createRecentStore({
    userDataPath: developmentPath,
    fallbackUserDataPaths: [productionPath],
  });

  try {
    const existingPath = path.join(rootPath, 'existing.amind');
    const developmentPathEntry = path.join(rootPath, 'development.amind');
    await productionStore.add(existingPath, { title: 'Existing' });

    assert.deepEqual(await developmentStore.load(), [existingPath]);
    await productionStore.remove(existingPath);
    assert.deepEqual(await developmentStore.load(), [existingPath]);

    await developmentStore.add(developmentPathEntry, { title: 'Development' });
    assert.deepEqual(await developmentStore.load(), [developmentPathEntry, existingPath]);
  } finally {
    await fs.rm(rootPath, { recursive: true, force: true });
  }
});
