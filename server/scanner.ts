import os from 'os';
import { exec } from 'child_process';
import dns from 'dns';
import net from 'net';
import http from 'http';
import https from 'https';
import tls from 'tls';
import { lookupVendor } from './vendorDb';
import { queryDiscoveryProtocols } from './discovery_protocols';

export interface PingResult {
  ip: string;
  status: 'online' | 'offline';
  latency: number;
  ttl: number;
  packetLoss: number;
  mac?: string;
  vendor?: string;
  hostname?: string;
  os?: string;
  openPorts?: number[];
  banners?: Record<number, string>;
  lastSeen?: string;
  deviceType?: string;
  osVersion?: string;
  servicesDetected?: string[];
  netbiosName?: string;
  workgroup?: string;
  snmpData?: { sysName?: string; sysDescr?: string; vendor?: string };
  onvifData?: { endpoint?: string; manufacturer?: string; model?: string };
  ssdpData?: { server?: string; location?: string; modelName?: string };
  mdnsData?: { hostname?: string; services: string[] };
  webData?: { title?: string; serverHeader?: string; sslSubject?: string; sslIssuer?: string; sslExpiration?: string; tlsVersion?: string };
}

export interface NetworkInterfaceInfo {
  name: string;
  ip: string;
  netmask: string;
  subnet: string;
  ips: string[];
}

/**
 * Parses IP address string into a 32-bit integer.
 */
function ipToInt(ip: string): number {
  return ip.split('.').reduce((acc, octet) => (acc << 8) + parseInt(octet, 10), 0) >>> 0;
}

/**
 * Converts a 32-bit integer into an IP address string.
 */
function intToIp(int: number): string {
  return [
    (int >>> 24) & 0xFF,
    (int >>> 16) & 0xFF,
    (int >>> 8) & 0xFF,
    int & 0xFF
  ].join('.');
}

/**
 * Determines the IP range from an IP and netmask.
 */
export function getSubnetRange(ip: string, netmask: string): { network: string; broadcast: string; prefixLength: number; ips: string[] } {
  const ipInt = ipToInt(ip);
  const maskInt = ipToInt(netmask);
  
  const networkInt = (ipInt & maskInt) >>> 0;
  const broadcastInt = (networkInt | (~maskInt)) >>> 0;
  
  // Count prefix length (CIDR notation)
  let prefixLength = 0;
  let m = maskInt;
  for (let i = 0; i < 32; i++) {
    if ((m & (1 << (31 - i))) !== 0) {
      prefixLength++;
    } else {
      break;
    }
  }

  const ips: string[] = [];
  
  // Standard IPv4 subnet sizes
  if (prefixLength >= 16 && prefixLength <= 30) {
    const start = networkInt + 1;
    const end = broadcastInt - 1;
    const totalHosts = end - start + 1;
    
    // Safety cap: If subnet is larger than a /24 (254 hosts), limit it to 256 IPs centered around the current IP
    if (totalHosts <= 256) {
      for (let i = start; i <= end; i++) {
        ips.push(intToIp(i));
      }
    } else {
      const center = ipInt;
      const radius = 128;
      const actualStart = Math.max(start, center - radius);
      const actualEnd = Math.min(end, center + radius);
      for (let i = actualStart; i <= actualEnd; i++) {
        ips.push(intToIp(i));
      }
    }
  } else if (prefixLength === 31) {
    ips.push(intToIp(networkInt));
    ips.push(intToIp(broadcastInt));
  } else if (prefixLength === 32) {
    ips.push(intToIp(networkInt));
  } else {
    // Large network fallback (e.g., /8, /12) - scan a /24 window around current IP
    const base = (ipInt & 0xFFFFFF00) >>> 0;
    for (let i = 1; i <= 254; i++) {
      ips.push(intToIp(base + i));
    }
  }

  return {
    network: intToIp(networkInt),
    broadcast: intToIp(broadcastInt),
    prefixLength,
    ips
  };
}

