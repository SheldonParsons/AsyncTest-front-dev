// URL validation shared by the local Electron Agent bootstrap and runtime
// snapshot client.  The Electron Agent no longer hosts a server-side child;
// keep this small helper independent from the removed control client.

const TRUSTED_PRODUCTION_ORIGINS = new Set([
  "https://www.asynctest.com",
  // Existing internal-only package endpoint. It is intentionally exact and
  // must be removed once the internal deployment is available over HTTPS.
  "http://10.23.224.40",
]);

function isLoopback(hostname) {
  return hostname === "localhost" || hostname === "127.0.0.1" || hostname === "[::1]" || hostname === "::1";
}

/** Validate a backend origin before any Main-process fetch is attempted. */
export function validatedBackendUrl(value, { isDevelopment } = {}) {
  if (value !== undefined && value !== null && typeof value !== "string") {
    throw new Error("vibe_agent_backend_url_invalid");
  }
  const raw = String(value ?? "");
  if (raw !== raw.trim() || raw.includes("\\") || /[\u0000-\u001f\u007f]/u.test(raw)) {
    throw new Error("vibe_agent_backend_url_invalid");
  }
  let parsed;
  try {
    parsed = new URL(raw);
  } catch {
    throw new Error("vibe_agent_backend_url_invalid");
  }
  if (parsed.username || parsed.password || parsed.hash || parsed.search) {
    throw new Error("vibe_agent_backend_url_invalid");
  }
  if (
    parsed.protocol !== "https:"
    && !TRUSTED_PRODUCTION_ORIGINS.has(parsed.origin)
    && !(isDevelopment && parsed.protocol === "http:" && isLoopback(parsed.hostname))
  ) {
    throw new Error("vibe_agent_backend_url_not_allowed");
  }
  return parsed;
}

export const backendUrlConstants = Object.freeze({
  trustedProductionOrigins: [...TRUSTED_PRODUCTION_ORIGINS],
});
