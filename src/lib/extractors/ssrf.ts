import dns from 'node:dns/promises';
import net from 'node:net';

/**
 * Checks if an IPv4 address belongs to private, loopback, link-local, or reserved ranges.
 */
function isPrivateIPv4(ip: string): boolean {
  const parts = ip.split('.').map(Number);
  if (parts.length !== 4 || parts.some((p) => isNaN(p) || p < 0 || p > 255)) {
    return true; // Malformed IPv4 treated as unsafe
  }

  const [b0, b1] = parts;

  // 0.0.0.0/8 (Current network)
  if (b0 === 0) return true;
  // 10.0.0.0/8 (Private-Use)
  if (b0 === 10) return true;
  // 127.0.0.0/8 (Loopback)
  if (b0 === 127) return true;
  // 169.254.0.0/16 (Link-Local)
  if (b0 === 169 && b1 === 254) return true;
  // 172.16.0.0/12 (Private-Use)
  if (b0 === 172 && b1 >= 16 && b1 <= 31) return true;
  // 192.168.0.0/16 (Private-Use)
  if (b0 === 192 && b1 === 168) return true;
  // 255.255.255.255 (Broadcast)
  if (b0 === 255) return true;

  return false;
}

/**
 * Checks if an IPv6 address belongs to loopback, unique local, link-local, or IPv4-mapped private.
 */
function isPrivateIPv6(ip: string): boolean {
  const normalized = ip.toLowerCase();

  // Loopback (::1)
  if (normalized === '::1' || normalized === '0:0:0:0:0:0:0:1') return true;
  // Unspecified (::)
  if (normalized === '::' || normalized === '0:0:0:0:0:0:0:0') return true;

  // Unique local address fc00::/7 (fc00:: to fdff::)
  if (normalized.startsWith('fc') || normalized.startsWith('fd')) return true;

  // Link-local address fe80::/10
  if (
    normalized.startsWith('fe8') ||
    normalized.startsWith('fe9') ||
    normalized.startsWith('fea') ||
    normalized.startsWith('feb')
  ) {
    return true;
  }

  // IPv4-mapped IPv6 address (::ffff:192.0.2.128)
  if (normalized.includes('::ffff:')) {
    const ipv4Part = normalized.split('::ffff:')[1];
    if (ipv4Part && net.isIP(ipv4Part) === 4) {
      return isPrivateIPv4(ipv4Part);
    }
  }

  return false;
}

/**
 * Validates a target URL against SSRF threats.
 * Throws if the URL is invalid, non-HTTP(S), or resolves to internal/private IPs.
 */
export async function validateUrlForSSRF(rawUrl: string): Promise<URL> {
  let parsedUrl: URL;
  try {
    parsedUrl = new URL(rawUrl);
  } catch {
    throw new Error('INVALID_URL: The provided URL is not a valid absolute URL.');
  }

  // Enforce HTTP / HTTPS schemes only
  if (parsedUrl.protocol !== 'http:' && parsedUrl.protocol !== 'https:') {
    throw new Error('UNSUPPORTED_PROTOCOL: Only http: and https: protocols are permitted.');
  }

  const hostname = parsedUrl.hostname.toLowerCase();

  // Block obvious localhost aliases
  if (
    hostname === 'localhost' ||
    hostname === '127.0.0.1' ||
    hostname === '::1' ||
    hostname.endsWith('.localhost') ||
    hostname.endsWith('.local') ||
    hostname.endsWith('.internal')
  ) {
    throw new Error('SSRF_BLOCKED: Access to localhost or local domains is blocked.');
  }

  // If hostname is directly an IP, test it directly
  const ipVersion = net.isIP(hostname);
  if (ipVersion === 4) {
    if (isPrivateIPv4(hostname)) {
      throw new Error(`SSRF_BLOCKED: Access to private IPv4 address ${hostname} is blocked.`);
    }
    return parsedUrl;
  } else if (ipVersion === 6) {
    if (isPrivateIPv6(hostname)) {
      throw new Error(`SSRF_BLOCKED: Access to private IPv6 address ${hostname} is blocked.`);
    }
    return parsedUrl;
  }

  // Resolve hostname via DNS and check all resolved records
  try {
    const addresses = await dns.lookup(hostname, { all: true });
    if (!addresses || addresses.length === 0) {
      throw new Error('DNS_LOOKUP_FAILED: Could not resolve target hostname.');
    }

    for (const record of addresses) {
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