/**
 * Retrieve active non-loopback IPv4 network interfaces on the host.
 */
export function getActiveInterfaces(): NetworkInterfaceInfo[] {
  const interfaces = os.networkInterfaces();
  const list: NetworkInterfaceInfo[] = [];

  for (const name of Object.keys(interfaces)) {
    const nets = interfaces[name] || [];
    for (const net of nets) {
      // Seek active IPv4, non-loopback adapters
      if (net.family === 'IPv4' && !net.internal) {
        const { ips, prefixLength } = getSubnetRange(net.address, net.netmask);
        list.push({
          name,
          ip: net.address,
          netmask: net.netmask,
          subnet: `${intToIp(ipToInt(net.address) & ipToInt(net.netmask))}/${prefixLength}`,
          ips
        });
      }
    }
  }
  
  return list;
}

/**
 * Parses raw shell ping command output to extract RTT and TTL metrics.
 */
function parsePingOutput(stdout: string, ip: string): { status: 'online' | 'offline'; latency: number; ttl: number; packetLoss: number } {
  const lowercase = stdout.toLowerCase();
  
  // Identify common indicators of failure/packet loss
  const isFailed = 
    lowercase.includes('100% packet loss') ||
    lowercase.includes('100% loss') ||
    lowercase.includes('timed out') ||
    lowercase.includes('timeout') ||
    lowercase.includes('unreachable') ||
    lowercase.includes('expired in transit') ||
    lowercase.includes('0 received') ||
    lowercase.includes('0 packets received');

  if (isFailed) {
    return { status: 'offline', latency: 0, ttl: 0, packetLoss: 100 };
  }

  // Latency parsing
  let latency = 0;
  const timeMatch = stdout.match(/time[=<]([\d.]+)\s*ms/i);
  if (timeMatch) {
    latency = Math.round(parseFloat(timeMatch[1]));
  } else {
    const altTimeMatch = stdout.match(/time=([\d.]+)\s*ms/i);
    if (altTimeMatch) {
      latency = Math.round(parseFloat(altTimeMatch[1]));
    }
  }

  // TTL parsing
  let ttl = 64;
  const ttlMatch = stdout.match(/ttl=(\d+)/i);
  if (ttlMatch) {
    ttl = parseInt(ttlMatch[1], 10);
  }

  const isOnline = 
    lowercase.includes('reply from') || 
    lowercase.includes('bytes from') || 
    (latency > 0 && ttl > 0);

  return {
    status: isOnline ? 'online' : 'offline',
    latency: isOnline ? Math.max(1, latency) : 0,
    ttl: isOnline ? ttl : 0,
    packetLoss: isOnline ? 0 : 100
  };
}

/**
 * Ping Engine: Dispatches a real ICMP Echo request using native system binary commands.
 */
export function pingHost(ip: string, timeoutMs: number = 500): Promise<PingResult> {
  const isWin = process.platform === 'win32';
  const isMac = process.platform === 'darwin';
  
  let command = '';
  if (isWin) {
    command = `ping -n 1 -w ${timeoutMs} ${ip}`;
  } else if (isMac) {
    // macOS ping -W specifies timeout in milliseconds
    command = `ping -c 1 -W ${timeoutMs} ${ip}`;
  } else {
    // Linux ping -W specifies timeout in seconds. Ensure minimum of 1s fallback for systems that don't support decimals.
    const timeoutSec = Math.max(1, Math.round(timeoutMs / 1000));
    command = `ping -c 1 -W ${timeoutSec} ${ip}`;
  }

  return new Promise<PingResult>((resolve) => {
    exec(command, (error, stdout, stderr) => {
      const output = (stdout || '') + '\n' + (stderr || '');
      const parsed = parsePingOutput(output, ip);

      // Handle cases where the utility itself is missing
      if (error && (error.message.includes('not found') || error.message.includes('not recognized'))) {
        resolve({
          ip,
          status: 'offline',
          latency: 0,
          ttl: 0,
          packetLoss: 100,
          lastSeen: new Date().toISOString()
        });
        return;
      }

      resolve({
        ip,
        status: parsed.status,
        latency: parsed.latency,
        ttl: parsed.ttl,
        packetLoss: parsed.packetLoss,
        lastSeen: new Date().toISOString()
      });
    });
  });
}

