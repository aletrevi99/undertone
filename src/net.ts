import { AsyncLocalStorage } from "node:async_hooks";
import { lookup } from "node:dns/promises";
import { isIP } from "node:net";

export interface NetScope {
  local: boolean;
  trusted: string[];
}
const scope = new AsyncLocalStorage<NetScope>();

export function withNetScope<T>(s: NetScope, fn: () => T): T {
  return scope.run(s, fn);
}

export class BlockedAddress extends Error {
  constructor(host: string) {
    super(`"${host}" is a private or local address, which only an admin's connections may use`);
  }
}

function privateV4(ip: string): boolean {
  const [a, b] = ip.split(".").map(Number);
  return (
    a === 0 ||
    a === 10 ||
    a === 127 ||
    (a === 100 && b >= 64 && b <= 127) ||
    (a === 169 && b === 254) ||
    (a === 172 && b >= 16 && b <= 31) ||
    (a === 192 && b === 168) ||
    (a === 192 && b === 0) ||
    (a === 198 && (b === 18 || b === 19)) ||
    a >= 224
  );
}

export function isPrivateAddress(ip: string): boolean {
  if (isIP(ip) === 4) return privateV4(ip);
  const v = ip.toLowerCase().replace(/^\[|\]$/g, "");
  const mapped = /^::ffff:(\d+\.\d+\.\d+\.\d+)$/.exec(v);
  if (mapped) return privateV4(mapped[1]);
  return (
    v === "::" ||
    v === "::1" ||
    v.startsWith("::ffff:") ||
    /^f[cd]/.test(v) ||
    /^fe[89ab]/.test(v) ||
    v.startsWith("ff") ||
    v.startsWith("64:ff9b:")
  );
}

async function check(url: URL): Promise<void> {
  if (url.protocol !== "http:" && url.protocol !== "https:")
    throw new Error("only http and https addresses can be used");
  const s = scope.getStore();
  if (s?.local || s?.trusted.includes(url.origin)) return;
  const host = url.hostname.replace(/^\[|\]$/g, "");
  if (isIP(host)) {
    if (isPrivateAddress(host)) throw new BlockedAddress(host);
    return;
  }
  if (host === "localhost" || host.endsWith(".localhost") || host.endsWith(".internal"))
    throw new BlockedAddress(host);
  const found = await lookup(host, { all: true }).catch(() => []);
  if (found.some((x) => isPrivateAddress(x.address))) throw new BlockedAddress(host);
}

export async function guardedFetch(input: string, init: RequestInit = {}): Promise<Response> {
  let url = new URL(input);
  let method = (init.method || "GET").toUpperCase();
  let body = init.body;
  const headers = new Headers(init.headers);
  for (let hop = 0; hop < 6; hop++) {
    await check(url);
    const res = await fetch(url, { ...init, method, body, headers, redirect: "manual" });
    const to = res.status >= 300 && res.status < 400 ? res.headers.get("location") : null;
    if (!to) return res;
    await res.body?.cancel().catch(() => {});
    const next = new URL(to, url);
    if (next.origin !== url.origin) {
      headers.delete("authorization");
      headers.delete("cookie");
    }
    if (res.status === 303 || ((res.status === 301 || res.status === 302) && method === "POST")) {
      method = "GET";
      body = undefined;
      headers.delete("content-type");
    }
    url = next;
  }
  throw new Error("too many redirects");
}

export async function readCapped(res: Response, max = 8 * 1024 * 1024): Promise<string> {
  if (Number(res.headers.get("content-length") || 0) > max) {
    await res.body?.cancel().catch(() => {});
    throw new Error("the answer is too large");
  }
  if (!res.body) return "";
  const reader = res.body.getReader();
  const parts: Uint8Array[] = [];
  let size = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    size += value.byteLength;
    if (size > max) {
      await reader.cancel().catch(() => {});
      throw new Error("the answer is too large");
    }
    parts.push(value);
  }
  return Buffer.concat(parts).toString("utf8");
}
