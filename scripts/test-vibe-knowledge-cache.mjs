import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { KnowledgeResourceCache } from "../electron/vibeAgent/knowledgeCache.node.js";

const root = await mkdtemp(path.join(os.tmpdir(), "vibe-knowledge-cache-"));
const content = Buffer.from("# 不可变来源\n\n正文", "utf8");
const digest = createHash("sha256").update(content).digest("hex");
const handle = {
  schema: "resource_handle.v1",
  provider_id: "knowledge",
  resource_id: "source-1",
  actor_id: "7",
  project_id: "1137",
  session_id: "session-1",
  media_type: "text/markdown",
  version: digest,
  byte_size: content.length,
  content_hash: digest,
  allowed_capabilities: ["knowledge.download_source"],
  metadata: {},
};
let downloads = 0;
const client = {
  downloadResource: async () => {
    downloads += 1;
    return new Response(content, { headers: {
      "Content-Type": "text/markdown; charset=utf-8",
      "Content-Length": String(content.length),
      "Content-Disposition": "attachment; filename*=UTF-8''knowledge.md",
      ETag: `"${digest}"`,
      "X-Content-Hash": digest,
    } });
  },
};
const cache = new KnowledgeResourceCache({ rootPath: root });

try {
  const first = await cache.materialize({ client, handle, accountId: "7", projectId: "1137", sessionId: "session-1" });
  assert.equal(first, path.join(root, `${digest}.md`));
  assert.deepEqual(await readFile(first), content);
  const reused = await cache.materialize({ client, handle, accountId: "7", projectId: "1137", sessionId: "session-1" });
  assert.equal(reused, first);
  assert.equal(downloads, 1);
  await writeFile(first, "corrupt", "utf8");
  await cache.materialize({ client, handle, accountId: "7", projectId: "1137", sessionId: "session-1" });
  assert.equal(downloads, 2);
  assert.deepEqual(await readFile(first), content);
  await assert.rejects(
    cache.materialize({ client, handle, accountId: "8", projectId: "1137", sessionId: "session-1" }),
    /identity_drift/,
  );
  console.log("PASS: immutable Knowledge source cache verifies identity, headers, bytes and SHA-256");
} finally {
  await rm(root, { recursive: true, force: true });
}
