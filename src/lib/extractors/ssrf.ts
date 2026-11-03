import dns from 'node:dns/promises';
import net from 'node:net';

export interface ValidatedTarget {
  url: URL;
  pinnedIp: string;
  family: 4 | 6;
}

/**
 * Checks if an IPv4 address belongs to private, loopback, link-local, carrier-grade NAT,
 * benchmark, multicast, broadcast, or reserved ranges.
 */
export function isPrivateIPv4(ip: string): boolean {
  const parts = ip.split('.').map((p) => parseInt(p, 10));
  if (parts.length !== 4 || parts.some((p) => isNaN(p) || p < 0 || p > 255)) {
    return true; // Malformed or abnormal IPv4 is rejected
  }

  const [b0, b1, b2] = parts;

  // 0.0.0.0/8 (Current network / "this" host RFC 1122)
  if (b0 === 0) return true;
  // 10.0.0.0/8 (Private RFC 1918)
  if (b0 === 10) return true;
  // 100.64.0.0/10 (Shared address space / Carrier-grade NAT RFC 6598)
  if (b0 === 100 && b1 >= 64 && b1 <= 127) return true;
  // 127.0.0.0/8 (Loopback RFC 1122)
  if (b0 === 127) return true;
  // 169.254.0.0/16 (Link-Local & Cloud Metadata RFC 3927, e.g. AWS/GCP/Azure 169.254.169.254)
  if (b0 === 169 && b1 === 254) return true;
  // 172.16.0.0/12 (Private RFC 1918)
  if (b0 === 172 && b1 >= 16 && b1 <= 31) return true;
  // 192.0.0.0/24 (IETF Protocol Assignments RFC 6890)
  if (b0 === 192 && b1 === 0 && b2 === 0) return true;
  // 192.0.2.0/24 (TEST-NET-1 documentation RFC 5737)
  if (b0 === 192 && b1 === 0 && b2 === 2) return true;
  // 192.88.99.0/24 (6to4 Relay Anycast RFC 7526)
  if (b0 === 192 && b1 === 88 && b2 === 99) return true;
  // 192.168.0.0/16 (Private RFC 1918)
  if (b0 === 192 && b1 === 168) return true;
  // 198.18.0.0/15 (Network Interconnect Device Benchmark RFC 2544)
  if (b0 === 198 && (b1 === 18 || b1 === 19)) return true;
  // 198.51.100.0/24 (TEST-NET-2 documentation RFC 5737)
  if (b0 === 198 && b1 === 51 && b2 === 100) return true;
  // 203.0.113.0/24 (TEST-NET-3 documentation RFC 5737)
  if (b0 === 203 && b1 === 0 && b2 === 113) return true;
  // 224.0.0.0/4 (Multicast RFC 5771: 224.0.0.0 to 239.255.255.255)
  if (b0 >= 224 && b0 <= 239) return true;
  // 240.0.0.0/4 (Reserved for future use RFC 1112 / RFC 6890, including 255.255.255.255 broadcast)
  if (b0 >= 240) return true;

  return false;
}

/**
 * Normalizes an IPv6 address into eight 16-bit numeric segments.
 */
function parseIPv6Words(ip: string): number[] | null {
  let normalized = ip.toLowerCase().trim();

  // If IPv4-mapped (e.g. ::ffff:192.168.1.1), convert IPv4 suffix to hex segments
  if (normalized.includes('.')) {
    const lastColon = normalized.lastIndexOf(':');
    if (lastColon === -1) return null;
    const v4 = normalized.slice(lastColon + 1);
    const v4Parts = v4.split('.').map((x) => parseInt(x, 10));
    if (v4Parts.length !== 4 || v4Parts.some((p) => isNaN(p) || p < 0 || p > 255)) return null;
    const high = ((v4Parts[0] << 8) | v4Parts[1]).toString(16);
    const low = ((v4Parts[2] << 8) | v4Parts[3]).toString(16);
    normalized = normalized.slice(0, lastColon) + ':' + high + ':' + low;
  }

  const parts = normalized.split('::');
  if (parts.length > 2) return null;

  const left = parts[0] ? parts[0].split(':') : [];
  const right = parts.length === 2 && parts[1] ? parts[1].split(':') : [];
  const missing = 8 - (left.length + right.length);
  if (missing < 0) return null;

  const middle = Array(missing).fill('0');
  const words = [...left, ...middle, ...right].map((h) => parseInt(h || '0', 16));

  if (words.length !== 8 || words.some((w) => isNaN(w) || w < 0 || w > 0xffff)) {
    return null;
  }

  return words;
}

/**
 * Checks if an IPv6 address belongs to loopback, unspecified, ULA, link-local,
 * multicast, NAT64, discard, documentation, or IPv4-mapped private ranges.
 */
