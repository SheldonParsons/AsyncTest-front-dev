import assert from "node:assert/strict";

import { AccountBinding } from "../electron/vibeAgent/accountBinding.node.js";

const binding = new AccountBinding();
assert.equal(binding.get(), "");
assert.throws(() => binding.require("7"), /vibe_agent_account_unbound/);
assert.equal(binding.bind("7"), "7");
assert.equal(binding.bind("7"), "7", "same authenticated account is idempotent");
assert.equal(binding.require("7"), "7");
assert.throws(() => binding.require("8"), /vibe_agent_account_drift/);
assert.throws(() => binding.bind("8"), /vibe_agent_account_binding_conflict/);
assert.throws(() => binding.require(""), /vibe_agent_account_required/);
assert.equal(binding.beginRelease("7"), "7");
assert.throws(() => binding.require("7"), /vibe_agent_account_releasing/);
assert.throws(() => binding.bind("7"), /vibe_agent_account_releasing/);
assert.equal(binding.release("7"), "7");
assert.equal(binding.get(), "");
assert.equal(binding.accept("8"), "8");
assert.equal(binding.bind("8"), "8");

console.log("vibe Main account binding contract: PASS");
