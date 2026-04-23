import test from "node:test";
import assert from "node:assert/strict";
import { createHostAdapter } from "../src/platform/hostAdapterFactory";

test("createHostAdapter throws when SQLITE is requested but Electron bridge is unavailable", () => {
  const originalWindow = globalThis.window;

  try {
    Object.defineProperty(globalThis, "window", {
      value: undefined,
      configurable: true,
      writable: true
    });

    assert.throws(
      () => createHostAdapter("SQLITE"),
      /Electron API bridge.*is unavailable/,
      "Should throw when Electron API is missing for SQLITE platform"
    );
  } finally {
    Object.defineProperty(globalThis, "window", {
      value: originalWindow,
      configurable: true,
      writable: true
    });
  }
});

test("createHostAdapter returns IN_MEMORY adapter when IN_MEMORY is requested (no Electron needed)", () => {
  const adapter = createHostAdapter("IN_MEMORY");
  assert.equal(adapter.platform.target, "IN_MEMORY");
});
