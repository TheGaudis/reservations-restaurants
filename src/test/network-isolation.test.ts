import net from "node:net";

import { describe, expect, it } from "vitest";

import { fakeScriptPerTest, SCRIPT_URL } from "@/test/fake-script-server";

// R-33: no Node test reaches the network, whether through fetch or through a raw socket.

const start = fakeScriptPerTest();

describe("network isolation of the Node tests (R-33)", () => {
  it("answers the script's URL in memory and refuses any other host", async () => {
    start();
    await expect(fetch(SCRIPT_URL)).resolves.toHaveProperty("status", 200);
    await expect(fetch("https://example.com/")).rejects.toThrow("R-33");
  });

  it("rejects an aborted request without opening a socket", async () => {
    const fakeScript = start();
    fakeScript.hold();
    const controller = new AbortController();
    const pending = fetch(SCRIPT_URL, { signal: controller.signal });
    controller.abort();
    await expect(pending).rejects.toHaveProperty("name", "AbortError");
  });

  it("refuses a raw socket to a remote host", async () => {
    const socket = net.connect({ host: "script.google.com", port: 443 });
    const error = await new Promise<Error>((resolve) => {
      socket.on("error", resolve);
    });
    expect(error.message).toContain("R-33");
  });
});
