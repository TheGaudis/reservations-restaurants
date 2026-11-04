/// <reference types="node" />
// Network isolation of the Node tests (R-33), second barrier: `listenFakeScript` already answers `fetch` in memory;
// this guard refuses any other outbound socket except localhost, so no test can reach the real Apps Script.
import net from "node:net";

type Connect = (this: net.Socket, ...args: unknown[]) => net.Socket;

const LOCAL_HOSTS = new Set(["localhost", "127.0.0.1", "::1"]);
const realConnect = Object.getOwnPropertyDescriptor(net.Socket.prototype, "connect")
  ?.value as Connect;

/** Remote host of a `socket.connect(...)` call; `undefined` for a Unix socket or a pipe. */
function targetHost(args: readonly unknown[]): string | undefined {
  const [first, second] = args;
  const options: unknown = Array.isArray(first) ? first[0] : first;
  if (typeof options === "string") {
    return undefined;
  }
  if (typeof options !== "object" || options === null) {
    return typeof second === "string" ? second : "localhost";
  }
  // Node fills `path: ""` for TCP sockets: only a non-empty path designates a Unix socket.
  if ("path" in options && typeof options.path === "string" && options.path !== "") {
    return undefined;
  }
  return "host" in options && typeof options.host === "string" ? options.host : "localhost";
}

function guardedConnect(this: net.Socket, ...args: unknown[]): net.Socket {
  const host = targetHost(args);
  if (host === undefined || LOCAL_HOSTS.has(host)) return realConnect.apply(this, args);
  process.nextTick(() => {
    this.destroy(new Error(`R-33: outbound connection to ${host} refused in tests`));
  });
  return this;
}

Object.defineProperty(net.Socket.prototype, "connect", {
  value: guardedConnect,
  writable: true,
  configurable: true,
});
