// Main-process account binding.  The Renderer may carry an account id in an
// IPC payload, but it is not an authority.  The first successful, server
// authenticated runtime snapshot supplies the authority for this process;
// every later local operation must use the same account.

const ACCOUNT_ID_PATTERN = /^[A-Za-z0-9._:-]{1,160}$/u;

export function normalizeBoundAccountId(value, code = "vibe_agent_account_required") {
  const result = String(value ?? "").trim();
  if (!result || !ACCOUNT_ID_PATTERN.test(result)) throw new Error(code);
  return result;
}

export class AccountBinding {
  constructor() {
    this.boundAccountId = "";
    this.releasingAccountId = "";
  }

  get() {
    return this.boundAccountId;
  }

  bind(value) {
    const accountId = normalizeBoundAccountId(value, "vibe_agent_account_invalid");
    if (this.releasingAccountId) throw new Error("vibe_agent_account_releasing");
    if (this.boundAccountId && this.boundAccountId !== accountId) {
      throw new Error("vibe_agent_account_binding_conflict");
    }
    this.boundAccountId = accountId;
    return accountId;
  }

  require(value) {
    const accountId = normalizeBoundAccountId(value, "vibe_agent_account_required");
    if (this.releasingAccountId) throw new Error("vibe_agent_account_releasing");
    if (!this.boundAccountId) throw new Error("vibe_agent_account_unbound");
    if (this.boundAccountId !== accountId) throw new Error("vibe_agent_account_drift");
    return accountId;
  }

  accept(value) {
    const accountId = normalizeBoundAccountId(value, "vibe_agent_account_required");
    if (this.releasingAccountId) throw new Error("vibe_agent_account_releasing");
    if (this.boundAccountId && this.boundAccountId !== accountId) {
      throw new Error("vibe_agent_account_drift");
    }
    return accountId;
  }

  beginRelease(value) {
    const accountId = normalizeBoundAccountId(value, "vibe_agent_logout_account_required");
    if (this.boundAccountId && this.boundAccountId !== accountId) {
      throw new Error("vibe_agent_account_drift");
    }
    if (this.releasingAccountId && this.releasingAccountId !== accountId) {
      throw new Error("vibe_agent_account_binding_conflict");
    }
    this.releasingAccountId = accountId;
    return accountId;
  }

  isReleasing(value = "") {
    if (!this.releasingAccountId) return false;
    const accountId = String(value ?? "").trim();
    return !accountId || this.releasingAccountId === accountId;
  }

  release(value) {
    const accountId = normalizeBoundAccountId(value, "vibe_agent_logout_account_required");
    if (this.releasingAccountId !== accountId
      || (this.boundAccountId && this.boundAccountId !== accountId)) {
      throw new Error("vibe_agent_account_release_drift");
    }
    this.boundAccountId = "";
    this.releasingAccountId = "";
    return accountId;
  }
}

export const accountBindingConstants = { ACCOUNT_ID_PATTERN };
