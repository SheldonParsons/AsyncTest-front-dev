import assert from "node:assert/strict";
import { mkdtemp, rm, rename, stat, utimes, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

import { LocalFileRefs } from "../electron/vibeAgent/localFileRefs.node.js";
import { localFilesContext } from "../electron/vibeAgent/runtime/message_adapter.mjs";

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const temporary = await mkdtemp(path.join(os.tmpdir(), "vibe-local-ref-"));
const source = path.join(temporary, "需求 文档.md");
await writeFile(source, "# 原文件\n\n正文", "utf8");

try {
  const registry = new LocalFileRefs();
  const selection = await registry.admit([source], "renderer-1");
  assert.equal(selection.schema, "vibe_agent_local_file_selection.v1");
  assert.equal(selection.files.length, 1);
  assert.equal(Object.hasOwn(selection.files[0], "absolute_path"), false, "renderer receives only a typed reference");
  await assert.rejects(registry.resolve(selection.files, "renderer-2"), /ref_invalid/);
  const resolved = await registry.resolve(selection.files, "renderer-1");
  assert.equal(resolved[0].absolute_path, source);
  assert.equal(resolved[0].schema, "local_file_ref.v1");
  assert.equal(typeof resolved[0].dev, "number");
  assert.equal(typeof resolved[0].ino, "number");
  const preview = await registry.preview(selection.files[0].ref_id, "renderer-1");
  assert.match(preview.text, /原文件/);

  // A replacement at the same path with the same bytes and mtime is still a
  // different file.  Cold-resume validation must fail closed on the inode.
  const identity = await stat(source);
  const moved = `${source}.old`;
  await rename(source, moved);
  await writeFile(source, "# 原文件\n\n正文", "utf8");
  await utimes(source, identity.atime, identity.mtime);
  await assert.rejects(registry.resolve(selection.files, "renderer-1"), /local_file_changed/);

  const page = readFileSync(path.join(root, "src/views/electron_views/vibe/knowledge/index.vue"), "utf8");
  const localStart = page.slice(page.indexOf("async function sendLocalPiTurn"), page.indexOf("async function sendFoundationTurn"));
  assert.match(localStart, /local_file_refs:\s*localFileRefs/);
  assert.doesNotMatch(localStart, /workspace\.create\(/);
  assert.doesNotMatch(localStart, /admission_token/);
  assert.match(localFilesContext({ local_files: resolved }), /absolute_path|\"path\"/);
  console.log("PASS: native local_file_ref keeps the source in place and new Goals skip AttachmentWorkspace");
} finally {
  await rm(temporary, { recursive: true, force: true });
}