/**
 * ARP Resolver: Checks the native system ARP tables to resolve MAC addresses.
 */
export function resolveArp(ip: string): Promise<string> {
  const isWin = process.platform === 'win32';
  const command = isWin ? `arp -a ${ip}` : `arp -n ${ip} 2>/dev/null || arp ${ip}`;

  return new Promise<string>((resolve) => {
    exec(command, (error, stdout) => {
      if (error || !stdout) {
        resolve('');
        return;
      }

      // MAC format: xx:xx:xx:xx:xx:xx or xx-xx-xx-xx-xx-xx
      const macRegex = /([0-9A-Fa-f]{2}[:-]){5}([0-9A-Fa-f]{2})/;
      const match = stdout.match(macRegex);
      if (match) {
        const formattedMac = match[0].replace(/-/g, ':').toLowerCase();
        resolve(formattedMac);
      } else {
        resolve('');
      }
    });
  });
}

/**
 * DNS Resolver: Attempts reverse DNS hostname lookup.
 */
export function resolveDns(ip: string): Promise<string> {
  return new Promise<string>((resolve) => {
    dns.reverse(ip, (err, hostnames) => {
      if (err || !hostnames || hostnames.length === 0) {
        resolve('N/A');
      } else {
        resolve(hostnames[0]);
      }
    });
  });
}

/**
 * TCP Port Scanner & Banner Grabber: Attempts connection and reads banner.
 */
export function checkPortAndGrabBanner(ip: string, port: number, timeoutMs: number = 300): Promise<{ open: boolean; banner?: string }> {
  return new Promise((resolve) => {
    const socket = new net.Socket();
    let isResolved = false;
    let bannerData = '';

    const done = (open: boolean, banner?: string) => {
      if (isResolved) return;
      isResolved = true;
      socket.destroy();
      resolve({ open, banner });
    };

    socket.setTimeout(timeoutMs);

    socket.on('connect', () => {
      // Port is open!
      // Let's try to grab banner if it's a known HTTP/web port
      if ([80, 443, 8080, 8081, 8443, 8888].includes(port)) {
        socket.write(`GET / HTTP/1.0\r\nHost: ${ip}\r\nUser-Agent: Mozilla/5.0\r\n\r\n`);
      } else if ([23].includes(port)) {
        socket.write('\r\n');
      } else {
        // Wait up to 200ms to see if server greets us first (SSH, FTP, etc.)
      }
    });

    socket.on('data', (chunk) => {
      bannerData += chunk.toString('utf-8');
      if (bannerData.length > 512) {
        bannerData = bannerData.substring(0, 512);
        done(true, cleanBanner(bannerData, port));
      }
    });

    socket.on('timeout', () => {
      if (bannerData) {
        done(true, cleanBanner(bannerData, port));
      } else {
        done(false);
      }
    });

    socket.on('error', () => {
      done(false);
    });

    socket.on('close', () => {
      if (bannerData) {
        done(true, cleanBanner(bannerData, port));
      } else {
        // Connected but closed without sending data, still means port is open
        done(socket.writable || socket.readable || isResolved === false ? false : true);
      }
    });

    socket.connect(port, ip);
  });
}

/**
 * Extracts clean, printable details from the raw socket banner.
 */