export function isPrivateIPv6(ip: string): boolean {
  const words = parseIPv6Words(ip);
  if (!words) {
    return true; // Malformed IPv6 is rejected
  }

  // 1. Unspecified address (::/128)
  if (words.every((w) => w === 0)) return true;

  // 2. Loopback address (::1/128)
  if (words.slice(0, 7).every((w) => w === 0) && words[7] === 1) return true;

  // 3. NAT64 Well-Known Prefix (64:ff9b::/96 RFC 6052)
  if (words[0] === 0x0064 && words[1] === 0xff9b && words[2] === 0) return true;

  // 4. NAT64 Local Prefix (64:ff9b:1::/48 RFC 8215)
  if (words[0] === 0x0064 && words[1] === 0xff9b && words[2] === 1) return true;

  // 5. Discard-Only Prefix (100::/64 RFC 6666)
  if (words[0] === 0x0100 && words[1] === 0 && words[2] === 0 && words[3] === 0) return true;

  // 6. Documentation Prefix (2001:db8::/32 RFC 3849)
  if (words[0] === 0x2001 && words[1] === 0x0db8) return true;

  // 7. 6to4 Prefix (2002::/16 RFC 3056 / RFC 7526)
  if (words[0] === 0x2002) return true;

  // 8. Unique Local Address ULA (fc00::/7 RFC 4193, covers fc00:: through fdff::)
  if ((words[0] & 0xfe00) === 0xfc00) return true;

  // 9. Link-Local Unicast (fe80::/10 RFC 4291, covers fe80:: through febf::)
  if ((words[0] & 0xffc0) === 0xfe80) return true;

  // 10. Multicast (ff00::/8 RFC 4291, covers ff00:: through ffff::)
  if ((words[0] & 0xff00) === 0xff00) return true;

  // 11. IPv4-mapped IPv6 address (::ffff:0:0/96 RFC 4291)
  if (words.slice(0, 5).every((w) => w === 0) && words[5] === 0xffff) {
    const b0 = (words[6] >> 8) & 0xff;
    const b1 = words[6] & 0xff;
    const b2 = (words[7] >> 8) & 0xff;
    const b3 = words[7] & 0xff;
    return isPrivateIPv4(`${b0}.${b1}.${b2}.${b3}`);
  }

  return false;
}

/**
 * Validates a target URL against SSRF threats.
 * Checks scheme, decoded/encoded IP forms, and every resolved DNS record.
 * Pins the resolved IP address to prevent DNS rebinding attacks (TOCTOU).
 */
export async function validateUrlForSSRF(rawUrl: string): Promise<ValidatedTarget> {
  let parsedUrl: URL;
  try {
    parsedUrl = new URL(rawUrl);
  } catch {
    throw new Error('INVALID_URL: The provided URL is not a valid absolute URL.');
  }

  // 1. Enforce HTTP / HTTPS scheme only
  if (parsedUrl.protocol !== 'http:' && parsedUrl.protocol !== 'https:') {
    throw new Error('UNSUPPORTED_PROTOCOL: Only http: and https: protocols are permitted.');
  }

  // WHATWG URL parser automatically normalizes integer/octal/hex IPs to dotted decimal
  let hostname = parsedUrl.hostname.toLowerCase();

  // Strip enclosing brackets for IPv6
  if (hostname.startsWith('[') && hostname.endsWith(']')) {
    hostname = hostname.slice(1, -1);
  }

  // 2. Block direct localhost and internal domain names
  if (
    hostname === 'localhost' ||
    hostname.endsWith('.localhost') ||
    hostname.endsWith('.local') ||
    hostname.endsWith('.internal') ||
    hostname.endsWith('.lan') ||
    hostname.endsWith('.arpa')
  ) {
    throw new Error('SSRF_BLOCKED: Access to localhost or local network domains is blocked.');
  }

  // 3. Direct IP address checks
  const ipVer = net.isIP(hostname);
  if (ipVer === 4) {
    if (isPrivateIPv4(hostname)) {
      throw new Error(`SSRF_BLOCKED: Access to private/internal IPv4 address ${hostname} is blocked.`);
    }
    return { url: parsedUrl, pinnedIp: hostname, family: 4 };
  } else if (ipVer === 6) {
    if (isPrivateIPv6(hostname)) {
      throw new Error(`SSRF_BLOCKED: Access to private/internal IPv6 address ${hostname} is blocked.`);
    }
    return { url: parsedUrl, pinnedIp: hostname, family: 6 };
  }

  // 4. DNS resolution: check EVERY resolved address
  try {
    const records = await dns.lookup(hostname, { all: true });
    if (!records || records.length === 0) {
      throw new Error('DNS_LOOKUP_FAILED: Target host could not be resolved.');
    }

    let firstValidIp: { address: string; family: 4 | 6 } | null = null;

    for (const record of records) {
      if (record.family === 4) {
        if (isPrivateIPv4(record.address)) {
          throw new Error(
            `SSRF_BLOCKED: Host resolves to private/internal IPv4 address (${record.address}).`
          );
        }
        if (!firstValidIp) {
          firstValidIp = { address: record.address, family: 4 };
        }
      } else if (record.family === 6) {
        if (isPrivateIPv6(record.address)) {
          throw new Error(
            `SSRF_BLOCKED: Host resolves to private/internal IPv6 address (${record.address}).`
          );
        }
        if (!firstValidIp) {
          firstValidIp = { address: record.address, family: 6 };
        }
      }
    }

    if (!firstValidIp) {
      throw new Error('DNS_LOOKUP_FAILED: No valid public IP addresses found for host.');
    }

    return {
      url: parsedUrl,
      pinnedIp: firstValidIp.address,
      family: firstValidIp.family,
    };
  } catch (err: unknown) {
    if (err instanceof Error && err.message.startsWith('SSRF_BLOCKED')) {
      throw err;
    }
    throw new Error(`DNS_RESOLUTION_ERROR: Failed to resolve host: ${hostname}`);
  }
}
