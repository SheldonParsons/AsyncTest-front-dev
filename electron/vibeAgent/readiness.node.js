import { spawn } from "node:child_process";
import { randomUUID } from "node:crypto";
import readline from "node:readline";

import {
  PROTOCOL_VERSION,
  identityOf,
  makeFrame,
  parseOutboundLine,
} from "./runtime/protocol.mjs";

const AGENT_CORE_VERSION = "0.84.4";
const PI_AI_VERSION = "0.84.4";
const UNDICI_VERSION = "8.9.0";

function reportBase({ appVersion, platform, arch, timestamp }) {
  return {
    schema: "electron_pi_readiness.v1",
    ok: false,
    app_version: String(appVersion || ""),
    platform: String(platform || process.platform),
    arch: String(arch || process.arch),
    node_version: process.versions.node,
    protocol_version: PROTOCOL_VERSION,
    agent_core_version: null,
    pi_ai_version: null,
    undici_version: null,
    runner_spawn: false,
    dependencies_loaded: false,
    timestamp,
  };
}

export class ElectronPiReadiness {
  constructor({ execPath, runnerPath, env, appVersion, platform, arch, timeoutMs = 3_000 } = {}) {
    this.options = { execPath, runnerPath, env, appVersion, platform, arch, timeoutMs };
    this.promise = undefined;
  }

  check() {
    if (!this.promise) this.promise = this.#run();
    return this.promise;
  }

  async #run() {
    const timestamp = new Date().toISOString();
    const base = reportBase({ ...this.options, timestamp });
    if (!this.options.execPath || !this.options.runnerPath) {
      return { ...base, error_code: "self_check_configuration_invalid" };
    }
    const identity = {
      run_id: `self-check-${randomUUID()}`,
      turn_id: `self-check-${randomUUID()}`,
      request_id: `self-check-${randomUUID()}`,
    };
    const start = makeFrame(identity, "start", {
      operation: "self_check",
      execution_mode: "local",
    });

    return new Promise((resolve) => {
      const child = spawn(this.options.execPath, [this.options.runnerPath], {
        stdio: ["pipe", "pipe", "pipe"],
        windowsHide: true,
        env: this.options.env,
      });
      const output = readline.createInterface({ input: child.stdout, crlfDelay: Infinity, terminal: false });
      let spawned = false;
      let ready;
      let completed = false;
      let errorCode = "";
      let settled = false;
      let forceTimer;
      const timeout = setTimeout(() => {
        errorCode ||= "self_check_timeout";
        child.kill();
        forceTimer = setTimeout(() => child.kill("SIGKILL"), 1_000);
        forceTimer.unref?.();
      }, Number(this.options.timeoutMs) || 3_000);
      timeout.unref?.();

      const finish = (exitCode) => {
        if (settled) return;
        settled = true;
        clearTimeout(timeout);
        clearTimeout(forceTimer);
        output.close();
        const versionsExact = ready
          && ready.agent_core_version === AGENT_CORE_VERSION
          && ready.pi_ai_version === PI_AI_VERSION
          && ready.undici_version === UNDICI_VERSION
          && ready.bridge_protocol_version === PROTOCOL_VERSION;
        const ok = Boolean(spawned && completed && versionsExact && exitCode === 0 && !errorCode);
        resolve({
          ...base,
          ok,
          node_version: String(ready?.node_version || base.node_version),
          protocol_version: Number(ready?.bridge_protocol_version ?? PROTOCOL_VERSION),
          agent_core_version: ready?.agent_core_version ?? null,
          pi_ai_version: ready?.pi_ai_version ?? null,
          undici_version: ready?.undici_version ?? null,
          runner_spawn: spawned,
          dependencies_loaded: Boolean(ready),
          ...(!ok ? { error_code: errorCode || "self_check_failed" } : {}),
        });
      };

      child.once("spawn", () => {
        spawned = true;
        child.stdin.end(`${start.serialized}\n`, "utf8");
      });
      child.once("error", () => {
        errorCode ||= "runner_spawn_failed";
        finish(null);
      });
      child.once("close", (code) => finish(code));
      output.on("line", (line) => {
        if (settled || !line) return;
        try {
          const frame = parseOutboundLine(line, identityOf(start.frame));
          if (frame.type === "ready") ready = frame.payload;
          else if (frame.type === "done") completed = frame.payload.status === "completed";
          else if (frame.type === "error") errorCode ||= String(frame.payload.code || "self_check_failed");
          else errorCode ||= "self_check_unexpected_frame";
        } catch {
          errorCode ||= "self_check_protocol_invalid";
          child.kill();
        }
      });
      child.stderr.on("data", (chunk) => {
        for (const line of chunk.toString("utf8").split(/\r?\n/).filter(Boolean)) {
          const match = /^PI_BRIDGE_ERROR:([A-Za-z0-9_]{1,128})$/.exec(line);
          errorCode ||= match?.[1] || "self_check_stderr_invalid";
        }
      });
    });
  }
}

export const readinessConstants = Object.freeze({
  AGENT_CORE_VERSION,
  PI_AI_VERSION,
  UNDICI_VERSION,
  PROTOCOL_VERSION,
});