function cleanBanner(raw: string, port: number): string {
  if ([80, 443, 8080, 8081, 8443, 8888].includes(port)) {
    const lines = raw.split('\r\n');
    const serverLine = lines.find(l => l.toLowerCase().startsWith('server:'));
    if (serverLine) {
      return serverLine.substring(7).trim();
    }
    const statusLine = lines[0] ? lines[0].trim() : '';
    if (statusLine.startsWith('HTTP/')) {
      return statusLine;
    }
  }
  return raw.replace(/[\x00-\x1F\x7F-\x9F]/g, ' ').replace(/\s+/g, ' ').trim().substring(0, 80);
}

/**
 * Advanced real Web Discovery: Grabs page title and server headers.
 */
export function getWebPageInfo(ip: string, port = 80, isHttps = false, timeoutMs = 400): Promise<{ title?: string; serverHeader?: string; poweredBy?: string } | null> {
  return new Promise((resolve) => {
    const lib = isHttps ? https : http;
    const agent = isHttps ? new https.Agent({ rejectUnauthorized: false }) : undefined;
    
    const req = lib.get({
      hostname: ip,
      port: port,
      path: '/',
      timeout: timeoutMs,
      agent: agent,
      headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Enterprise Network Discovery Scanner' }
    }, (res) => {
      let body = '';
      res.on('data', (chunk) => {
        body += chunk.toString('utf-8');
        if (body.length > 20000) {
          req.destroy();
        }
      });
      
      res.on('end', () => {
        const titleMatch = body.match(/<title[^>]*>([^<]+)<\/title>/i);
        const title = titleMatch ? titleMatch[1].trim() : undefined;
        resolve({
          title,
          serverHeader: typeof res.headers['server'] === 'string' ? res.headers['server'] : undefined,
          poweredBy: typeof res.headers['x-powered-by'] === 'string' ? res.headers['x-powered-by'] : undefined
        });
      });
    });

    req.on('error', () => resolve(null));
    req.on('timeout', () => {
      req.destroy();
      resolve(null);
    });
  });
}

/**
 * Advanced real TLS/SSL Discovery: Connects and parses peer certificate details.
 */
export function getSSLCertificateInfo(ip: string, port = 443, timeoutMs = 400): Promise<{ subject?: string; issuer?: string; expiration?: string; cipher?: string; tlsVersion?: string } | null> {
  return new Promise((resolve) => {
    try {
      const socket = tls.connect({
        host: ip,
        port: port,
        servername: ip,
        rejectUnauthorized: false,
        timeout: timeoutMs
      }, () => {
        const cert = socket.getPeerCertificate();
        const cipher = socket.getCipher();
        const protocol = socket.getProtocol();
        
        const info = {
          subject: cert && cert.subject && cert.subject.CN ? (Array.isArray(cert.subject.CN) ? cert.subject.CN[0] : cert.subject.CN) : undefined,
          issuer: cert && cert.issuer && cert.issuer.CN ? (Array.isArray(cert.issuer.CN) ? cert.issuer.CN[0] : cert.issuer.CN) : undefined,
          expiration: cert && cert.valid_to ? cert.valid_to : undefined,
          cipher: cipher ? cipher.name : undefined,
          tlsVersion: protocol || undefined
        };
        socket.destroy();
        resolve(info);
      });

      socket.on('error', () => {
        socket.destroy();
        resolve(null);
      });

      socket.on('timeout', () => {
        socket.destroy();
        resolve(null);
      });
    } catch (e) {
      resolve(null);
    }
  });
}

/**
 * Advanced Device Classification & OS Fingerprinting Engine
 * Analyzes active TTL, TCP open ports, banners, NetBIOS, SSDP, mDNS, ONVIF, and SNMP OIDs.
 */
