import dns from 'node:dns/promises';
import net from 'node:net';

/**
 * Checks if an IPv4 address belongs to private, loopback, link-local, broadcast, or reserved ranges.
 */
export function isPrivateIPv4(ip: string): boolean {
  const parts = ip.split('.').map((p) => parseInt(p, 10));
  if (parts.length !== 4 || parts.some((p) => isNaN(p) || p < 0 || p > 255)) {
    return true; // Malformed or abnormal IPv4 is rejected
  }

  const [b0, b1] = parts;

  // 0.0.0.0/8 (Current network / "this" host)
  if (b0 === 0) return true;
  // 10.0.0.0/8 (Private RFC 1918)
  if (b0 === 10) return true;
  // 100.64.0.0/10 (Shared address space / Carrier-grade NAT)
  if (b0 === 100 && b1 >= 64 && b1 <= 127) return true;
  // 127.0.0.0/8 (Loopback)
  if (b0 === 127) return true;
  // 169.254.0.0/16 (Link-Local & Cloud Metadata, e.g. AWS/GCP/Azure 169.254.169.254)
  if (b0 === 169 && b1 === 254) return true;
  // 172.16.0.0/12 (Private RFC 1918)
  if (b0 === 172 && b1 >= 16 && b1 <= 31) return true;
  // 192.0.0.0/24 (IETF Protocol Assignments)
  if (b0 === 192 && b1 === 0 && parts[2] === 0) return true;
  // 192.0.2.0/24 (TEST-NET-1)
  if (b0 === 192 && b1 === 0 && parts[2] === 2) return true;
  // 192.168.0.0/16 (Private RFC 1918)
  if (b0 === 192 && b1 === 168) return true;
  // 198.18.0.0/15 (Benchmarking)
  if (b0 === 198 && (b1 === 18 || b1 === 19)) return true;
  // 198.51.100.0/24 (TEST-NET-2)
  if (b0 === 198 && b1 === 51 && parts[2] === 100) return true;
  // 203.0.113.0/24 (TEST-NET-3)
  if (b0 === 203 && b1 === 0 && parts[2] === 113) return true;
  // 224.0.0.0/4 (Multicast)
  if (b0 >= 224 && b0 <= 239) return true;
  // 240.0.0.0/4 (Reserved for future use)
  if (b0 >= 240) return true;

  return false;
}

/**
 * Checks if an IPv6 address belongs to loopback, unique local, link-local, or IPv4-mapped private.
 */
export function isPrivateIPv6(ip: string): boolean {
  const normalized = ip.toLowerCase().trim();

  // Loopback (::1)
  if (normalized === '::1' || normalized === '0:0:0:0:0:0:0:1') return true;
  // Unspecified (::)
  if (normalized === '::' || normalized === '0:0:0:0:0:0:0:0') return true;

  // Unique local address fc00::/7 (fc00:: to fdff::)
  if (normalized.startsWith('fc') || normalized.startsWith('fd')) return true;

  // Link-local address fe80::/10 (fe80:: to febf::)
  if (
    normalized.startsWith('fe8') ||
    normalized.startsWith('fe9') ||
    normalized.startsWith('fea') ||
    normalized.startsWith('feb')
  ) {
    return true;
  }

  // IPv4-mapped IPv6 address (e.g., ::ffff:127.0.0.1, ::ffff:7f00:1)
  if (normalized.includes('::ffff:')) {
    const ipv4Part = normalized.split('::ffff:')[1];
    if (ipv4Part) {
      if (net.isIP(ipv4Part) === 4) {
        return isPrivateIPv4(ipv4Part);
      }
      // Check hex notation if present in IPv4-mapped (e.g., 7f00:1)
      const hexParts = ipv4Part.split(':');
      if (hexParts.length === 2) {
        const high = parseInt(hexParts[0], 16);
        const low = parseInt(hexParts[1], 16);
        if (!isNaN(high) && !isNaN(low)) {
          const b0 = (high >> 8) & 0xff;
          const b1 = high & 0xff;
          const b2 = (low >> 8) & 0xff;
          const b3 = low & 0xff;
          return isPrivateIPv4(`${b0}.${b1}.${b2}.${b3}`);
        }
      }
    }
  }

  return false;
}

/**
 * Validates a target URL against SSRF threats.
 * Checks scheme, decoded/encoded IP forms, and every resolved DNS record.
 */
export async function validateUrlForSSRF(rawUrl: string): Promise<URL> {
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
    return parsedUrl;
  } else if (ipVer === 6) {
    if (isPrivateIPv6(hostname)) {
      throw new Error(`SSRF_BLOCKED: Access to private/internal IPv6 address ${hostname} is blocked.`);
    }
    return parsedUrl;
  }

  // 4. DNS resolution: check EVERY resolved address
  try {
    const records = await dns.lookup(hostname, { all: true });
    if (!records || records.length === 0) {
      throw new Error('DNS_LOOKUP_FAILED: Target host could not be resolved.');
    }

    for (const record of records) {
      if (record.family === 4 && isPrivateIPv4(record.address)) {
        throw new Error(
          `SSRF_BLOCKED: Host resolves to private/internal IPv4 address (${record.address}).`
        );
      }
      if (record.family === 6 && isPrivateIPv6(record.address)) {
        throw new Error(
          `SSRF_BLOCKED: Host resolves to private/internal IPv6 address (${record.address}).`
        );
      }
    }
  } catch (err: unknown) {
    if (err instanceof Error && err.message.startsWith('SSRF_BLOCKED')) {
      throw err;
    }
    throw new Error(`DNS_RESOLUTION_ERROR: Failed to resolve host: ${hostname}`);
  }

  return parsedUrl;
}
