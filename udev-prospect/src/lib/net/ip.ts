import net from "node:net";

function v4ToInt(ip: string): number {
  return ip.split(".").reduce((acc, o) => (acc << 8) + Number(o), 0) >>> 0;
}

const V4_BLOCKS: [string, number][] = [
  ["0.0.0.0", 8], ["10.0.0.0", 8], ["100.64.0.0", 10], ["127.0.0.0", 8], ["169.254.0.0", 16],
  ["172.16.0.0", 12], ["192.0.0.0", 24], ["192.0.2.0", 24], ["192.88.99.0", 24], ["192.168.0.0", 16],
  ["198.18.0.0", 15], ["198.51.100.0", 24], ["203.0.113.0", 24], ["224.0.0.0", 4], ["240.0.0.0", 4],
];

function inV4Block(ip: string, base: string, bits: number): boolean {
  const mask = bits === 0 ? 0 : (~0 << (32 - bits)) >>> 0;
  return (v4ToInt(ip) & mask) === (v4ToInt(base) & mask);
}

function expandV6(ip: string): number[] | null {
  let s = ip.toLowerCase().split("%")[0];
  // IPv4 embutido no fim
  const v4 = s.match(/(\d+\.\d+\.\d+\.\d+)$/);
  if (v4) {
    const n = v4ToInt(v4[1]);
    s = s.replace(v4[1], `${(n >>> 16).toString(16)}:${(n & 0xffff).toString(16)}`);
  }
  const [head, tail] = s.split("::");
  const h = head ? head.split(":") : [];
  const t = tail !== undefined ? (tail ? tail.split(":") : []) : [];
  const fill = s.includes("::") ? 8 - h.length - t.length : 0;
  const parts = [...h, ...Array(fill).fill("0"), ...t];
  if (parts.length !== 8) return null;
  return parts.map((p) => parseInt(p || "0", 16));
}

/** true se o endereço é público e encaminhável na Internet. Bloqueia privados, loopback, link-local, etc. */
export function isPublicAddress(ip: string): boolean {
  const fam = net.isIP(ip);
  if (fam === 4) return !V4_BLOCKS.some(([b, bits]) => inV4Block(ip, b, bits)) && ip !== "255.255.255.255";
  if (fam === 6) {
    const p = expandV6(ip);
    if (!p) return false;
    if (p.every((x) => x === 0)) return false;                       // ::
    if (p.slice(0, 7).every((x) => x === 0) && p[7] === 1) return false; // ::1
    // ::ffff:a.b.c.d (mapeado) e 64:ff9b::/96 (NAT64) → avaliar o IPv4
    if ((p.slice(0, 5).every((x) => x === 0) && p[5] === 0xffff) || (p[0] === 0x64 && p[1] === 0xff9b && p.slice(2, 6).every((x) => x === 0))) {
      const v4 = `${p[6] >> 8}.${p[6] & 255}.${p[7] >> 8}.${p[7] & 255}`;
      return isPublicAddress(v4);
    }
    if ((p[0] & 0xfe00) === 0xfc00) return false; // fc00::/7 ULA
    if ((p[0] & 0xffc0) === 0xfe80) return false; // fe80::/10 link-local
    if ((p[0] & 0xff00) === 0xff00) return false; // multicast
    if (p[0] === 0x2001 && p[1] === 0x0db8) return false; // documentação
    return true;
  }
  return false;
}