export function classifyAndFingerprint(
  ip: string,
  ttl: number,
  openPorts: number[],
  banners: Record<number, string>,
  discoveryData: any
): { os: string; deviceType: string; vendor?: string; services: string[] } {
  const bannerString = Object.values(banners).join(' ').toLowerCase();
  
  // Collect all detected service names based on open ports
  const services: string[] = [];
  const portMap: Record<number, string> = {
    21: 'FTP', 22: 'SSH', 23: 'Telnet', 25: 'SMTP', 53: 'DNS', 67: 'DHCP', 68: 'DHCP',
    80: 'HTTP', 110: 'POP3', 123: 'NTP', 137: 'NetBIOS', 139: 'NetBIOS', 143: 'IMAP',
    161: 'SNMP', 389: 'LDAP', 443: 'HTTPS', 445: 'SMB', 554: 'RTSP', 1433: 'MSSQL',
    1883: 'MQTT', 3000: 'Vite/Node', 3306: 'MySQL', 3389: 'RDP', 3702: 'ONVIF',
    5353: 'mDNS', 5432: 'PostgreSQL', 5900: 'VNC', 6379: 'Redis', 8080: 'HTTP-Alt',
    8443: 'HTTPS-Alt', 9000: 'Docker', 9100: 'Raw-IP-Printer', 27017: 'MongoDB'
  };

  openPorts.forEach(port => {
    if (portMap[port]) {
      services.push(portMap[port]);
    }
  });

  // Default values
  let os = 'Unknown';
  let deviceType = 'Unknown';
  let vendor: string | undefined = undefined;

  // 1. Check SNMP Data
  if (discoveryData.snmp) {
    const descr = (discoveryData.snmp.sysDescr || '').toLowerCase();
    if (descr.includes('windows')) {
      os = 'Windows';
      deviceType = descr.includes('server') ? 'Server' : 'Desktop';
    } else if (descr.includes('cisco')) {
      os = 'Cisco IOS';
      deviceType = 'Switch';
    } else if (descr.includes('mikrotik')) {
      os = 'MikroTik RouterOS';
      deviceType = 'Router';
    } else if (descr.includes('synology')) {
      os = 'Synology DSM';
      deviceType = 'NAS';
    } else if (descr.includes('linux')) {
      os = 'Linux';
      deviceType = 'Server';
    }
    if (discoveryData.snmp.vendor) {
      vendor = discoveryData.snmp.vendor;
    }
  }

  // 2. Check NetBIOS
  if (discoveryData.netbios) {
    os = 'Windows';
    deviceType = 'Desktop';
    if (bannerString.includes('samba') || openPorts.includes(445)) {
      deviceType = 'Server';
    }
  }

  // 3. Check ONVIF (IP Cameras)
  if (discoveryData.onvif || openPorts.includes(3702) || openPorts.includes(554)) {
    os = 'Embedded Linux';
    deviceType = 'Camera';
    if (discoveryData.onvif?.manufacturer) {
      vendor = discoveryData.onvif.manufacturer;
    }
  }

  // 4. Check Printer ports
  if (openPorts.includes(9100) || openPorts.includes(515) || openPorts.includes(631)) {
    deviceType = 'Printer';
    os = 'Printer Firmware';
  }

  // 5. Check SSH Banners & Key Ports
  if (os === 'Unknown') {
    if (bannerString.includes('microsoft-iis') || openPorts.includes(3389) || (openPorts.includes(445) && ttl === 128)) {
      os = 'Windows';
      deviceType = 'Desktop';
      if (openPorts.includes(445) && openPorts.includes(3389)) {
        deviceType = 'Server';
      }
    } else if (bannerString.includes('ubuntu')) {
      os = 'Ubuntu';
      deviceType = 'Server';
    } else if (bannerString.includes('debian')) {
      os = 'Debian';
      deviceType = 'Server';
    } else if (bannerString.includes('raspbian') || bannerString.includes('raspberrypi')) {
      os = 'Raspberry Pi';
      deviceType = 'IoT';
    } else if (bannerString.includes('mikrotik') || openPorts.includes(8291)) {
      os = 'MikroTik RouterOS';
      deviceType = 'Router';
    } else if (bannerString.includes('cisco') || (openPorts.includes(23) && ttl === 255)) {
      os = 'Cisco IOS';
      deviceType = 'Switch';
    } else if (openPorts.includes(5353) && (bannerString.includes('apple') || bannerString.includes('darwin'))) {
      os = 'macOS';
      deviceType = 'Laptop';
    } else {
      // Fallback on TTL
      if (ttl === 128) {
        os = 'Windows';
        deviceType = 'Desktop';
      } else if (ttl === 64) {
        os = 'Linux';
        deviceType = 'Server';
      } else if (ttl === 255) {
        os = 'Cisco IOS / Network Device';
        deviceType = 'Switch';
      }
    }
  }

  // Refined Device Classification
  if (deviceType === 'Unknown') {
    if (openPorts.includes(80) || openPorts.includes(443)) {
      if (bannerString.includes('apache') || bannerString.includes('nginx') || bannerString.includes('iis')) {
        deviceType = 'Server';
      } else {
        deviceType = 'IoT';
      }
    } else if (openPorts.includes(22)) {
      deviceType = 'Server';
    } else if (openPorts.includes(139) || openPorts.includes(445)) {
      deviceType = 'Server';
    }
  }

  return { os, deviceType, vendor, services };
}

/**
 * Guesses the Operating System based on multiple network signatures.
 */
function fingerprintOS(ip: string, ttl: number, openPorts: number[], banner: string): string {
  return classifyAndFingerprint(ip, ttl, openPorts, { 0: banner }, {}).os;
}

/**
 * Universal IP Range and Target parsing engine.
 * Supports: Single IP, CIDR subnets, and full ranges (e.g. 10.0.0.1-10.0.0.50 or 192.168.1.1-254)
 */
export function parseIpTarget(target: string): string[] {
  const trimmed = target.trim();
  if (!trimmed) return [];

  // 1. CIDR notation (e.g. 192.168.1.0/24)
  if (trimmed.includes('/')) {
    const parts = trimmed.split('/');
    const baseIp = parts[0].trim();
    const prefixStr = parts[1].trim();
    const prefix = parseInt(prefixStr, 10);
    if (isNaN(prefix) || prefix < 0 || prefix > 32) return [baseIp];

    const ipInt = ipToInt(baseIp);
    const mask = (prefix === 0) ? 0 : (~0 << (32 - prefix)) >>> 0;
    const network = (ipInt & mask) >>> 0;
    const broadcast = (network | ~mask) >>> 0;

    const ips: string[] = [];
    if (prefix >= 31) {
      for (let i = network; i <= broadcast; i++) {
        ips.push(intToIp(i));
      }
    } else {
      // Return host range (skip network and broadcast)
      for (let i = network + 1; i < broadcast; i++) {
        ips.push(intToIp(i));
      }
    }
    return ips;
  }

  // 2. IP Range with dash (e.g. 10.12.10.1-10.12.10.50 or 10.12.10.1-50)
  if (trimmed.includes('-')) {
    const parts = trimmed.split('-');
    const startStr = parts[0].trim();
    const endStr = parts[1].trim();

    try {
      if (endStr.includes('.')) {
        // Full range: 10.12.10.5 - 10.12.10.50
        const startInt = ipToInt(startStr);
        const endInt = ipToInt(endStr);
        const ips: string[] = [];
        const low = Math.min(startInt, endInt);
        const high = Math.max(startInt, endInt);
        for (let i = low; i <= high; i++) {
          ips.push(intToIp(i));
        }
        return ips;
      } else {
        // Abbreviated last octet range: 10.12.10.5 - 50
        const ipParts = startStr.split('.');
        if (ipParts.length !== 4) return [startStr];
        const lastOctetStart = parseInt(ipParts[3], 10);
        const lastOctetEnd = parseInt(endStr, 10);
        if (isNaN(lastOctetEnd)) return [startStr];

        const prefix = ipParts.slice(0, 3).join('.');
        const ips: string[] = [];
        const low = Math.min(lastOctetStart, lastOctetEnd);
        const high = Math.max(lastOctetStart, lastOctetEnd);
        for (let i = low; i <= high; i++) {
          ips.push(`${prefix}.${i}`);
        }
        return ips;
      }
    } catch {
      return [startStr];
    }
  }

  // 3. Fallback to single IP
  return [trimmed];
}

/**
 * Core host scanning: performs pings, fallback ARPs, hostname resolutions,
 * ports verification, banner grabbing, and OS detection.
 */
export async function scanHostExtended(
  ip: string,
  mode: 'quick' | 'normal' | 'deep',
  portsToScan: number[],
  timeoutMs: number = 500
): Promise<PingResult> {
  const isLocalhost = ip === '127.0.0.1' || ip === 'localhost';

  // 1. Fire ICMP ping
  let pingResult = await pingHost(ip, timeoutMs);

  // Fallback 1: ARP cache lookup for local network (if ping says offline)
  if (pingResult.status === 'offline' && !isLocalhost) {
    const mac = await resolveArp(ip);
    if (mac) {
      pingResult = {
        ip,
        status: 'online',
        latency: 1, // local network quick ARP response
        ttl: 64,
        packetLoss: 0,
        lastSeen: new Date().toISOString()
      };
    }
  }

  // Fallback 2: Port checking (if ping and ARP say offline, try key ports)
  if (pingResult.status === 'offline') {
    const fallbackPorts = [80, 443, 22, 3389];
    for (const port of fallbackPorts) {
      const pCheck = await checkPortAndGrabBanner(ip, port, 100);
      if (pCheck.open) {
        pingResult = {
          ip,
          status: 'online',
          latency: 2,
          ttl: 64,
          packetLoss: 0,
          lastSeen: new Date().toISOString()
        };
        break;
      }
    }
  }

  // Genuinely offline host -> return now
  if (pingResult.status === 'offline') {
    return pingResult;
  }

  // If quick scan mode, return ping result immediately
  if (mode === 'quick') {
    return {
      ...pingResult,
      deviceType: 'Unknown',
      os: 'Unknown'
    };
  }

  // Gather Hostname and ARP Details
  let mac = '';
  let vendor = '';
  let hostname = '';
  const openPorts: number[] = [];
  const banners: Record<number, string> = {};

  const [resolvedMac, resolvedHostname] = await Promise.all([
    resolveArp(ip),
    resolveDns(ip)
  ]);

  if (resolvedMac) {
    mac = resolvedMac;
    vendor = lookupVendor(resolvedMac);
  }
  if (resolvedHostname && resolvedHostname !== 'N/A') {
    hostname = resolvedHostname;
  }

  // Execute UDP-based active discovery protocols in parallel
  const discoveryData: any = await queryDiscoveryProtocols(ip, Math.min(timeoutMs, 400)).catch(() => ({}));

  let netbiosName: string | undefined;
  let workgroup: string | undefined;
  if (discoveryData.netbios) {
    netbiosName = discoveryData.netbios.hostname;
    workgroup = discoveryData.netbios.workgroup;
    if (netbiosName && !hostname) {
      hostname = `${netbiosName}.local`;
    }
  }

  // Scan TCP ports if specified
  const scanPorts = (portsToScan && portsToScan.length > 0) ? portsToScan : (mode === 'deep' ? [21, 22, 23, 25, 53, 80, 110, 135, 139, 443, 445, 1433, 3306, 3389, 5432, 554, 3702, 5353, 5900, 6379, 8080, 8443, 9100, 27017] : [22, 80, 443, 445, 3389]);
  
  const portConcurrency = 12;
  for (let i = 0; i < scanPorts.length; i += portConcurrency) {
    const chunk = scanPorts.slice(i, i + portConcurrency);
    await Promise.all(chunk.map(async (port) => {
      const check = await checkPortAndGrabBanner(ip, port, timeoutMs);
      if (check.open) {
        openPorts.push(port);
        if (check.banner) {
          banners[port] = check.banner;
        }
      }
    }));
  }

  // Fetch web and SSL certificate details if HTTP/HTTPS is open
  let webData: any = undefined;
  if (openPorts.includes(80) || openPorts.includes(8080)) {
    const p = openPorts.includes(80) ? 80 : 8080;
    const info = await getWebPageInfo(ip, p, false, timeoutMs).catch(() => null);
    if (info) webData = { ...webData, ...info };
  }
  if (openPorts.includes(443) || openPorts.includes(8443)) {
    const p = openPorts.includes(443) ? 443 : 8443;
    const [webInfo, sslInfo] = await Promise.all([
      getWebPageInfo(ip, p, true, timeoutMs).catch(() => null),
      getSSLCertificateInfo(ip, p, timeoutMs).catch(() => null)
    ]);
    if (webInfo) webData = { ...webData, ...webInfo };
    if (sslInfo) {
      webData = {
        ...webData,
        sslSubject: sslInfo.subject,
        sslIssuer: sslInfo.issuer,
        sslExpiration: sslInfo.expiration,
        tlsVersion: sslInfo.tlsVersion,
        cipher: sslInfo.cipher
      };
    }
  }

  // Advanced Fingerprinting and Classification
  const classification = classifyAndFingerprint(ip, pingResult.ttl, openPorts, banners, discoveryData);

  return {
    ...pingResult,
    mac: mac || undefined,
    vendor: classification.vendor || vendor || undefined,
    hostname: hostname || discoveryData.mdns?.hostname || undefined,
    os: classification.os,
    deviceType: classification.deviceType,
    openPorts: openPorts.length > 0 ? openPorts.sort((a, b) => a - b) : undefined,
    banners: Object.keys(banners).length > 0 ? banners : undefined,
    servicesDetected: classification.services.length > 0 ? classification.services : undefined,
    netbiosName,
    workgroup,
    snmpData: discoveryData.snmp ? { sysName: discoveryData.snmp.sysName, sysDescr: discoveryData.snmp.sysDescr, vendor: discoveryData.snmp.vendor } : undefined,
    onvifData: discoveryData.onvif ? { endpoint: discoveryData.onvif.endpoint, manufacturer: discoveryData.onvif.manufacturer, model: discoveryData.onvif.model } : undefined,
    ssdpData: discoveryData.ssdp ? { server: discoveryData.ssdp.server, location: discoveryData.ssdp.location, modelName: discoveryData.ssdp.modelName } : undefined,
    mdnsData: discoveryData.mdns ? { hostname: discoveryData.mdns.hostname, services: discoveryData.mdns.services } : undefined,
    webData: webData,
    lastSeen: new Date().toISOString()
  };
}

/**
 * Discovery Engine: Legacy wrapper for single host discovery.
 */
export async function scanHost(ip: string, timeoutMs: number = 500): Promise<PingResult> {
  return scanHostExtended(ip, 'normal', [], timeoutMs);
}

/**
 * Task Pool Runner: Executes tasks with fixed maximum concurrency.
 */
export async function runWithConcurrencyLimit<T>(
  limit: number, 
  tasks: (() => Promise<T>)[],
  onProgress?: (result: T, index: number) => void,
  checkCancelled?: () => boolean
): Promise<T[]> {
  const results: T[] = [];
  const executing: Promise<void>[] = [];
  
  for (let i = 0; i < tasks.length; i++) {
    if (checkCancelled && checkCancelled()) {
      break;
    }

    const taskIndex = i;
    const p = tasks[taskIndex]().then((res) => {
      results[taskIndex] = res;
      if (onProgress) {
        onProgress(res, taskIndex);
      }
    });

    executing.push(p);

    if (limit <= tasks.length) {
      const e: Promise<void> = p.then(() => {
        executing.splice(executing.indexOf(e), 1);
      });
      if (executing.length >= limit) {
        await Promise.race(executing);
      }
    }
  }

  await Promise.all(executing);
  return results;
}
